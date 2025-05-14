"use client";

import { Card, CardContent } from '@/components/ui/card';

// Interface para los conductores en espera
interface WaitingDriver {
  id: string;
  name: string;
  start_time: string;
}

interface WaitingListProps {
  drivers: WaitingDriver[];
}

export function WaitingList({ drivers }: WaitingListProps) {
  return (
    <div className="space-y-2">
      {drivers.map((driver, index) => (
        <Card key={driver.id} className="shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-4 flex items-center">
            <div className="h-8 w-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold mr-4">
              {index + 1}
            </div>
            <div className="text-lg font-medium">{driver.name}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
} 