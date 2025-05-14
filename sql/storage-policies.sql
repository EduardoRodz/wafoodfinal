-- Configurar políticas de almacenamiento para imágenes
INSERT INTO storage.buckets (id, name, public)
VALUES ('menu-images', 'menu-images', true)
ON CONFLICT (id) DO NOTHING;

-- Política para permitir a todos los usuarios autenticados leer imágenes
CREATE POLICY "Imágenes de menú accesibles públicamente" 
  ON storage.objects FOR SELECT 
  USING (bucket_id = 'menu-images');

-- Política para permitir a los administradores subir imágenes
CREATE POLICY "Solo administradores pueden subir imágenes" 
  ON storage.objects FOR INSERT 
  WITH CHECK (bucket_id = 'menu-images' AND auth.jwt() ->> 'role' = 'admin');

-- Política para permitir a los administradores modificar imágenes
CREATE POLICY "Solo administradores pueden modificar imágenes" 
  ON storage.objects FOR UPDATE 
  USING (bucket_id = 'menu-images' AND auth.jwt() ->> 'role' = 'admin');

-- Política para permitir a los administradores eliminar imágenes
CREATE POLICY "Solo administradores pueden eliminar imágenes" 
  ON storage.objects FOR DELETE 
  USING (bucket_id = 'menu-images' AND auth.jwt() ->> 'role' = 'admin'); 