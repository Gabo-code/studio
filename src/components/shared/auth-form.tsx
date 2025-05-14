"use client";

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import type { UserRole } from '@/lib/auth';

interface AuthFormProps {
  role: UserRole;
  onLoginSuccess: () => void;
  title: string;
  description: string;
}

export function AuthForm({ role, onLoginSuccess, title, description }: AuthFormProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // This is a placeholder for the actual login function.
  // In a real app, you would call your auth.ts login function.
  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simulate API call for login from '@/lib/auth'
    // const success = login(password, role); // This would be the actual call
    // For now, directly use constants (not secure for real app)
    const { COORDINATOR_PASSWORD, ADMIN_PASSWORD } = await import('@/lib/constants');
    const { login: performLogin } = await import('@/lib/auth');


    let success = false;
    if (role === 'coordinator' && password === COORDINATOR_PASSWORD) {
      success = performLogin(password, role);
    } else if (role === 'admin' && password === ADMIN_PASSWORD) {
      success = performLogin(password, role);
    }
    
    setIsLoading(false);
    if (success) {
      onLoginSuccess();
    } else {
      setError('Invalid password. Please try again.');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/40 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">{title}</CardTitle>
          <CardDescription className="text-center">{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter your password"
                className="text-base"
              />
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Login Failed</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Logging in...' : 'Login'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
