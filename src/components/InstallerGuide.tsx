import React from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from './ui/card';
import { Separator } from './ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';

interface InstallerGuideProps {
  onClose: () => void;
}

const InstallerGuide: React.FC<InstallerGuideProps> = ({ onClose }) => {
  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle>Guía de Configuración de Supabase</CardTitle>
        <CardDescription>
          Siga estos pasos para configurar Supabase antes de completar el instalador
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md">
          <p className="text-yellow-800 font-medium">Importante: Proceso de Instalación</p>
          <p className="text-sm text-yellow-700">
            El proceso de instalación requiere completar estos pasos en el siguiente orden:
          </p>
          <ol className="list-decimal pl-6 text-sm text-yellow-700 mt-2">
            <li className="font-semibold">Configurar Supabase y ejecutar el script SQL (explicado en esta guía)</li>
            <li>Conectar la aplicación a Supabase (primer paso del instalador)</li>
            <li>Configurar la información de su restaurante</li>
            <li>Crear el usuario administrador</li>
          </ol>
          <p className="text-sm text-yellow-700 mt-2 font-semibold">
            No podrá avanzar en el instalador sin haber completado correctamente estos pasos previos.
          </p>
        </div>

        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="item-1">
            <AccordionTrigger>1. Crear una cuenta en Supabase</AccordionTrigger>
            <AccordionContent>
              <ol className="list-decimal pl-6 space-y-2">
                <li>Visite <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">https://supabase.com</a></li>
                <li>Haga clic en "Start for Free" o "Sign Up"</li>
                <li>Complete el registro utilizando su correo electrónico o cuenta de GitHub</li>
              </ol>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-2">
            <AccordionTrigger>2. Crear un nuevo proyecto</AccordionTrigger>
            <AccordionContent>
              <ol className="list-decimal pl-6 space-y-2">
                <li>Una vez dentro del panel de Supabase, haga clic en "New Project"</li>
                <li>Seleccione su organización o cree una nueva</li>
                <li>Asigne un nombre al proyecto (por ejemplo, "wafood-production")</li>
                <li>Establezca una contraseña segura para la base de datos</li>
                <li>Seleccione la región más cercana a su ubicación o a sus clientes</li>
                <li>Haga clic en "Create new project"</li>
                <li>Espere a que se complete la creación del proyecto (puede tomar unos minutos)</li>
              </ol>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-3">
            <AccordionTrigger>3. Configurar la base de datos (PASO CRÍTICO)</AccordionTrigger>
            <AccordionContent>
              <div className="bg-green-50 border border-green-200 p-3 rounded-md mb-3">
                <p className="text-sm text-green-700 font-medium">
                  ¡BUENAS NOTICIAS! El instalador ahora puede configurar automáticamente la base de datos para usted.
                </p>
                <p className="text-sm text-green-700 mt-1">
                  Al probar la conexión, el instalador verificará si las tablas necesarias existen y las creará automáticamente si no están presentes.
                </p>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Si la creación automática falla, puede ejecutar manualmente el script SQL:
              </p>
              <ol className="list-decimal pl-6 space-y-2">
                <li>En el panel lateral de Supabase, vaya a "SQL Editor"</li>
                <li>Haga clic en "New Query"</li>
                <li>En el instalador, haga clic en "Ver Script SQL" para ver y copiar el script</li>
                <li>Pegue el contenido del script en el Editor SQL de Supabase</li>
                <li>Haga clic en "Run" para ejecutar las consultas</li>
                <li>Verifique que no hay errores en la ejecución</li>
              </ol>
              <div className="mt-4 bg-gray-50 p-4 rounded-md">
                <p className="text-sm text-gray-600">
                  Este script creará todas las tablas necesarias para el funcionamiento de la aplicación,
                  incluyendo perfiles de usuario, configuración del sitio y órdenes.
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  Si experimenta problemas durante la ejecución del script, verifique que:
                </p>
                <ul className="list-disc pl-6 mt-1 text-sm text-gray-600">
                  <li>Está utilizando un proyecto Supabase recién creado</li>
                  <li>Tiene los permisos necesarios para ejecutar todas las consultas</li>
                  <li>No hay tablas o políticas con los mismos nombres ya existentes</li>
                </ul>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-4">
            <AccordionTrigger>4. Configurar autenticación</AccordionTrigger>
            <AccordionContent>
              <ol className="list-decimal pl-6 space-y-2">
                <li>En el panel lateral, vaya a "Authentication" &gt; "Providers"</li>
                <li>Asegúrese de que el proveedor "Email" esté habilitado</li>
                <li>Desactive "Confirm email" si desea que los usuarios no necesiten confirmar su correo</li>
                <li>Vaya a "Authentication" &gt; "URL Configuration"</li>
                <li>En "Site URL", ingrese la URL de su sitio (en desarrollo puede ser <code className="bg-gray-100 p-1 rounded">http://localhost:5173</code>)</li>
                <li>En "Redirect URLs", agregue las URLs de redirección permitidas (ejemplo: <code className="bg-gray-100 p-1 rounded">http://localhost:5173/adminpanel</code>)</li>
                <li>Guarde los cambios</li>
              </ol>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-5">
            <AccordionTrigger>5. Obtener las credenciales de API</AccordionTrigger>
            <AccordionContent>
              <ol className="list-decimal pl-6 space-y-2">
                <li>En el panel lateral, vaya a "Project Settings" &gt; "API"</li>
                <li>Aquí encontrará:
                  <ul className="list-disc pl-6 mt-2">
                    <li><strong>Project URL:</strong> La URL de su proyecto (comienza con <code className="bg-gray-100 p-1 rounded">https://</code> y termina con <code className="bg-gray-100 p-1 rounded">.supabase.co</code>)</li>
                    <li><strong>API Key - anon public:</strong> La clave anónima (se usará en el instalador)</li>
                    <li><strong>API Key - service_role:</strong> La clave de servicio (también se usará en el instalador)</li>
                  </ul>
                </li>
                <li>Guarde estas credenciales en un lugar seguro temporalmente, las necesitará para completar el instalador</li>
              </ol>
              <div className="mt-4 bg-red-50 p-4 rounded-md">
                <p className="text-sm text-red-700 font-medium">
                  ¡IMPORTANTE! La clave de servicio (service_role) tiene permisos administrativos completos.
                  Nunca la comparta ni la exponga en código de frontend. El instalador la guardará de manera
                  segura en su dispositivo local.
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <Separator className="my-4" />

        <div className="bg-green-50 border border-green-200 p-4 rounded-md">
          <p className="text-green-800 font-medium">¡Listo para instalar!</p>
          <p className="text-sm text-green-700">
            Una vez que haya completado la configuración de Supabase y ejecutado el script SQL,
            estará listo para comenzar con el instalador. El primer paso será verificar la conexión
            con Supabase, y sólo después de esa verificación podrá continuar con la configuración
            de su restaurante.
          </p>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button onClick={onClose}>Continuar con la instalación</Button>
      </CardFooter>
    </Card>
  );
};

export default InstallerGuide; 