"use client";

import type { WaitingDriver } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { useState, type FormEvent } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { User, Clock, ShoppingBag, MapPin, Send } from 'lucide-react';
import Image from 'next/image';

interface DriverQueueProps {
  drivers: WaitingDriver[];
  onCheckoutDriver: (driverId: string, bags: number, commune: string) => void;
}

interface CheckoutFormState {
  bags: string;
  commune: string;
}

export function DriverQueue({ drivers, onCheckoutDriver }: DriverQueueProps) {
  const [selectedDriver, setSelectedDriver] = useState<WaitingDriver | null>(null);
  const [checkoutForm, setCheckoutForm] = useState<CheckoutFormState>({ bags: '', commune: '' });
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleOpenDialog = (driver: WaitingDriver) => {
    setSelectedDriver(driver);
    setCheckoutForm({ bags: '', commune: ''}); // Reset form
    setIsDialogOpen(true);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCheckoutForm({ ...checkoutForm, [e.target.name]: e.target.value });
  };

  const handleSubmitCheckout = (e: FormEvent) => {
    e.preventDefault();
    if (selectedDriver && checkoutForm.bags && checkoutForm.commune) {
      const bagsCount = parseInt(checkoutForm.bags, 10);
      if (!isNaN(bagsCount) && bagsCount > 0) {
        onCheckoutDriver(selectedDriver.id, bagsCount, checkoutForm.commune);
        setIsDialogOpen(false); // Close dialog on successful submit
        setSelectedDriver(null);
      } else {
        // Handle invalid bags input, e.g., show an error message
        alert("Please enter a valid number of bags.");
      }
    }
  };

  if (drivers.length === 0) {
    return (
      <Card className="text-center shadow-sm">
        <CardContent className="p-10">
          <User className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground text-lg">No drivers currently in the queue.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {drivers.map((driver) => (
        <Card key={driver.id} className="shadow-md hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center gap-4">
            <Avatar className="h-16 w-16">
              {driver.selfieDataUrl ? (
                 <AvatarImage src={driver.selfieDataUrl} alt={`${driver.name}'s selfie`} data-ai-hint="driver selfie" />
              ) : (
                <AvatarFallback>{driver.name.substring(0, 2).toUpperCase()}</AvatarFallback>
              )}
            </Avatar>
            <div>
              <CardTitle className="text-xl">{driver.name}</CardTitle>
              <CardDescription className="flex items-center gap-1 text-sm">
                <Clock className="h-4 w-4" /> 
                Checked in {formatDistanceToNow(new Date(driver.checkInTime), { addSuffix: true })}
              </CardDescription>
               {driver.location && (
                <CardDescription className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" /> Lat: {driver.location.latitude.toFixed(4)}, Lon: {driver.location.longitude.toFixed(4)}
                </CardDescription>
               )}
            </div>
          </CardHeader>
          <CardFooter className="flex justify-end">
             <Dialog open={isDialogOpen && selectedDriver?.id === driver.id} onOpenChange={(open) => { if(!open) setSelectedDriver(null); setIsDialogOpen(open);}}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenDialog(driver)} variant="default">
                  <Send className="mr-2 h-4 w-4" /> Dispatch Driver
                </Button>
              </DialogTrigger>
              {selectedDriver && (
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Dispatch: {selectedDriver.name}</DialogTitle>
                    <DialogDescription>
                      Enter delivery details for {selectedDriver.name}.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmitCheckout} className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="bags" className="text-right col-span-1">
                        Bags
                      </Label>
                      <Input
                        id="bags"
                        name="bags"
                        type="number"
                        value={checkoutForm.bags}
                        onChange={handleFormChange}
                        className="col-span-3"
                        placeholder="Number of bags"
                        min="1"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="commune" className="text-right col-span-1">
                        Commune
                      </Label>
                      <Input
                        id="commune"
                        name="commune"
                        value={checkoutForm.commune}
                        onChange={handleFormChange}
                        className="col-span-3"
                        placeholder="Destination commune"
                        required
                      />
                    </div>
                     <DialogFooter>
                      <DialogClose asChild>
                        <Button type="button" variant="outline">Cancel</Button>
                      </DialogClose>
                      <Button type="submit">Confirm Dispatch</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              )}
            </Dialog>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
