import type { SyncCode } from './syncCode';

/** Le code secret de cet appareil (absent tant qu'il n'est pas relié). */
export interface SyncSettingsRepository {
  getCode(): Promise<SyncCode | null>;
  setCode(code: SyncCode): Promise<void>;
  clearCode(): Promise<void>;
}
