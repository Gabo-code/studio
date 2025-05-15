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
          Jumbo Dispatch Tracker
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Efficiently manage driver check-ins and deliveries.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 w-full max-w-4xl">
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader>
            <Truck className="h-10 w-10 text-primary mb-2" />
            <CardTitle className="text-2xl">Driver Portal</CardTitle>
            <CardDescription>Check-in to the dispatch queue.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/driver/check-in" legacyBehavior passHref>
              <Button className="w-full" variant="default">
                Go to Driver Check-in
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader>
            <Clock className="h-10 w-10 text-primary mb-2" />
            <CardTitle className="text-2xl">Waiting Portal</CardTitle>
            <CardDescription>View your position in the waiting queue.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/waiting" legacyBehavior passHref>
              <Button className="w-full" variant="default">
                View Waiting List
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader>
            <Users className="h-10 w-10 text-primary mb-2" />
            <CardTitle className="text-2xl">Coordinator Portal</CardTitle>
            <CardDescription>Manage driver queue and dispatches.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full" 
              variant="default" 
              onClick={handlePortalClick('coordinator')}
            >
              Coordinator Login
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader>
            <UserCog className="h-10 w-10 text-primary mb-2" />
            <CardTitle className="text-2xl">Admin Portal</CardTitle>
            <CardDescription>Access reports and manage system settings.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full" 
              variant="default" 
              onClick={handlePortalClick('admin')}
            >
              Admin Login
            </Button>
          </CardContent>
        </Card>
      </div>

      <footer className="mt-16 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Jumbo Dispatch. All rights reserved.</p>
      </footer>
    </div>
  );
}
