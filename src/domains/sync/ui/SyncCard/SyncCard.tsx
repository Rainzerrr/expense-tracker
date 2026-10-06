import { useLiveQuery } from 'dexie-react-hooks';
import { useId, useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppServices } from '@/app/AppServices';
import { formatDateTime } from '@/shared/i18n/format';
import { Button } from '@/shared/ui/atoms/Button';
import { CardSection } from '@/shared/ui/molecules/CardSection';
import { useRunSync, useSyncCode } from '../../application/useAutoSync';
import { useSyncSetup } from '../../application/useSyncSetup';
import type { JoinResult } from '../../application/useSyncSetup';
import { useSyncState } from '../../application/syncStatus';
import { formatSyncCode } from '../../domain/syncCode';
import type { SyncCode } from '../../domain/syncCode';
import './SyncCard.scss';

/** Relier cet appareil aux autres (code secret), et voir où en est la synchronisation. */
export function SyncCard() {
  const { t } = useTranslation('settings');
  const { isDemo } = useAppServices();
  const code = useSyncCode();

  return (
    <CardSection title={t('sync.title')}>
      {isDemo ? (
        <p className="sync-card__text">{t('data.demoNotice')}</p>
      ) : code === undefined ? null : code === null ? (
        <SyncSetup />
      ) : (
        <SyncLinked code={code} />
      )}
    </CardSection>
  );
}

function SyncSetup() {
  const { t } = useTranslation('settings');
  const setup = useSyncSetup();
  const inputId = useId();
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Extract<JoinResult, { ok: false }>['reason'] | null>(null);

  const create = async () => {
    setBusy(true);
    await setup.create();
    setBusy(false);
  };

  const join = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result = await setup.join(input);
    setBusy(false);
    if (!result.ok) setError(result.reason);
  };

  return (
    <div className="sync-card">
      <p className="sync-card__text">{t('sync.intro')}</p>

      <div className="sync-card__block">
        <h3 className="sync-card__subtitle">{t('sync.create.title')}</h3>
        <p className="sync-card__text">{t('sync.create.text')}</p>
        <Button disabled={busy} onClick={() => void create()}>
          {t('sync.create.action')}
        </Button>
      </div>

      <form className="sync-card__block" onSubmit={(event) => void join(event)}>
        <h3 className="sync-card__subtitle">{t('sync.join.title')}</h3>
        <label className="sync-card__field" htmlFor={inputId}>
          <span className="sync-card__label">{t('sync.join.label')}</span>
          <input
            id={inputId}
            className="sync-card__input"
            type="text"
            autoComplete="off"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
              setError(null);
            }}
          />
        </label>
        <Button type="submit" variant="secondary" disabled={busy || input.trim() === ''}>
          {t('sync.join.action')}
        </Button>
        {error && (
          <p role="alert" className="sync-card__error">
            {t(`sync.errors.${error}`)}
          </p>
        )}
      </form>
    </div>
  );
}

function SyncLinked({ code }: { code: SyncCode }) {
  const { t } = useTranslation('settings');
  const { backup } = useAppServices();
  const sync = useRunSync();
  const setup = useSyncSetup();
  const state = useSyncState((store) => store.state);
  const received = useSyncState((store) => store.lastReceived);
  const lastSyncAt = useLiveQuery(() => backup.getMeta('lastSyncAt'), [backup]);
  const [copied, setCopied] = useState(false);
  const [confirmUnlink, setConfirmUnlink] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(formatSyncCode(code));
      setCopied(true);
    } catch {
      // Presse-papiers refusé : le code reste affiché, sélectionnable à la main.
    }
  };

  return (
    <div className="sync-card">
      <p className="sync-card__status" role="status">
        {state.kind === 'syncing'
          ? t('sync.status.syncing')
          : state.kind === 'failed'
            ? null
            : lastSyncAt
              ? t('sync.status.lastSync', { date: formatDateTime(lastSyncAt) })
              : t('sync.status.never')}
      </p>
      {state.kind === 'failed' && (
        <p role="alert" className="sync-card__error">
          {t(`sync.errors.${state.reason}`)}
        </p>
      )}
      {received && (
        <p className="sync-card__text">
          {t('sync.status.received', {
            added: received.expenses.added,
            updated: received.expenses.updated,
            deleted: received.expenses.deleted,
          })}
        </p>
      )}

      <Button disabled={state.kind === 'syncing'} onClick={() => void sync()}>
        {t('sync.now')}
      </Button>

      <div className="sync-card__block">
        <h3 className="sync-card__subtitle">{t('sync.code.title')}</h3>
        <p className="sync-card__code">{formatSyncCode(code)}</p>
        <p className="sync-card__text">{t('sync.code.text')}</p>
        <div className="sync-card__actions">
          <Button variant="secondary" onClick={() => void copy()}>
            {copied ? t('sync.code.copied') : t('sync.code.copy')}
          </Button>
          {confirmUnlink ? (
            <Button variant="danger" onClick={() => void setup.unlink()}>
              {t('sync.unlink.confirm')}
            </Button>
          ) : (
            <Button variant="secondary" onClick={() => setConfirmUnlink(true)}>
              {t('sync.unlink.action')}
            </Button>
          )}
        </div>
        {confirmUnlink && <p className="sync-card__text">{t('sync.unlink.text')}</p>}
      </div>
    </div>
  );
}
