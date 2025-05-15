import { PageHeader } from '@/components/shared/page-header';
import { AdminDashboardClient } from './components/admin-dashboard-client';
import { UserCog } from 'lucide-react';

export const metadata = {
  title: 'Admin Dashboard | Jumbo Dispatch Tracker',
};

export default function AdminDashboardPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <PageHeader 
        title="Panel de Administración" 
        description="Supervisa operaciones, genera reportes y administra conductores."
        Icon={UserCog}
        showLogo={true}
      />
      <AdminDashboardClient />
    </div>
  );
}
