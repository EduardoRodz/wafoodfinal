import React, { useState } from 'react';
import { AlertCircle, Download, FileUp, RefreshCw } from 'lucide-react';
import { supabaseAdmin } from '../../lib/supabase';

interface ImportExportDataProps {
  themeColor: string;
}

const ImportExportData: React.FC<ImportExportDataProps> = ({ themeColor }) => {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const tables = [
    'site_config',
    'appearance_config',
    'categories',
    'menu_items',
    'profiles',
    'orders'
  ];

  const handleExport = async () => {
    try {
      setExporting(true);
      setExportError(null);
      setExportSuccess(false);
      
      // Objeto para almacenar todos los datos
      const exportData: Record<string, any[]> = {};
      
      // Exportar datos de cada tabla
      for (const table of tables) {
        const { data, error } = await supabaseAdmin
          .from(table)
          .select('*');
        
        if (error) {
          throw new Error(`Error al exportar tabla ${table}: ${error.message}`);
        }
        
        exportData[table] = data || [];
      }
      
      // Crear un blob con los datos
      const jsonData = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      
      // Crear un enlace de descarga
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      // Generar nombre de archivo con fecha
      const date = new Date();
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const timeStr = `${String(date.getHours()).padStart(2, '0')}-${String(date.getMinutes()).padStart(2, '0')}`;
      
      link.href = url;
      link.download = `wafood-backup-${dateStr}-${timeStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setExportSuccess(true);
      console.log('Exportación completada con éxito');
    } catch (err: any) {
      console.error('Error durante la exportación:', err);
      setExportError(err.message || 'Error desconocido durante la exportación');
    } finally {
      setExporting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setImportError(null);
    }
  };

  const handleImport = async () => {
    if (!file) {
      setImportError('Por favor, selecciona un archivo para importar');
      return;
    }

    try {
      setImporting(true);
      setImportError(null);
      setImportSuccess(false);
      
      // Leer el archivo
      const fileContent = await file.text();
      let importData: Record<string, any[]>;
      
      try {
        importData = JSON.parse(fileContent);
      } catch (err) {
        throw new Error('El archivo no contiene un formato JSON válido');
      }
      
      // Verificar que el archivo contiene los datos esperados
      if (!importData || typeof importData !== 'object') {
        throw new Error('El archivo no contiene un formato de backup válido');
      }
      
      // Importar datos para cada tabla
      for (const table of tables) {
        // Verificar si el archivo contiene datos para esta tabla
        if (!importData[table] || !Array.isArray(importData[table])) {
          console.warn(`El archivo no contiene datos para la tabla ${table}`);
          continue;
        }
        
        // Eliminar datos existentes para evitar duplicados
        const { error: deleteError } = await supabaseAdmin
          .from(table)
          .delete()
          .not('id', 'is', null);  // Confirmar que no eliminamos registros sin ID
        
        if (deleteError) {
          console.warn(`Error al limpiar la tabla ${table}: ${deleteError.message}`);
        }
        
        // Si no hay datos para importar en esta tabla, continuar con la siguiente
        if (importData[table].length === 0) {
          continue;
        }
        
        // Preparar datos quitando IDs autogenerados si corresponde
        let dataToImport = importData[table];
        
        // Tablas con IDs autogenerados
        if (table === 'site_config' || table === 'appearance_config' || table === 'categories' || table === 'menu_items') {
          dataToImport = dataToImport.map(item => {
            // Si es un ID autogenerado, quitarlo para que la base de datos asigne uno nuevo
            if (item.id && typeof item.id === 'number') {
              const { id, ...rest } = item;
              return rest;
            }
            return item;
          });
        }
        
        // Insertar los nuevos datos
        const { error: insertError } = await supabaseAdmin
          .from(table)
          .insert(dataToImport);
        
        if (insertError) {
          throw new Error(`Error al importar datos en la tabla ${table}: ${insertError.message}`);
        }
      }
      
      setImportSuccess(true);
      setFile(null);
      
      // Limpiar el input de archivo
      const fileInput = document.getElementById('importFile') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
      
      console.log('Importación completada con éxito');
    } catch (err: any) {
      console.error('Error durante la importación:', err);
      setImportError(err.message || 'Error desconocido durante la importación');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold mb-4">Importar y Exportar Datos</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Sección de exportación */}
        <div className="border rounded-lg p-4 bg-white">
          <h3 className="text-base font-medium mb-3">Exportar base de datos</h3>
          <p className="text-sm text-gray-600 mb-4">
            Descarga una copia de todos los datos: categorías, menú, configuraciones, etc.
          </p>
          
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 text-white rounded-md transition-colors"
            style={{ backgroundColor: themeColor }}
          >
            {exporting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {exporting ? 'Exportando...' : 'Exportar datos'}
          </button>
          
          {exportError && (
            <div className="mt-3 p-2 bg-red-50 text-red-700 text-sm rounded-md flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{exportError}</span>
            </div>
          )}
          
          {exportSuccess && (
            <div className="mt-3 p-2 bg-green-50 text-green-700 text-sm rounded-md">
              Exportación completada con éxito
            </div>
          )}
        </div>
        
        {/* Sección de importación */}
        <div className="border rounded-lg p-4 bg-white">
          <h3 className="text-base font-medium mb-3">Importar base de datos</h3>
          <p className="text-sm text-gray-600 mb-4">
            Restaura los datos desde un archivo de respaldo previamente exportado.
          </p>
          
          <div className="space-y-3">
            <label className="block">
              <input
                type="file"
                id="importFile"
                accept=".json"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-gray-200 file:text-gray-700
                  hover:file:bg-gray-300 cursor-pointer"
              />
            </label>
            
            <button
              onClick={handleImport}
              disabled={importing || !file}
              className="flex items-center gap-2 px-4 py-2 text-white rounded-md transition-colors"
              style={{ 
                backgroundColor: themeColor,
                opacity: (!file || importing) ? 0.7 : 1
              }}
            >
              {importing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <FileUp className="w-4 h-4" />
              )}
              {importing ? 'Importando...' : 'Importar datos'}
            </button>
          </div>
          
          {importError && (
            <div className="mt-3 p-2 bg-red-50 text-red-700 text-sm rounded-md flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{importError}</span>
            </div>
          )}
          
          {importSuccess && (
            <div className="mt-3 p-2 bg-green-50 text-green-700 text-sm rounded-md">
              Importación completada con éxito
            </div>
          )}
          
          <div className="mt-4 p-3 bg-yellow-50 text-yellow-700 text-xs rounded-md">
            <p className="font-semibold mb-1">⚠️ Importante:</p>
            <p>La importación sobrescribirá todos los datos existentes. Asegúrate de tener una copia de seguridad actual antes de importar.</p>
          </div>
        </div>
      </div>
      
      <div className="text-sm text-gray-600 mt-4 bg-gray-50 p-3 rounded-md">
        <p className="font-medium">Tablas incluidas en la exportación/importación:</p>
        <ul className="list-disc ml-5 mt-1">
          <li>Configuración del sitio</li>
          <li>Configuración de apariencia</li>
          <li>Categorías del menú</li>
          <li>Elementos del menú</li>
          <li>Perfiles de usuario</li>
          <li>Órdenes</li>
        </ul>
      </div>
    </div>
  );
};

export default ImportExportData; 