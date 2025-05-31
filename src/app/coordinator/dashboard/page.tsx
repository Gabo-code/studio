// @ts-nocheck
import { CoordinatorDashboardClient } from './components/coordinator-dashboard-client';

export const metadata = {
  title: 'Coordinator Dashboard | SLR Dispatch Tracker',
};

// This page itself is a Server Component.
// The actual interactive dashboard content will be in a Client Component.
export default function CoordinatorDashboardPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <CoordinatorDashboardClient />
    </div>
  );
}
