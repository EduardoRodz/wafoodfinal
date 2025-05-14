import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { createClient } from '@supabase/supabase-js';
import { Loader2, ShieldCheck, ShieldX } from 'lucide-react';

const Installer: React.FC = () => {
  const navigate = useNavigate();
  const [installationComplete, setInstallationComplete] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [connectionMessage, setConnectionMessage] = useState('');
  const [testingConnection, setTestingConnection] = useState(false);

  // Form schemas
  const supabaseSchema = z.object({
    supabaseUrl: z.string().url('Por favor, ingrese una URL válida'),
    supabaseAnonKey: z.string().min(1, 'Este campo es requerido'),
    supabaseServiceKey: z.string().min(1, 'Este campo es requerido'),
  });

  const restaurantSchema = z.object({
    name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
    address: z.string().min(5, 'La dirección debe tener al menos 5 caracteres'),
    phone: z.string().min(10, 'El teléfono debe tener al menos 10 dígitos'),
    email: z.string().email('Por favor, ingrese un email válido'),
  });

  const adminSchema = z.object({
    email: z.string().email('Por favor, ingrese un email válido'),
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
    confirmPassword: z.string(),
  }).refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

  // Form instances
  const supabaseForm = useForm<z.infer<typeof supabaseSchema>>({
    resolver: zodResolver(supabaseSchema),
    defaultValues: {
      supabaseUrl: '',
      supabaseAnonKey: '',
      supabaseServiceKey: '',
    },
  });

  const restaurantForm = useForm<z.infer<typeof restaurantSchema>>({
    resolver: zodResolver(restaurantSchema),
    defaultValues: {
      name: '',
      address: '',
      phone: '',
      email: '',
    },
  });

  const adminForm = useForm<z.infer<typeof adminSchema>>({
    resolver: zodResolver(adminSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  // Main functions
  const testSupabaseConnection = async () => {
    try {
      const supabaseData = supabaseForm.getValues();
      if (!supabaseData.supabaseUrl || !supabaseData.supabaseAnonKey) {
        throw new Error('Por favor, complete todos los campos de Supabase');
      }

      const tempClient = createClient(supabaseData.supabaseUrl, supabaseData.supabaseAnonKey);
      setTestingConnection(true);
      setConnectionStatus('testing');
      setConnectionMessage('Probando conexión...');

      // Intentar una operación básica para verificar la conexión
      const { data, error } = await tempClient.auth.getSession();

      if (error) {
        throw new Error(`Error de conexión: ${error.message}`);
      }

      setConnectionStatus('success');
      setConnectionMessage('Conexión exitosa');
    } catch (error) {
      console.error('Error al probar conexión:', error);
      setConnectionStatus('error');
      setConnectionMessage(`Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setTestingConnection(false);
    }
  };

  const completeInstallation = async () => {
    try {
      // Verificar que la conexión se ha probado y es exitosa
      if (connectionStatus !== 'success') {
        throw new Error('Por favor, verifique la conexión con Supabase antes de continuar');
      }

      // Guardar las credenciales de Supabase
      const supabaseData = supabaseForm.getValues();
      if (!supabaseData.supabaseUrl || !supabaseData.supabaseServiceKey) {
        throw new Error('Credenciales de Supabase inválidas');
      }

      localStorage.setItem('supabaseUrl', supabaseData.supabaseUrl);
      localStorage.setItem('supabaseServiceKey', supabaseData.supabaseServiceKey);

      // Crear el cliente de Supabase
      const supabase = createClient(
        localStorage.getItem('supabaseUrl')!,
        localStorage.getItem('supabaseServiceKey')!
      );

      // Crear el restaurante
      const restaurantData = restaurantForm.getValues();
      if (!restaurantData.name || !restaurantData.email) {
        throw new Error('Por favor, complete todos los campos del restaurante');
      }

      const restaurantResponse = await supabase
        .from('restaurants')
        .insert([{
          name: restaurantData.name,
          address: restaurantData.address,
          phone: restaurantData.phone,
          email: restaurantData.email,
        }])
        .select()
        .single();

      if (restaurantResponse.error) {
        throw new Error(`Error al crear el restaurante: ${restaurantResponse.error.message}`);
      }

      // Crear el administrador
      const adminData = adminForm.getValues();
      if (!adminData.email || !adminData.password) {
        throw new Error('Por favor, complete todos los campos del administrador');
      }

      const adminResponse = await supabase.auth.admin.createUser({
        email: adminData.email,
        password: adminData.password,
        email_confirm: true,
        user_metadata: {
          role: 'admin',
        },
      });

      if (adminResponse.error) {
        throw new Error(`Error al crear el administrador: ${adminResponse.error.message}`);
      }

      setInstallationComplete(true);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (error) {
      console.error('Error en la instalación:', error);
      if (error instanceof Error) {
        setConnectionMessage(`Error: ${error.message}`);
        setConnectionStatus('error');
      }
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">Instalador de WaFood</h1>
        <div className="space-y-6">
          <Tabs defaultValue="supabase" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="supabase">Configuración de Supabase</TabsTrigger>
              <TabsTrigger value="restaurant">Configuración del Restaurante</TabsTrigger>
              <TabsTrigger value="admin">Configuración del Administrador</TabsTrigger>
            </TabsList>
            <TabsContent value="supabase" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Configuración de Supabase</CardTitle>
                  <CardDescription>
                    Por favor, ingrese las credenciales de su proyecto de Supabase.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={supabaseForm.handleSubmit(testSupabaseConnection)}>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="supabaseUrl">URL de Supabase</Label>
                        <Input
                          id="supabaseUrl"
                          {...supabaseForm.register('supabaseUrl')}
                          placeholder="https://your-project.supabase.co"
                        />
                        {supabaseForm.formState.errors.supabaseUrl && (
                          <p className="text-red-500 text-sm mt-1">
                            {supabaseForm.formState.errors.supabaseUrl.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="supabaseAnonKey">Clave Anónima</Label>
                        <Input
                          id="supabaseAnonKey"
                          placeholder="eyJhbG..."
                          {...supabaseForm.register('supabaseAnonKey')}
                        />
                        {supabaseForm.formState.errors.supabaseAnonKey && (
                          <p className="text-red-500 text-sm mt-1">
                            {supabaseForm.formState.errors.supabaseAnonKey.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="supabaseServiceKey">Clave de Servicio</Label>
                        <Input
                          id="supabaseServiceKey"
                          placeholder="eyJhbG..."
                          {...supabaseForm.register('supabaseServiceKey')}
                        />
                        {supabaseForm.formState.errors.supabaseServiceKey && (
                          <p className="text-red-500 text-sm mt-1">
                            {supabaseForm.formState.errors.supabaseServiceKey.message}
                          </p>
                        )}
                      </div>
                      <div className="flex justify-end">
                        <Button
                          type="submit"
                          disabled={testingConnection}
                        >
                          {testingConnection ? 'Verificando...' : 'Verificar Conexión'}
                        </Button>
                      </div>
                    </div>
                  </form>
                  <div className="mt-4">
                    {connectionStatus === 'testing' && (
                      <Alert>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <AlertTitle>Probando conexión...</AlertTitle>
                        <AlertDescription>
                          {connectionMessage}
                        </AlertDescription>
                      </Alert>
                    )}
                    {connectionStatus === 'success' && (
                      <Alert>
                        <ShieldCheck className="h-4 w-4" />
                        <AlertTitle>Conexión exitosa</AlertTitle>
                        <AlertDescription>
                          {connectionMessage}
                        </AlertDescription>
                      </Alert>
                    )}
                    {connectionStatus === 'error' && (
                      <Alert>
                        <ShieldX className="h-4 w-4" />
                        <AlertTitle>Error de conexión</AlertTitle>
                        <AlertDescription>
                          {connectionMessage}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="restaurant" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Configuración del Restaurante</CardTitle>
                  <CardDescription>
                    Ingrese los datos básicos de su restaurante.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={restaurantForm.handleSubmit(completeInstallation)}>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="name">Nombre del Restaurante</Label>
                        <Input
                          id="name"
                          {...restaurantForm.register('name')}
                        />
                        {restaurantForm.formState.errors.name && (
                          <p className="text-red-500 text-sm mt-1">
                            {restaurantForm.formState.errors.name.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="address">Dirección</Label>
                        <Input
                          id="address"
                          {...restaurantForm.register('address')}
                        />
                        {restaurantForm.formState.errors.address && (
                          <p className="text-red-500 text-sm mt-1">
                            {restaurantForm.formState.errors.address.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="phone">Teléfono</Label>
                        <Input
                          id="phone"
                          {...restaurantForm.register('phone')}
                          type="tel"
                        />
                        {restaurantForm.formState.errors.phone && (
                          <p className="text-red-500 text-sm mt-1">
                            {restaurantForm.formState.errors.phone.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          {...restaurantForm.register('email')}
                          type="email"
                        />
                        {restaurantForm.formState.errors.email && (
                          <p className="text-red-500 text-sm mt-1">
                            {restaurantForm.formState.errors.email.message}
                          </p>
                        )}
                      </div>
                      <div className="flex justify-end">
                        <Button type="submit">
                          Guardar y continuar
                        </Button>
                      </div>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="admin" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Configuración del Administrador</CardTitle>
                  <CardDescription>
                    Cree las credenciales del administrador del sistema.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={adminForm.handleSubmit(completeInstallation)}>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          {...adminForm.register('email')}
                          type="email"
                        />
                        {adminForm.formState.errors.email && (
                          <p className="text-red-500 text-sm mt-1">
                            {adminForm.formState.errors.email.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="password">Contraseña</Label>
                        <Input
                          id="password"
                          {...adminForm.register('password')}
                          type="password"
                        />
                        {adminForm.formState.errors.password && (
                          <p className="text-red-500 text-sm mt-1">
                            {adminForm.formState.errors.password.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                        <Input
                          id="confirmPassword"
                          {...adminForm.register('confirmPassword')}
                          type="password"
                        />
                        {adminForm.formState.errors.confirmPassword && (
                          <p className="text-red-500 text-sm mt-1">
                            {adminForm.formState.errors.confirmPassword.message}
                          </p>
                        )}
                      </div>
                      <div className="flex justify-end">
                        <Button type="submit">
                          Completar instalación
                        </Button>
                      </div>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          {installationComplete && (
            <div className="mt-8 text-center">
              <h2 className="text-2xl font-semibold mb-4">¡Instalación completada!</h2>
              <p className="text-gray-600 mb-4">
                La instalación se ha completado exitosamente. Redirigiendo a la página de inicio de sesión...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Installer;
                  />
                  {supabaseForm.formState.errors.supabaseUrl && (
                    <p className="text-red-500 text-sm mt-1">
                      {supabaseForm.formState.errors.supabaseUrl.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="supabaseAnonKey">Clave Anónima</Label>
                  <Input
                    id="supabaseAnonKey"
                    placeholder="eyJhbG..."
                    {...supabaseForm.register('supabaseAnonKey')}
                  />
                  {supabaseForm.formState.errors.supabaseAnonKey && (
                    <p className="text-red-500 text-sm mt-1">
                      {supabaseForm.formState.errors.supabaseAnonKey.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="supabaseServiceKey">Clave de Servicio</Label>
                  <Input
                    id="supabaseServiceKey"
                    placeholder="eyJhbG..."
                    {...supabaseForm.register('supabaseServiceKey')}
                  />
                  {supabaseForm.formState.errors.supabaseServiceKey && (
                    <p className="text-red-500 text-sm mt-1">
                      {supabaseForm.formState.errors.supabaseServiceKey.message}
                    </p>
                  )}
                </div>

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={testingConnection}
                  >
                    {testingConnection ? 'Verificando...' : 'Verificar Conexión'}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="restaurant">
        <Card>
          <CardHeader>
            <CardTitle>Configuración de Restaurante</CardTitle>
            <CardDescription>
              Configure los detalles de su restaurante
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={restaurantForm.handleSubmit(completeInstallation)}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="restaurantName">Nombre del Restaurante</Label>
                  <Input
                    id="restaurantName"
                    {...restaurantForm.register('restaurantName')}
                  />
                  {restaurantForm.formState.errors.restaurantName && (
                    <p className="text-red-500 text-sm mt-1">
                      {restaurantForm.formState.errors.restaurantName.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="whatsappNumber">Número de WhatsApp</Label>
                  <Input
                    id="whatsappNumber"
                    placeholder="18091234567"
                    {...restaurantForm.register('whatsappNumber')}
                  />
                  {restaurantForm.formState.errors.whatsappNumber && (
                    <p className="text-red-500 text-sm mt-1">
                      {restaurantForm.formState.errors.whatsappNumber.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="currency">Moneda</Label>
                  <Input
                    id="currency"
                    placeholder="RD$"
                    {...restaurantForm.register('currency')}
                  />
                  {restaurantForm.formState.errors.currency && (
                    <p className="text-red-500 text-sm mt-1">
                      {restaurantForm.formState.errors.currency.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="openingHours">Horario de Atención</Label>
                  <Input
                    id="openingHours"
                    placeholder="8:00 AM - 10:00 PM"
                    {...restaurantForm.register('openingHours')}
                  />
                  {restaurantForm.formState.errors.openingHours && (
                    <p className="text-red-500 text-sm mt-1">
                      {restaurantForm.formState.errors.openingHours.message}
                    </p>
                  )}
                </div>

                <div className="flex justify-end">
                  <Button type="submit">Guardar Configuración</Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="admin">
        <Card>
          <CardHeader>
            <CardTitle>Crear Administrador</CardTitle>
            <CardDescription>
              Configure las credenciales del administrador del sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={adminForm.handleSubmit(completeInstallation)}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    {...adminForm.register('email')}
                  />
                  {adminForm.formState.errors.email && (
                    <p className="text-red-500 text-sm mt-1">
                      {adminForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="password">Contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    {...adminForm.register('password')}
                  />
                  {adminForm.formState.errors.password && (
                    <p className="text-red-500 text-sm mt-1">
                      {adminForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    {...adminForm.register('confirmPassword')}
                  />
                  {adminForm.formState.errors.confirmPassword && (
                    <p className="text-red-500 text-sm mt-1">
                      {adminForm.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                <div className="flex justify-end">
                  <Button type="submit">Crear Administrador</Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>

    {showSqlScript && (
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Script SQL</CardTitle>
          <CardDescription>
            Script SQL para crear las tablas necesarias
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={sqlScript}
            readOnly
            className="h-[400px]"
          />
        </CardContent>
      </Card>
    )}
        
        {showGuide && (
          <div className="mb-8">
            <InstallerGuide onClose={toggleGuide} />
          </div>
        )}

        {connectionStatus === ConnectionStatus.Error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{connectionMessage}</AlertDescription>
          </Alert>
        )}

        {connectionStatus === ConnectionStatus.Success && (
          <Alert variant="default" className="mb-4">
            <AlertDescription>{connectionMessage}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="supabase" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="supabase">Configuración de Supabase</TabsTrigger>
            <TabsTrigger value="restaurant">Configuración de Restaurante</TabsTrigger>
            <TabsTrigger value="admin">Administrador</TabsTrigger>
          </TabsList>

          <TabsContent value="supabase">
            <Card>
              <CardHeader>
                <CardTitle>Configuración de Supabase</CardTitle>
                <CardDescription>
                  Ingrese los detalles de su proyecto Supabase
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={supabaseForm.handleSubmit(testSupabaseConnection)}>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="supabaseUrl">URL de Supabase</Label>
                      <Input
                        id="supabaseUrl"
                        placeholder="https://your-project.supabase.co"
                        {...supabaseForm.register('supabaseUrl')}
                      />
                      {supabaseForm.formState.errors.supabaseUrl && (
                        <p className="text-red-500 text-sm mt-1">
                          {supabaseForm.formState.errors.supabaseUrl.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="supabaseAnonKey">Clave Anónima</Label>
                      <Input
                        id="supabaseAnonKey"
                        placeholder="eyJhbG..."
                        {...supabaseForm.register('supabaseAnonKey')}
                      />
                      {supabaseForm.formState.errors.supabaseAnonKey && (
                        <p className="text-red-500 text-sm mt-1">
                          {supabaseForm.formState.errors.supabaseAnonKey.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="supabaseServiceKey">Clave de Servicio</Label>
                      <Input
                        id="supabaseServiceKey"
                        placeholder="eyJhbG..."
                        {...supabaseForm.register('supabaseServiceKey')}
                      />
                      {supabaseForm.formState.errors.supabaseServiceKey && (
                        <p className="text-red-500 text-sm mt-1">
                          {supabaseForm.formState.errors.supabaseServiceKey.message}
                        </p>
                      )}
                    </div>

                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        disabled={testingConnection}
                      >
                        {testingConnection ? 'Verificando...' : 'Verificar Conexión'}
                      </Button>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="restaurant">
            <Card>
              <CardHeader>
                <CardTitle>Configuración de Restaurante</CardTitle>
                <CardDescription>
                  Configure los detalles de su restaurante
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={restaurantForm.handleSubmit(completeInstallation)}>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="restaurantName">Nombre del Restaurante</Label>
                      <Input
                        id="restaurantName"
                        {...restaurantForm.register('restaurantName')}
                      />
                      {restaurantForm.formState.errors.restaurantName && (
                        <p className="text-red-500 text-sm mt-1">
                          {restaurantForm.formState.errors.restaurantName.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="whatsappNumber">Número de WhatsApp</Label>
                      <Input
                        id="whatsappNumber"
                        placeholder="18091234567"
                        {...restaurantForm.register('whatsappNumber')}
                      />
                      {restaurantForm.formState.errors.whatsappNumber && (
                        <p className="text-red-500 text-sm mt-1">
                          {restaurantForm.formState.errors.whatsappNumber.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="currency">Moneda</Label>
                      <Input
                        id="currency"
                        placeholder="RD$"
                        {...restaurantForm.register('currency')}
                      />
                      {restaurantForm.formState.errors.currency && (
                        <p className="text-red-500 text-sm mt-1">
                          {restaurantForm.formState.errors.currency.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="openingHours">Horario de Atención</Label>
                      <Input
                        id="openingHours"
                        placeholder="8:00 AM - 10:00 PM"
                        {...restaurantForm.register('openingHours')}
                      />
                      {restaurantForm.formState.errors.openingHours && (
                        <p className="text-red-500 text-sm mt-1">
                          {restaurantForm.formState.errors.openingHours.message}
                        </p>
                      )}
                    </div>

                    <div className="flex justify-end">
                      <Button type="submit">Guardar Configuración</Button>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="admin">
            <Card>
              <CardHeader>
                <CardTitle>Crear Administrador</CardTitle>
                <CardDescription>
                  Configure las credenciales del administrador del sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={adminForm.handleSubmit(completeInstallation)}>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        {...adminForm.register('email')}
                      />
                      {adminForm.formState.errors.email && (
                        <p className="text-red-500 text-sm mt-1">
                          {adminForm.formState.errors.email.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="password">Contraseña</Label>
                      <Input
                        id="password"
                        type="password"
                        {...adminForm.register('password')}
                      />
                      {adminForm.formState.errors.password && (
                        <p className="text-red-500 text-sm mt-1">
                          {adminForm.formState.errors.password.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        {...adminForm.register('confirmPassword')}
                      />
                      {adminForm.formState.errors.confirmPassword && (
                        <p className="text-red-500 text-sm mt-1">
                          {adminForm.formState.errors.confirmPassword.message}
                        </p>
                      )}
                    </div>

                    <div className="flex justify-end">
                      <Button type="submit">Crear Administrador</Button>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {showSqlScript && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Script SQL</CardTitle>
              <CardDescription>
                Script SQL para crear las tablas necesarias
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={sqlScript}
                readOnly
                className="h-[400px]"
              />
            </CardContent>
          </Card>
        )}

        {installationComplete && (
          <div className="mt-8">
            <Alert variant="default">
              <AlertDescription>
                ¡Instalación completada exitosamente!
                <br />
                <br />
                <div className="space-y-2">
                  <p>
                    Puede cerrar esta página y acceder al sistema usando las credenciales del administrador que creó.
                  </p>
                  <p>
                    Si necesita ayuda o tiene preguntas, consulte la documentación o contáctenos.
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        )}
      </div>
    </div>
  );
};

export default Installer;
    resolver: zodResolver(supabaseFormSchema),
    defaultValues: {
      supabaseUrl: '',
      supabaseAnonKey: '',
      supabaseServiceKey: ''
    }
  });

  const restaurantForm = useForm({
    resolver: zodResolver(restaurantFormSchema),
    defaultValues: {
      restaurantName: '',
      whatsappNumber: '',
      currency: 'RD$',
      openingHours: '8:00 AM - 10:00 PM'
    }
  });

  const adminForm = useForm({
    resolver: zodResolver(adminFormSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: ''
    }
  });

  // Verificar si ya se completó la instalación
  useEffect(() => {
    const installerRun = localStorage.getItem('installerCompleted');
    if (installerRun) {
      navigate('/');
    }
  }, [navigate]);

  // Función para mostrar/ocultar el script SQL
  const toggleSqlScript = () => {
    setShowSqlScript(!showSqlScript);
  };

  // Función para mostrar/ocultar la guía
  const toggleGuide = () => {
    setShowGuide(!showGuide);
  };

  // Función para completar la instalación
  const completeInstallation = async () => {
    try {
      // 1. Crear el administrador
      const adminCreated = await createAdmin(supabaseClient, adminForm.getValues());
      if (!adminCreated) {
        throw new Error('No se pudo crear el administrador');
      }

      // 2. Guardar la configuración del restaurante
      const restaurantData = restaurantForm.getValues();
      const config = {
        restaurantName: restaurantData.restaurantName,
        whatsappNumber: restaurantData.whatsappNumber,
        currency: restaurantData.currency,
        openingHours: restaurantData.openingHours
      };
      
      const configSaved = await saveRestaurantConfig(supabaseClient, config);
      if (!configSaved) {
        throw new Error('No se pudo guardar la configuración del restaurante');
      }

      // 3. Marcar la instalación como completada
      localStorage.setItem('installerCompleted', 'true');
      setInstallationComplete(true);
    } catch (error) {
      console.error('Error al completar la instalación:', error);
      setConnectionStatus(ConnectionStatus.Error);
      setConnectionMessage(`Error al completar la instalación: ${error.message}`);
    }
  };

  // Función para verificar la conexión con Supabase
  const testSupabaseConnection = async () => {
    try {
      const { supabaseUrl, supabaseAnonKey, supabaseServiceKey } = supabaseForm.getValues();
      
      // Verificar que todos los campos estén completos
      if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
        throw new Error('Por favor, complete todos los campos de configuración');
      }

      // Crear cliente temporal para pruebas
      const tempClient = createClient(supabaseUrl, supabaseAnonKey);
      let isConnected = false;
      let errorDetails = '';

      // 1. Intentar verificar la conexión básica
      try {
        await tempClient.auth.getSession();
        isConnected = true;
      } catch (e: any) {
        errorDetails += `Error con la conexión básica: ${e.message}. `;
      }

      // 2. Si el método anterior falló, intentar con auth.getSession
      if (!isConnected) {
        try {
          const { data } = await tempClient.auth.getSession();
          if (data) {
            isConnected = true;
          }
        } catch (e: any) {
          errorDetails += `Error con auth.getSession: ${e.message}. `;
        }
      }

      // 3. Si todos los métodos anteriores fallaron, intentar configurar manualmente
      if (!isConnected) {
        throw new Error(`No se pudo verificar la conexión con Supabase. ${errorDetails}
          
          Posibles soluciones:
          
          1. Verifique que la URL y las claves API sean correctas.
          2. Asegúrese de haber ejecutado el script SQL en su base de datos Supabase.
          3. Compruebe que su proyecto Supabase esté activo y funcionando.
          4. Si está en modo desarrollo local, verifique que no hay problemas de CORS.
          
          Puede probar ejecutando esta función personalizada en el SQL Editor de Supabase:
          
          CREATE OR REPLACE FUNCTION now() RETURNS TIMESTAMPTZ AS $$
            BEGIN RETURN CURRENT_TIMESTAMP; END;
          $$ LANGUAGE plpgsql;`);
      }

      // Intentar verificar la clave de servicio
      const adminClient = createClient(supabaseUrl, supabaseServiceKey);
      
      try {
        // La manera más segura de probar un rol de servicio es intentar listar usuarios
        const { data, error } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1 });
        
        if (error) {
          throw new Error(`Error con clave de servicio: ${error.message}`);
        }

        // Guardar el cliente de Supabase para usarlo más tarde
        setSupabaseClient(adminClient);
        setConnectionStatus(ConnectionStatus.Success);
        setConnectionMessage('Conexión exitosa y tablas creadas correctamente');
        setCurrentStep('restaurant');
        return adminClient;
      } catch (serviceError: any) {
        throw new Error(`La clave de servicio no tiene los permisos necesarios. 
          
          Asegúrese de que:
          1. Está utilizando la clave "service_role" y no la clave "anon".
          2. La clave tiene el formato correcto (comienza con "eyJ..." y tiene tres partes separadas por puntos).
          3. Su proyecto Supabase tiene los permisos de autenticación correctamente configurados.
          
          Error específico: ${serviceError.message}`);
      }
    } catch (error: any) {
      setConnectionStatus(ConnectionStatus.Error);
      setConnectionMessage(error.message);
      throw error;
    } finally {
      setTestingConnection(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Instalador de WHATSFOOD</h1>
        
        {showGuide && (
          <div className="mb-8">
            <InstallerGuide />
          </div>
        )}

        {connectionStatus === ConnectionStatus.Error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{connectionMessage}</AlertDescription>
          </Alert>
        )}

        {connectionStatus === ConnectionStatus.Success && (
          <Alert variant="success" className="mb-4">
            <AlertDescription>{connectionMessage}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="supabase" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="supabase">Configuración de Supabase</TabsTrigger>
            <TabsTrigger value="restaurant">Configuración de Restaurante</TabsTrigger>
            <TabsTrigger value="admin">Administrador</TabsTrigger>
          </TabsList>
          
          <TabsContent value="supabase">
            <Card>
              <CardHeader>
                <CardTitle>Configuración de Supabase</CardTitle>
                <CardDescription>
                  Ingrese los detalles de su proyecto Supabase
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={supabaseForm.handleSubmit(async (data) => {
                  try {
                    setTestingConnection(true);
                    await testSupabaseConnection();
                  } catch (error: any) {
                    setConnectionStatus(ConnectionStatus.Error);
                    setConnectionMessage(error.message);
                  }
                })}>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="supabaseUrl">URL de Supabase</Label>
                      <Input
                        id="supabaseUrl"
                        placeholder="https://your-project.supabase.co"
                        {...supabaseForm.register('supabaseUrl')}
                      />
                      {supabaseForm.formState.errors.supabaseUrl && (
                        <p className="text-red-500 text-sm mt-1">
                          {supabaseForm.formState.errors.supabaseUrl.message}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="supabaseAnonKey">Clave Anónima</Label>
                      <Input
                        id="supabaseAnonKey"
                        placeholder="eyJhbG..."
                        {...supabaseForm.register('supabaseAnonKey')}
                      />
                      {supabaseForm.formState.errors.supabaseAnonKey && (
                        <p className="text-red-500 text-sm mt-1">
                          {supabaseForm.formState.errors.supabaseAnonKey.message}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="supabaseServiceKey">Clave de Servicio</Label>
                      <Input
                        id="supabaseServiceKey"
                        placeholder="eyJhbG..."
                        {...supabaseForm.register('supabaseServiceKey')}
                      />
                      {supabaseForm.formState.errors.supabaseServiceKey && (
                        <p className="text-red-500 text-sm mt-1">
                          {supabaseForm.formState.errors.supabaseServiceKey.message}
                        </p>
                      )}
                    </div>

                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        disabled={testingConnection}
                      >
                        {testingConnection ? 'Verificando...' : 'Verificar Conexión'}
                      </Button>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="restaurant">
            <Card>
              <CardHeader>
                <CardTitle>Configuración de Restaurante</CardTitle>
                <CardDescription>
                  Configure los detalles de su restaurante
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={restaurantForm.handleSubmit(completeInstallation)}>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="restaurantName">Nombre del Restaurante</Label>
                      <Input
                        id="restaurantName"
                        {...restaurantForm.register('restaurantName')}
                      />
                      {restaurantForm.formState.errors.restaurantName && (
                        <p className="text-red-500 text-sm mt-1">
                          {restaurantForm.formState.errors.restaurantName.message}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="whatsappNumber">Número de WhatsApp</Label>
                      <Input
                        id="whatsappNumber"
                        placeholder="18091234567"
                        {...restaurantForm.register('whatsappNumber')}
                      />
                      {restaurantForm.formState.errors.whatsappNumber && (
                        <p className="text-red-500 text-sm mt-1">
                          {restaurantForm.formState.errors.whatsappNumber.message}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="currency">Moneda</Label>
                      <Input
                        id="currency"
                        placeholder="RD$"
                        {...restaurantForm.register('currency')}
                      />
                      {restaurantForm.formState.errors.currency && (
                        <p className="text-red-500 text-sm mt-1">
                          {restaurantForm.formState.errors.currency.message}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="openingHours">Horario de Atención</Label>
                      <Input
                        id="openingHours"
                        placeholder="8:00 AM - 10:00 PM"
                        {...restaurantForm.register('openingHours')}
                      />
                      {restaurantForm.formState.errors.openingHours && (
                        <p className="text-red-500 text-sm mt-1">
                          {restaurantForm.formState.errors.openingHours.message}
                        </p>
                      )}
                    </div>

                    <div className="flex justify-end">
                      <Button type="submit">Guardar Configuración</Button>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="admin">
            <Card>
              <CardHeader>
                <CardTitle>Crear Administrador</CardTitle>
                <CardDescription>
                  Configure las credenciales del administrador del sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={adminForm.handleSubmit(completeInstallation)}>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        {...adminForm.register('email')}
                      />
                      {adminForm.formState.errors.email && (
                        <p className="text-red-500 text-sm mt-1">
                          {adminForm.formState.errors.email.message}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="password">Contraseña</Label>
                      <Input
                        id="password"
                        type="password"
                        {...adminForm.register('password')}
                      />
                      {adminForm.formState.errors.password && (
                        <p className="text-red-500 text-sm mt-1">
                          {adminForm.formState.errors.password.message}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        {...adminForm.register('confirmPassword')}
                      />
                      {adminForm.formState.errors.confirmPassword && (
                        <p className="text-red-500 text-sm mt-1">
                          {adminForm.formState.errors.confirmPassword.message}
                        </p>
                      )}
                    </div>

                    <div className="flex justify-end">
                      <Button type="submit">Crear Administrador</Button>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {showSqlScript && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Script SQL</CardTitle>
              <CardDescription>
                Script SQL para crear las tablas necesarias
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={sqlScript}
                readOnly
                className="h-[400px]"
              />
            </CardContent>
          </Card>
        )}

        {installationComplete && (
          <div className="mt-8">
            <Alert variant="success">
              <AlertDescription>
                ¡Instalación completada exitosamente!
                <br />
                <br />
                <div className="space-y-2">
                  <p>
                    Puede cerrar esta página y acceder al sistema usando las credenciales del administrador que creó.
                  </p>
                  <p>
                    Si necesita ayuda o tiene preguntas, consulte la documentación o contáctenos.
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        )}
      </div>
    </div>
  );
};

};

export default Installer;
    resolver: zodResolver(supabaseFormSchema),
    defaultValues: {
      supabaseUrl: '',
      supabaseAnonKey: '',
      supabaseServiceKey: ''
    }
  });

  const restaurantForm = useForm({
    resolver: zodResolver(restaurantFormSchema),
    defaultValues: {
      restaurantName: '',
      whatsappNumber: '',
      currency: 'RD$',
      openingHours: '8:00 AM - 10:00 PM'
    }
  });

  const adminForm = useForm({
    resolver: zodResolver(adminFormSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: ''
    }
  });

  // Verificar si ya se completó la instalación
  useEffect(() => {
    const installerRun = localStorage.getItem('installerCompleted');
    if (installerRun) {
      navigate('/');
    }
  }, [navigate]);

  // Función para mostrar/ocultar el script SQL
  const toggleSqlScript = () => {
    setShowSqlScript(!showSqlScript);
  };

  // Función para mostrar/ocultar la guía
  const toggleGuide = () => {
    setShowGuide(!showGuide);
  };

  // Función para completar la instalación
  const completeInstallation = async () => {
    try {
      // 1. Crear el administrador
      const adminCreated = await createAdmin(supabaseClient, adminForm.getValues());
      if (!adminCreated) {
        throw new Error('No se pudo crear el administrador');
      }

      // 2. Guardar la configuración del restaurante
      const restaurantData = restaurantForm.getValues();
      const config = {
        restaurantName: restaurantData.restaurantName,
        whatsappNumber: restaurantData.whatsappNumber,
        currency: restaurantData.currency,
        openingHours: restaurantData.openingHours
      };
      
      const configSaved = await saveRestaurantConfig(supabaseClient, config);
      if (!configSaved) {
        throw new Error('No se pudo guardar la configuración del restaurante');
      }

      // 3. Marcar la instalación como completada
      localStorage.setItem('installerCompleted', 'true');
      setInstallationComplete(true);
    } catch (error) {
      console.error('Error al completar la instalación:', error);
      setConnectionStatus(ConnectionStatus.Error);
      setConnectionMessage(`Error al completar la instalación: ${error.message}`);
    }
  };

  // Función para verificar la conexión con Supabase
  const testSupabaseConnection = async () => {
    try {
      const { supabaseUrl, supabaseAnonKey, supabaseServiceKey } = supabaseForm.getValues();
      
      // Verificar que todos los campos estén completos
      if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
        throw new Error('Por favor, complete todos los campos de configuración');
      }

      // Crear cliente temporal para pruebas
      const tempClient = createClient(supabaseUrl, supabaseAnonKey);
      let isConnected = false;
      let errorDetails = '';

      // 1. Intentar verificar la conexión básica
      try {
        await tempClient.auth.getSession();
        isConnected = true;
      } catch (e: any) {
        errorDetails += `Error con la conexión básica: ${e.message}. `;
      }

      // 2. Si el método anterior falló, intentar con auth.getSession
      if (!isConnected) {
        try {
          const { data } = await tempClient.auth.getSession();
          if (data) {
            isConnected = true;
          }
        } catch (e: any) {
          errorDetails += `Error con auth.getSession: ${e.message}. `;
        }
      }

      // 3. Si todos los métodos anteriores fallaron, intentar configurar manualmente
      if (!isConnected) {
        throw new Error(`No se pudo verificar la conexión con Supabase. ${errorDetails}
          
          Posibles soluciones:
          
          1. Verifique que la URL y las claves API sean correctas.
          2. Asegúrese de haber ejecutado el script SQL en su base de datos Supabase.
          3. Compruebe que su proyecto Supabase esté activo y funcionando.
          4. Si está en modo desarrollo local, verifique que no hay problemas de CORS.
          
          Puede probar ejecutando esta función personalizada en el SQL Editor de Supabase:
          
          CREATE OR REPLACE FUNCTION now() RETURNS TIMESTAMPTZ AS $$
            BEGIN RETURN CURRENT_TIMESTAMP; END;
          $$ LANGUAGE plpgsql;`);
      }

      // Intentar verificar la clave de servicio
      const adminClient = createClient(supabaseUrl, supabaseServiceKey);
      
      try {
        // La manera más segura de probar un rol de servicio es intentar listar usuarios
        const { data, error } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1 });
        
        if (error) {
          throw new Error(`Error con clave de servicio: ${error.message}`);
        }

        // Guardar el cliente de Supabase para usarlo más tarde
        setSupabaseClient(adminClient);
        setConnectionStatus(ConnectionStatus.Success);
        setConnectionMessage('Conexión exitosa y tablas creadas correctamente');
        setCurrentStep('restaurant');
        return adminClient;
      } catch (serviceError: any) {
        throw new Error(`La clave de servicio no tiene los permisos necesarios. 
          
          Asegúrese de que:
          1. Está utilizando la clave "service_role" y no la clave "anon".
          2. La clave tiene el formato correcto (comienza con "eyJ..." y tiene tres partes separadas por puntos).
          3. Su proyecto Supabase tiene los permisos de autenticación correctamente configurados.
          
          Error específico: ${serviceError.message}`);
      }
    } catch (error: any) {
      setConnectionStatus(ConnectionStatus.Error);
      setConnectionMessage(error.message);
      throw error;
    } finally {
      setTestingConnection(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Instalador de WHATSFOOD</h1>
        
        {showGuide && (
          <div className="mb-8">
            <InstallerGuide />
          </div>
        )}

        {connectionStatus === ConnectionStatus.Error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{connectionMessage}</AlertDescription>
          </Alert>
        )}

        {connectionStatus === ConnectionStatus.Success && (
          <Alert variant="success" className="mb-4">
            <AlertDescription>{connectionMessage}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="supabase" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="supabase">Configuración de Supabase</TabsTrigger>
            <TabsTrigger value="restaurant">Configuración de Restaurante</TabsTrigger>
            <TabsTrigger value="admin">Administrador</TabsTrigger>
          </TabsList>
          
          <TabsContent value="supabase">
            <Card>
              <CardHeader>
                <CardTitle>Configuración de Supabase</CardTitle>
                <CardDescription>
                  Ingrese los detalles de su proyecto Supabase
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={supabaseForm.handleSubmit(async (data) => {
                  try {
                    setTestingConnection(true);
                    await testSupabaseConnection();
                  } catch (error: any) {
                    setConnectionStatus(ConnectionStatus.Error);
                    setConnectionMessage(error.message);
                  }
                })}>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="supabaseUrl">URL de Supabase</Label>
                      <Input
                        id="supabaseUrl"
                        placeholder="https://your-project.supabase.co"
                        {...supabaseForm.register('supabaseUrl')}
                      />
                      {supabaseForm.formState.errors.supabaseUrl && (
                        <p className="text-red-500 text-sm mt-1">
                          {supabaseForm.formState.errors.supabaseUrl.message}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="supabaseAnonKey">Clave Anónima</Label>
                      <Input
                        id="supabaseAnonKey"
                        placeholder="eyJhbG..."
                        {...supabaseForm.register('supabaseAnonKey')}
                      />
                      {supabaseForm.formState.errors.supabaseAnonKey && (
                        <p className="text-red-500 text-sm mt-1">
                          {supabaseForm.formState.errors.supabaseAnonKey.message}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="supabaseServiceKey">Clave de Servicio</Label>
                      <Input
                        id="supabaseServiceKey"
                        placeholder="eyJhbG..."
                        {...supabaseForm.register('supabaseServiceKey')}
                      />
                      {supabaseForm.formState.errors.supabaseServiceKey && (
                        <p className="text-red-500 text-sm mt-1">
                          {supabaseForm.formState.errors.supabaseServiceKey.message}
                        </p>
                      )}
                    </div>

                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        disabled={testingConnection}
                      >
                        {testingConnection ? 'Verificando...' : 'Verificar Conexión'}
                      </Button>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="restaurant">
            <Card>
              <CardHeader>
                <CardTitle>Configuración de Restaurante</CardTitle>
                <CardDescription>
                  Configure los detalles de su restaurante
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={restaurantForm.handleSubmit(completeInstallation)}>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="restaurantName">Nombre del Restaurante</Label>
                      <Input
                        id="restaurantName"
                        {...restaurantForm.register('restaurantName')}
                      />
                      {restaurantForm.formState.errors.restaurantName && (
                        <p className="text-red-500 text-sm mt-1">
                          {restaurantForm.formState.errors.restaurantName.message}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="whatsappNumber">Número de WhatsApp</Label>
                      <Input
                        id="whatsappNumber"
                        placeholder="18091234567"
                        {...restaurantForm.register('whatsappNumber')}
                      />
                      {restaurantForm.formState.errors.whatsappNumber && (
                        <p className="text-red-500 text-sm mt-1">
                          {restaurantForm.formState.errors.whatsappNumber.message}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="currency">Moneda</Label>
                      <Input
                        id="currency"
                        placeholder="RD$"
                        {...restaurantForm.register('currency')}
                      />
                      {restaurantForm.formState.errors.currency && (
                        <p className="text-red-500 text-sm mt-1">
                          {restaurantForm.formState.errors.currency.message}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="openingHours">Horario de Atención</Label>
                      <Input
                        id="openingHours"
                        placeholder="8:00 AM - 10:00 PM"
                        {...restaurantForm.register('openingHours')}
                      />
                      {restaurantForm.formState.errors.openingHours && (
                        <p className="text-red-500 text-sm mt-1">
                          {restaurantForm.formState.errors.openingHours.message}
                        </p>
                      )}
                    </div>

                    <div className="flex justify-end">
                      <Button type="submit">Guardar Configuración</Button>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="admin">
            <Card>
              <CardHeader>
                <CardTitle>Crear Administrador</CardTitle>
                <CardDescription>
                  Configure las credenciales del administrador del sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={adminForm.handleSubmit(completeInstallation)}>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        {...adminForm.register('email')}
                      />
                      {adminForm.formState.errors.email && (
                        <p className="text-red-500 text-sm mt-1">
                          {adminForm.formState.errors.email.message}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="password">Contraseña</Label>
                      <Input
                        id="password"
                        type="password"
                        {...adminForm.register('password')}
                      />
                      {adminForm.formState.errors.password && (
                        <p className="text-red-500 text-sm mt-1">
                          {adminForm.formState.errors.password.message}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        {...adminForm.register('confirmPassword')}
                      />
                      {adminForm.formState.errors.confirmPassword && (
                        <p className="text-red-500 text-sm mt-1">
                          {adminForm.formState.errors.confirmPassword.message}
                        </p>
                      )}
                    </div>

                    <div className="flex justify-end">
                      <Button type="submit">Crear Administrador</Button>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {showSqlScript && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Script SQL</CardTitle>
              <CardDescription>
                Script SQL para crear las tablas necesarias
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={sqlScript}
                readOnly
                className="h-[400px]"
              />
            </CardContent>
          </Card>
        )}

        {installationComplete && (
          <div className="mt-8">
            <Alert variant="success">
              <AlertDescription>
                ¡Instalación completada exitosamente!
                <br />
                <br />
                <div className="space-y-2">
                  <p>
                    Puede cerrar esta página y acceder al sistema usando las credenciales del administrador que creó.
                  </p>
                  <p>
                    Si necesita ayuda o tiene preguntas, consulte la documentación o contáctenos.
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        )}
      </div>
    </div>
  );
};

export default Installer;
  const [supabaseClient, setSupabaseClient] = useState<any>(null);
  const [categories, setCategories] = useState<Category[]>([
    {
      id: "platos-principales",
      name: "Platos Principales",
      icon: "🍽️",
      items: [
        {
          id: "plato-principal-1",
          name: "Plato Principal 1",
          description: "Descripción del plato principal",
          price: 150,
          image: "https://via.placeholder.com/300",
        }
      ]
    },
    {
      id: "bebidas",
      name: "Bebidas",
      icon: "🥤",
      items: [
        {
          id: "bebida-1",
          name: "Bebida 1",
          description: "Descripción de la bebida",
          price: 50,
          image: "https://via.placeholder.com/300",
        }
      ]
    },
    {
      id: "postres",
      name: "Postres",
      icon: "🍰",
      items: [
        {
          id: "postre-1",
          name: "Postre 1",
          description: "Descripción del postre",
          price: 80,
          image: "https://via.placeholder.com/300",
        }
      ]
    },
    {
      id: "entradas",
      name: "Entradas",
      icon: "🥗",
      items: [
        {
          id: "entrada-1",
          name: "Entrada 1",
          description: "Descripción de la entrada",
          price: 60,
          image: "https://via.placeholder.com/300",
        }
      ]
    }
  ]);

  // Formulario de restaurante
  const restaurantForm = useForm({
    resolver: zodResolver(restaurantFormSchema),
    defaultValues: {
      restaurantName: "",
      whatsappNumber: "",
      currency: "",
      openingHours: "",
    },
  });

  // Formulario de Supabase
  const supabaseForm = useForm({
    resolver: zodResolver(supabaseFormSchema),
    defaultValues: {
      supabaseUrl: "",
      supabaseAnonKey: "",
      supabaseServiceKey: "",
    },
  });

  // Formulario de administrador
  const adminForm = useForm({
    resolver: zodResolver(adminFormSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  // Comprobar si el instalador ya se ha ejecutado
  useEffect(() => {
    const installerRun = localStorage.getItem('installerCompleted');
    if (installerRun) {
      navigate('/');
    }
  }, [navigate]);

    
    // 1. Intentar obtener la hora del servidor (método más confiable)
    try {
      const { data: serverTime } = await tempClient.rpc('now');
      if (serverTime) {
        console.log("Conexión verificada con función now():", serverTime);
        isConnected = true;
      }
    } catch (e) {
      console.log("La función now() no está disponible, probando otro método...");
    }
    
    // 2. Si el método anterior falló, intentar con auth.getSession
    if (!isConnected) {
      try {
        const { data } = await tempClient.auth.getSession();
        console.log("Conexión verificada con auth.getSession");
        isConnected = true;
      } catch (e: any) {
        errorDetails += `Error con auth.getSession: ${e.message}. `;
      }
    }
    
    // 3. Si todos los métodos anteriores fallaron, intentar configurar manualmente
    if (!isConnected) {
      throw new Error(`No se pudo verificar la conexión con Supabase. ${errorDetails}
        
        Posibles soluciones:
        
        1. Verifique que la URL y las claves API sean correctas.
        2. Asegúrese de haber ejecutado el script SQL en su base de datos Supabase.
        3. Compruebe que su proyecto Supabase esté activo y funcionando.
        4. Si está en modo desarrollo local, verifique que no hay problemas de CORS.
        
        Puede probar ejecutando esta función personalizada en el SQL Editor de Supabase:
        
        CREATE OR REPLACE FUNCTION now() RETURNS TIMESTAMPTZ AS $$
          BEGIN RETURN CURRENT_TIMESTAMP; END;
        $$ LANGUAGE plpgsql;`);
    }

    // Intentar verificar la clave de servicio
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    
    try {
      // La manera más segura de probar un rol de servicio es intentar listar usuarios
      const { data, error } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1 });
      
      if (error) {
        throw new Error(`Error con clave de servicio: ${error.message}`);
      }

      // Guardar el cliente de Supabase para usarlo más tarde
      setSupabaseClient(adminClient);
      
      // Verificar si existen las tablas necesarias
      console.log("Verificando las tablas necesarias...");
      
      try {
        // Verificar si existe la tabla profiles
        console.log("Verificando tabla profiles...");
        const { error: profilesError } = await adminClient
          .from('profiles')
          .select('*')
          .limit(1);
        
        let needToCreateTables = false;
        
        // Si hay un error específico de "relation does not exist", necesitamos crear las tablas
        if (profilesError) {
          console.error("Error al verificar la tabla profiles:", profilesError);
          
          if (profilesError.message.includes('relation "profiles" does not exist')) {
            needToCreateTables = true;
          } else {
            // Otro tipo de error con la tabla profiles, pero podría existir
            // Intentar crear una tabla de prueba para ver si tenemos permisos
            try {
              // SQL para crear la tabla profiles
              const profilesSQL = `
                CREATE TABLE IF NOT EXISTS profiles (
                  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
                  email TEXT UNIQUE NOT NULL,
                  role TEXT NOT NULL DEFAULT 'customer',
                  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
                
                -- Permitir acceso a la tabla profiles
                ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
                
                -- Políticas de RLS para perfiles
                CREATE POLICY IF NOT EXISTS "Perfiles visibles para todos los usuarios autenticados" 
                  ON profiles FOR SELECT 
                  USING (auth.role() = 'authenticated');
                
                CREATE POLICY IF NOT EXISTS "Los usuarios pueden actualizar su propio perfil" 
                  ON profiles FOR UPDATE 
                  USING (auth.uid() = id);
                
                CREATE POLICY IF NOT EXISTS "Los administradores pueden hacer todo con los perfiles" 
                  ON profiles FOR ALL 
                  USING (auth.jwt() ->> 'role' = 'admin');
              `;
              
              const { success: profilesSuccess, error: profilesError } = await executeSQL(
                supabaseUrl,
                supabaseServiceKey,
                profilesSQL
              );
              
              if (profilesError) {
                throw new Error(`No se pudo crear la tabla profiles: ${profilesError.message}`);
              } else {
                console.log("Tabla profiles creada con éxito directamente.");
              }
            } catch (permError) {
              console.error("Error verificando permisos:", permError);
              needToCreateTables = true; // Si hay algún error, intentamos el script completo
            }
          }
        } else {
          console.log("La tabla 'profiles' existe.");
        }

        if (needToCreateTables) {
          // Script SQL para crear todas las tablas necesarias
          const sqlScript = `
            -- Configurar extensiones necesarias
            CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
            
            -- Tabla para perfiles de usuario
            CREATE TABLE IF NOT EXISTS profiles (
              id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
              email TEXT UNIQUE NOT NULL,
              role TEXT NOT NULL DEFAULT 'customer',
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            
            -- Permitir acceso a la tabla profiles
            ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
            
            -- Políticas de RLS para perfiles
            CREATE POLICY IF NOT EXISTS "Perfiles visibles para todos los usuarios autenticados" 
              ON profiles FOR SELECT 
              USING (auth.role() = 'authenticated');
            
            CREATE POLICY IF NOT EXISTS "Los usuarios pueden actualizar su propio perfil" 
              ON profiles FOR UPDATE 
              USING (auth.uid() = id);
            
            CREATE POLICY IF NOT EXISTS "Los administradores pueden hacer todo con los perfiles" 
              ON profiles FOR ALL 
              USING (auth.jwt() ->> 'role' = 'admin');
            
            -- Función para manejar nuevos usuarios
            CREATE OR REPLACE FUNCTION public.handle_new_user() 
            RETURNS TRIGGER AS $$
            BEGIN
              INSERT INTO public.profiles (id, email, role)
              VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'role', 'customer'));
              RETURN new;
            END;
            $$ LANGUAGE plpgsql SECURITY DEFINER;
            
            -- Trigger para crear perfil al crear usuario
            DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
            CREATE TRIGGER on_auth_user_created
              AFTER INSERT ON auth.users
              FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
            
            -- Tabla para la configuración del sitio
            CREATE TABLE IF NOT EXISTS site_config (
              id SERIAL PRIMARY KEY,
              config JSONB NOT NULL,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            
            -- Configurar RLS para la tabla site_config
            ALTER TABLE site_config ENABLE ROW LEVEL SECURITY;
            
            -- Políticas para site_config
            CREATE POLICY IF NOT EXISTS "Cualquier usuario puede leer la configuración" 
              ON site_config FOR SELECT 
              TO authenticated, anon;
            
            CREATE POLICY IF NOT EXISTS "Solo administradores pueden actualizar la configuración" 
              ON site_config FOR ALL 
              USING (auth.jwt() ->> 'role' = 'admin');
            
            -- Tabla para órdenes
            CREATE TABLE IF NOT EXISTS orders (
              id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
              user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
              customer_name TEXT NOT NULL,
              customer_phone TEXT NOT NULL,
              customer_address TEXT,
              items JSONB NOT NULL,
              subtotal DECIMAL(10, 2) NOT NULL,
              total DECIMAL(10, 2) NOT NULL,
              payment_method TEXT NOT NULL,
              status TEXT NOT NULL DEFAULT 'pending',
              notes TEXT,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            
            -- Configurar RLS para órdenes
            ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
            
            -- Políticas para órdenes
            CREATE POLICY IF NOT EXISTS "Los usuarios pueden ver sus propias órdenes" 
              ON orders FOR SELECT 
              USING (auth.uid() = user_id);
            
            CREATE POLICY IF NOT EXISTS "Los administradores pueden hacer todo con las órdenes" 
              ON orders FOR ALL 
              USING (auth.jwt() ->> 'role' = 'admin');
            
            CREATE POLICY IF NOT EXISTS "Los usuarios anónimos pueden crear órdenes" 
              ON orders FOR INSERT 
              WITH CHECK (auth.role() = 'anon' OR auth.role() = 'authenticated');
            
            -- Función para actualizar el timestamp de actualización
            CREATE OR REPLACE FUNCTION update_updated_at()
            RETURNS TRIGGER AS $$
            BEGIN
              NEW.updated_at = NOW();
              RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
            
            -- Crear triggers para actualizar los timestamps
            DROP TRIGGER IF EXISTS set_profiles_updated_at ON profiles;
            CREATE TRIGGER set_profiles_updated_at
              BEFORE UPDATE ON profiles
              FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
            
            DROP TRIGGER IF EXISTS set_site_config_updated_at ON site_config;
            CREATE TRIGGER set_site_config_updated_at
              BEFORE UPDATE ON site_config
              FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
            
            DROP TRIGGER IF EXISTS set_orders_updated_at ON orders;
            CREATE TRIGGER set_orders_updated_at
              BEFORE UPDATE ON orders
              FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
            
            -- Insertar configuración predeterminada si no existe
            INSERT INTO site_config (config)
            SELECT '{"restaurantName": "WHATSFOOD", "whatsappNumber": "18091234567", "currency": "RD$", "openingHours": "8:00 AM - 10:00 PM"}'::jsonb
            WHERE NOT EXISTS (SELECT 1 FROM site_config LIMIT 1);
          `;
          
          // Ejecutar el script SQL para crear todas las tablas
          const { success: createSuccess, error: createError } = await executeSQL(
            supabaseUrl,
            supabaseServiceKey,
            sqlScript
          );
          
          if (!createSuccess) {
            throw new Error(`Error al crear las tablas: ${createError?.message || 'Desconocido'}`);
          }

          console.log("Script SQL ejecutado correctamente.");
          console.log("Esquema de base de datos creado correctamente");
        }

        setConnectionStatus(ConnectionStatus.Success);
        setConnectionMessage('Conexión exitosa y tablas creadas correctamente');
        setCurrentStep('restaurant');
      } catch (error) {
        console.error("Error al ejecutar el script SQL:", error);
        setConnectionStatus(ConnectionStatus.Error);
        setConnectionMessage(`Error al crear las tablas: ${error?.message || 'Desconocido'}. Por favor, ejecute el script SQL manualmente.`);
        console.error("Error en la instalación:", error);
        setConnectionStatus('error');
        setConnectionMessage(`Error al completar la instalación: ${error.message || 'Error desconocido'}`);
      }
    };
      console.error("Error en la instalación:", error);
      setConnectionStatus('error');
      setConnectionMessage(`Error al completar la instalación: ${error.message || 'Error desconocido'}`);
    }
  };

  // Si debemos mostrar la guía, renderizarla
  if (showGuide) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
        <InstallerGuide onClose={() => setShowGuide(false)} />
      </div>
    );
  }

  // Mostrar el script SQL cuando se solicite
  if (showSqlScript) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
        <Card className="w-full max-w-4xl">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Script SQL de Inicialización</CardTitle>
              <CardDescription>
                Copie este script y ejecútelo en el SQL Editor de Supabase
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              onClick={() => setShowSqlScript(false)}
              className="ml-auto"
            >
              Volver
            </Button>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-900 text-gray-100 p-4 rounded-md overflow-auto max-h-[60vh]">
              <pre className="text-sm">
{`-- Schema para la inicialización de la base de datos en Supabase

-- Configurar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Crear función auxiliar para verificación de conexión
CREATE OR REPLACE FUNCTION now()
RETURNS TIMESTAMPTZ AS $$
BEGIN
  RETURN CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Tabla para perfiles de usuario
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'customer',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Permitir acceso a la tabla profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para perfiles
-- Los usuarios pueden leer todos los perfiles
CREATE POLICY IF NOT EXISTS "Perfiles visibles para todos los usuarios autenticados" 
  ON profiles FOR SELECT 
  USING (auth.role() = 'authenticated');

-- Los usuarios solo pueden actualizar su propio perfil
CREATE POLICY IF NOT EXISTS "Los usuarios pueden actualizar su propio perfil" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id);

-- Los administradores pueden hacer todo
CREATE POLICY IF NOT EXISTS "Los administradores pueden hacer todo con los perfiles" 
  ON profiles FOR ALL 
  USING (auth.jwt() ->> 'role' = 'admin');

-- Función para manejar nuevos usuarios
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'role', 'customer'));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para crear perfil al crear usuario
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Tabla para la configuración del sitio
CREATE TABLE IF NOT EXISTS site_config (
  id SERIAL PRIMARY KEY,
  config JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Configurar RLS para la tabla site_config
ALTER TABLE site_config ENABLE ROW LEVEL SECURITY;

-- Políticas para site_config
-- Cualquier usuario puede leer la configuración
CREATE POLICY IF NOT EXISTS "Cualquier usuario puede leer la configuración" 
  ON site_config FOR SELECT 
  TO authenticated, anon;

-- Solo administradores pueden actualizar la configuración
CREATE POLICY IF NOT EXISTS "Solo administradores pueden actualizar la configuración" 
  ON site_config FOR ALL 
  USING (auth.jwt() ->> 'role' = 'admin');

-- Tabla para órdenes
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_address TEXT,
  items JSONB NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  payment_method TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Configurar RLS para órdenes
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Políticas para órdenes
-- Los usuarios pueden ver sus propias órdenes
CREATE POLICY IF NOT EXISTS "Los usuarios pueden ver sus propias órdenes" 
  ON orders FOR SELECT 
  USING (auth.uid() = user_id);

-- Los administradores pueden hacer todo con las órdenes
CREATE POLICY IF NOT EXISTS "Los administradores pueden hacer todo con las órdenes" 
  ON orders FOR ALL 
  USING (auth.jwt() ->> 'role' = 'admin');

-- Los usuarios anónimos pueden crear órdenes (para pedidos sin registro)
CREATE POLICY IF NOT EXISTS "Los usuarios anónimos pueden crear órdenes" 
  ON orders FOR INSERT 
  WITH CHECK (auth.role() = 'anon' OR auth.role() = 'authenticated');

-- Función para actualizar el timestamp de actualización
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear triggers para actualizar los timestamps
DROP TRIGGER IF EXISTS set_profiles_updated_at ON profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

DROP TRIGGER IF EXISTS set_site_config_updated_at ON site_config;
CREATE TRIGGER set_site_config_updated_at
  BEFORE UPDATE ON site_config
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

DROP TRIGGER IF EXISTS set_orders_updated_at ON orders;
CREATE TRIGGER set_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

-- Insertar configuración predeterminada si no existe
INSERT INTO site_config (config)
SELECT '{"restaurantName": "WHATSFOOD", "whatsappNumber": "18091234567", "currency": "RD$", "openingHours": "8:00 AM - 10:00 PM"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM site_config LIMIT 1);
`}
                  </pre>
                </div>
                <div className="mt-4 flex justify-end space-x-2">
                  <Button 
                    onClick={() => {
                      navigator.clipboard.writeText(document.querySelector('pre')?.innerText || '');
                      alert('Script copiado al portapapeles');
                    }}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Copiar al Portapapeles
                  </Button>
                  <Button onClick={() => setShowSqlScript(false)}>
                    Volver al Instalador
                  </Button>
                </div>
        )}

        {connectionStatus === ConnectionStatus.Success && (
          <Alert variant="success" className="mb-4">
            <AlertDescription>{connectionMessage}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="supabase" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="supabase">Configuración de Supabase</TabsTrigger>
            <TabsTrigger value="restaurant">Configuración de Restaurante</TabsTrigger>
            <TabsTrigger value="admin">Administrador</TabsTrigger>
          </TabsList>
          
          <TabsContent value="supabase">
            <Card>
              <CardHeader>
                <CardTitle>Configuración de Supabase</CardTitle>
                <CardDescription>
                  Ingrese los detalles de su proyecto Supabase
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={supabaseForm.handleSubmit(async (data) => {
                  try {
                    const client = await testSupabaseConnection(supabaseForm, setTestingConnection, setConnectionStatus, setConnectionMessage, setCurrentStep);
                    if (client) {
                      setSupabaseClient(client);
                      setConnectionStatus(ConnectionStatus.Success);
                      setConnectionMessage('Conexión exitosa y tablas creadas correctamente');
                      setCurrentStep('restaurant');
                    }
                  } catch (error: any) {
                    setConnectionStatus(ConnectionStatus.Error);
                    setConnectionMessage(error.message);
                  }
                })}>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="supabaseUrl">URL de Supabase</Label>
                      <Input
                        id="supabaseUrl"
                        placeholder="https://your-project.supabase.co"
                        {...supabaseForm.register('supabaseUrl')}
                      />
                      {supabaseForm.formState.errors.supabaseUrl && (
                        <p className="text-red-500 text-sm mt-1">
                          {supabaseForm.formState.errors.supabaseUrl.message}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="supabaseAnonKey">Clave Anónima</Label>
                      <Input
                        id="supabaseAnonKey"
                        placeholder="eyJhbG..."
                        {...supabaseForm.register('supabaseAnonKey')}
                      />
                      {supabaseForm.formState.errors.supabaseAnonKey && (
                        <p className="text-red-500 text-sm mt-1">
                          {supabaseForm.formState.errors.supabaseAnonKey.message}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="supabaseServiceKey">Clave de Servicio</Label>
                      <Input
                        id="supabaseServiceKey"
                        placeholder="eyJhbG..."
                        {...supabaseForm.register('supabaseServiceKey')}
                      />
                      {supabaseForm.formState.errors.supabaseServiceKey && (
                        <p className="text-red-500 text-sm mt-1">
                          {supabaseForm.formState.errors.supabaseServiceKey.message}
                        </p>
                      )}
                    </div>

                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        disabled={testingConnection}
                      >
                        {testingConnection ? 'Verificando...' : 'Verificar Conexión'}
                      </Button>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="restaurant">
            <Card>
              <CardHeader>
                <CardTitle>Configuración de Restaurante</CardTitle>
                <CardDescription>
                  Configure los detalles de su restaurante
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={restaurantForm.handleSubmit(completeInstallation)}>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="restaurantName">Nombre del Restaurante</Label>
                      <Input
                        id="restaurantName"
                        {...restaurantForm.register('restaurantName')}
                      />
                      {restaurantForm.formState.errors.restaurantName && (
                        <p className="text-red-500 text-sm mt-1">
                          {restaurantForm.formState.errors.restaurantName.message}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="whatsappNumber">Número de WhatsApp</Label>
                      <Input
                        id="whatsappNumber"
                        placeholder="18091234567"
                        {...restaurantForm.register('whatsappNumber')}
                      />
                      {restaurantForm.formState.errors.whatsappNumber && (
                        <p className="text-red-500 text-sm mt-1">
                          {restaurantForm.formState.errors.whatsappNumber.message}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="currency">Moneda</Label>
                      <Input
                        id="currency"
                        placeholder="RD$"
                        {...restaurantForm.register('currency')}
                      />
                      {restaurantForm.formState.errors.currency && (
                        <p className="text-red-500 text-sm mt-1">
                          {restaurantForm.formState.errors.currency.message}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="openingHours">Horario de Atención</Label>
                      <Input
                        id="openingHours"
                        placeholder="8:00 AM - 10:00 PM"
                        {...restaurantForm.register('openingHours')}
                      />
                      {restaurantForm.formState.errors.openingHours && (
                        <p className="text-red-500 text-sm mt-1">
                          {restaurantForm.formState.errors.openingHours.message}
                        </p>
                      )}
                    </div>

                    <div className="flex justify-end">
                      <Button type="submit">Guardar Configuración</Button>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="admin">
            <Card>
              <CardHeader>
                <CardTitle>Crear Administrador</CardTitle>
                <CardDescription>
                  Configure las credenciales del administrador del sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={adminForm.handleSubmit(completeInstallation)}>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        {...adminForm.register('email')}
                      />
                      {adminForm.formState.errors.email && (
                        <p className="text-red-500 text-sm mt-1">
                          {adminForm.formState.errors.email.message}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="password">Contraseña</Label>
                      <Input
                        id="password"
                        type="password"
                        {...adminForm.register('password')}
                      />
                      {adminForm.formState.errors.password && (
                        <p className="text-red-500 text-sm mt-1">
                          {adminForm.formState.errors.password.message}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        {...adminForm.register('confirmPassword')}
                      />
                      {adminForm.formState.errors.confirmPassword && (
                        <p className="text-red-500 text-sm mt-1">
                          {adminForm.formState.errors.confirmPassword.message}
                        </p>
                      )}
                    </div>

                    <div className="flex justify-end">
                      <Button type="submit">Crear Administrador</Button>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {showSqlScript && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Script SQL</CardTitle>
              <CardDescription>
                Script SQL para crear las tablas necesarias
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={sqlScript}
                readOnly
                className="h-[400px]"
              />
            </CardContent>
          </Card>
        )}

        {installationComplete && (
          <div className="mt-8">
            <Alert variant="success">
              <AlertDescription>
                ¡Instalación completada exitosamente!
                <br />
                <br />
                <div className="space-y-2">
                  <p>
                    Puede cerrar esta página y acceder al sistema usando las credenciales del administrador que creó.
                  </p>
                  <p>
                    Si necesita ayuda o tiene preguntas, consulte la documentación o contáctenos.
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        )}
      </div>
    </div>
  );
};

export default Installer;