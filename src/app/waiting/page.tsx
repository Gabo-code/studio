'use client';

import { PageHeader } from '@/components/shared/page-header';
import { Clock } from 'lucide-react';
import { WaitingPortalClient } from './components/waiting-portal-client';

export default function WaitingPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <PageHeader 
        title="Lista de Espera" 
        description="Consulta tu posición en la lista de espera"
        Icon={Clock}
        showLogo={true}
      />
      <WaitingPortalClient />
    </div>
  );
} 