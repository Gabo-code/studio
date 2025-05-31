"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AppLogo } from '@/components/icons/logo';
import { Users, UserCog, Truck, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getAuthStatus, type UserRole } from '@/lib/auth';

export default function HomePage() {
  const router = useRouter();

  const handlePortalClick = (role: UserRole) => (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const authStatus = getAuthStatus();
    
    if (authStatus.isAuthenticated && authStatus.role === role) {
      // Si ya está autenticado con el rol correcto, redirigir al dashboard
      router.push(`/${role}/dashboard`);
    } else {
      // Si no está autenticado o tiene un rol diferente, redirigir al login
      router.push(`/${role}/login`);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-muted/40 p-4 sm:p-8">
      <header className="mb-12 text-center">
        <AppLogo className="mx-auto mb-4 h-16 w-auto" />
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Seguimiento de Despachos SLR
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Gestiona eficientemente el check-in y los despachos de conductores.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 w-full max-w-4xl">
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader>
            <Truck className="h-10 w-10 text-primary mb-2" />
            <CardTitle className="text-2xl">Portal de Conductores</CardTitle>
            <CardDescription>Realiza tu check-in en la cola de despacho.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/driver/check-in" legacyBehavior passHref>
              <Button className="w-full" variant="default">
                Ir al Check-in de Conductores
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader>
            <Clock className="h-10 w-10 text-primary mb-2" />
            <CardTitle className="text-2xl">Portal de Espera</CardTitle>
            <CardDescription>Consulta tu posición en la lista de espera.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/waiting" legacyBehavior passHref>
              <Button className="w-full" variant="default">
                Ver Lista de Espera
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader>
            <Users className="h-10 w-10 text-primary mb-2" />
            <CardTitle className="text-2xl">Portal de Coordinadores</CardTitle>
            <CardDescription>Gestiona la cola y los despachos de conductores.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full" 
              variant="default" 
              onClick={handlePortalClick('coordinator')}
            >
              Ingreso Coordinador
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader>
            <UserCog className="h-10 w-10 text-primary mb-2" />
            <CardTitle className="text-2xl">Portal de Administradores</CardTitle>
            <CardDescription>Accede a reportes y configura el sistema.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full" 
              variant="default" 
              onClick={handlePortalClick('admin')}
            >
              Ingreso Administrador
            </Button>
          </CardContent>
        </Card>
      </div>

      <footer className="mt-16 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} SLR Dispatch. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}
