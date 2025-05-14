import type { LucideIcon } from 'lucide-react';
import { AppLogo } from '@/components/icons/logo';
import Link from 'next/link';

interface PageHeaderProps {
  title: string;
  description?: string;
  Icon?: LucideIcon;
  showLogo?: boolean;
}

export function PageHeader({ title, description, Icon, showLogo = false }: PageHeaderProps) {
  return (
    <header className="mb-8 border-b pb-6">
      {showLogo && (
        <Link href="/" className="inline-block mb-4">
           <AppLogo className="h-12 w-auto" />
        </Link>
      )}
      <div className="flex items-center gap-3">
        {Icon && <Icon className="h-8 w-8 text-primary" />}
        <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
      </div>
      {description && <p className="mt-2 text-muted-foreground">{description}</p>}
    </header>
  );
}
