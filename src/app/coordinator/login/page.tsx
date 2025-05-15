"use client";

import { useRouter } from 'next/navigation';
import { AuthForm } from '@/components/shared/auth-form';
import { AppLogo } from '@/components/icons/logo';

export default function CoordinatorLoginPage() {
  const router = useRouter();

  const handleLoginSuccess = () => {
    router.replace('/coordinator/dashboard'); // Use replace to prevent back button to login
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/40 p-4">
        <Link href="/" className="mb-8">
            <AppLogo className="h-16 w-auto" />
        </Link>
        <AuthForm
            role="coordinator"
            onLoginSuccess={handleLoginSuccess}
            title="Ingreso Coordinador"
            description="Accede al panel de gestión de despachos de conductores."
        />
    </div>
  );
}
// Need to import Link from next/link
import Link from 'next/link';
