"use client";

import { useRouter } from 'next/navigation';
import { AuthForm } from '@/components/shared/auth-form';
import { AppLogo } from '@/components/icons/logo';
import Link from 'next/link';

export default function AdminLoginPage() {
  const router = useRouter();

  const handleLoginSuccess = () => {
    router.replace('/admin/dashboard');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/40 p-4">
        <Link href="/" className="mb-8">
            <AppLogo className="h-16 w-auto" />
        </Link>
        <AuthForm
            role="admin"
            onLoginSuccess={handleLoginSuccess}
            title="Ingreso Administrador"
            description="Accede a reportes, rankings y configuración del sistema."
        />
    </div>
  );
}
