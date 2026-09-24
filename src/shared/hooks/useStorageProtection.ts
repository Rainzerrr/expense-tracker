import { useEffect, useState } from 'react';
import { getStorageProtection } from '@/shared/infrastructure/persistentStorage';
import type { StorageProtection } from '@/shared/infrastructure/persistentStorage';

/** État de la protection du stockage. `undefined` le temps de la première lecture. */
export function useStorageProtection(): StorageProtection | undefined {
  const [protection, setProtection] = useState<StorageProtection>();
  useEffect(() => {
    let active = true;
    void getStorageProtection().then((value) => active && setProtection(value));
    return () => {
      active = false;
    };
  }, []);
  return protection;
}
