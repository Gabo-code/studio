"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthStatus, type UserRole } from '@/lib/auth';

export function useAuthCheck(requiredRole?: UserRole) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentRole, setCurrentRole] = useState<UserRole | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const authStatus = getAuthStatus();
      setIsAuthenticated(authStatus.isAuthenticated);
      setCurrentRole(authStatus.role);

      if (!authStatus.isAuthenticated) {
        const redirectTo = requiredRole === 'admin' ? '/admin/login' : '/coordinator/login';
        router.replace(redirectTo);
      } else if (requiredRole && authStatus.role !== requiredRole) {
        // If authenticated but wrong role, redirect to a generic error or home page, or their respective dashboard
        // For simplicity, redirecting to login of the original intended area.
        const redirectTo = requiredRole === 'admin' ? '/admin/login' : '/coordinator/login';
        router.replace(redirectTo); 
      }
      setIsLoading(false);
    }
  }, [router, requiredRole]);

  return { isLoading, isAuthenticated, role: currentRole };
}
