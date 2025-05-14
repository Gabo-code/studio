import { PageHeader } from '@/components/shared/page-header';
import { CheckInForm } from './components/check-in-form';
import { Truck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export const metadata = {
  title: 'Driver Check-in | Jumbo Dispatch Tracker',
};

// Note: Leaflet map and selfie capture require client components.
// They will be dynamically imported or structured within CheckInForm.

export default function DriverCheckInPage() {
  return (
    <div className="container mx-auto max-w-3xl py-8 px-4">
      <PageHeader 
        title="Driver Check-in" 
        description="Enter your details to join the dispatch queue."
        Icon={Truck}
        showLogo={true}
      />
      <Card className="shadow-lg">
        <CardContent className="p-6">
          <CheckInForm />
        </CardContent>
      </Card>
    </div>
  );
}
