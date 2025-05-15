import { PageHeader } from '@/components/shared/page-header';
import { CoordinatorDashboardClient } from './components/coordinator-dashboard-client';
import { Users } from 'lucide-react';

export const metadata = {
  title: 'Coordinator Dashboard | Jumbo Dispatch Tracker',
};

// This page itself is a Server Component.
// The actual interactive dashboard content will be in a Client Component.
export default function CoordinatorDashboardPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <PageHeader 
        title="Panel de Coordinador" 
        description="Gestiona conductores en espera y despachos de entregas."
        Icon={Users}
        showLogo={true}
      />
      <CoordinatorDashboardClient />
    </div>
  );
}
