"use client";

import { useState, useEffect } from 'react';
import { ensurePersistentId as getOrSetPersistentId } from '@/lib/persistentId';

export function usePersistentId(): string | null {
  const [persistentId, setPersistentId] = useState<string | null>(null);

  useEffect(() => {
    // Ensure this runs only on the client side
    if (typeof window !== 'undefined') {
      const pid = getOrSetPersistentId();
      setPersistentId(pid);
    }
  }, []);

  return persistentId;
}
