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
        title="Admin Dashboard" 
        description="Oversee operations, generate reports, and manage drivers."
        Icon={UserCog}
        showLogo={true}
      />
      <AdminDashboardClient />
    </div>
  );
}
