import { useCallback } from 'react';
import { useAppServices } from '@/app/AppServices';
import { createTag } from './createTag';

export function useCreateTag() {
  const { catalog, now } = useAppServices();
  return useCallback((name: string) => createTag(catalog, name, now()), [catalog, now]);
}
