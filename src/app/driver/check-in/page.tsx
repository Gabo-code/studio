import { PageHeader } from '@/components/shared/page-header';
import { CheckInForm } from './components/check-in-form';
import { Truck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export const metadata = {
  title: 'Check-in de Conductor | Seguimiento de Despachos Jumbo',
};

// Note: Leaflet map and selfie capture require client components.
// They will be dynamically imported or structured within CheckInForm.

export default function DriverCheckInPage() {
  return (
    <div className="container mx-auto max-w-3xl py-8 px-4">
      <PageHeader 
        title="Check-in de Conductor" 
        description="Ingresa tus datos para unirte a la cola de despacho."
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
