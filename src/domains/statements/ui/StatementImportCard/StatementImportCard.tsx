import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAppServices } from '@/app/AppServices';
import { useCatalog } from '@/domains/categorization/react';
import { formatMoney } from '@/shared/i18n/format';
import { Button } from '@/shared/ui/atoms/Button';
import { CardSection } from '@/shared/ui/molecules/CardSection';
import { FileDropZone } from '@/shared/ui/molecules/FileDropZone';
import { useStatementActions } from '../../application/useStatements';
import type { StatementImportResult } from '../../application/statementUseCases';
import { initialChoices, summarizeChoices, unresolvedCount } from '../../domain/importPlan';
import type { ImportPlan, MerchantChoice, SkipReason } from '../../domain/importPlan';
import type { ParseStatementError } from '../../domain/revolutStatement';
import { MerchantRow } from '../MerchantRow';
import './StatementImportCard.scss';

// Un relevé de plusieurs mois reste très en dessous : au-delà, ce n'est pas un bon fichier.
const MAX_FILE_BYTES = 5 * 1024 * 1024;

type ReadError = ParseStatementError | 'tooLarge' | 'readFailed';
type State =
  | { step: 'idle' }
  | { step: 'reading' }
  | { step: 'preview'; plan: ImportPlan; choices: Record<string, MerchantChoice | undefined> }
  | { step: 'importing' }
  | { step: 'done'; result: StatementImportResult }
  | { step: 'error'; error: ReadError };

const SKIP_ORDER: SkipReason[] = [
  'pending',
  'notCompleted',
  'foreignCurrency',
  'topUp',
  'incoming',
  'otherType',
  'outsideStay',
  'alreadyImported',
];

/** Importe un relevé Revolut : aperçu, catégorie de chaque commerçant à confirmer, puis import. */
export function StatementImportCard() {
  const { t } = useTranslation('settings');
  const { isDemo } = useAppServices();
  const catalog = useCatalog();
  const actions = useStatementActions();
  const [state, setState] = useState<State>({ step: 'idle' });

  const read = async (file: File) => {
    if (file.size > MAX_FILE_BYTES) return setState({ step: 'error', error: 'tooLarge' });
    setState({ step: 'reading' });
    try {
      const preview = await actions.preview(await file.text());
      setState(
        preview.ok
          ? { step: 'preview', plan: preview.plan, choices: initialChoices(preview.plan) }
          : { step: 'error', error: preview.error },
      );
    } catch (error) {
      console.error(error);
      setState({ step: 'error', error: 'readFailed' });
    }
  };

  const confirm = async (plan: ImportPlan, choices: Record<string, MerchantChoice | undefined>) => {
    setState({ step: 'importing' });
    try {
      setState({ step: 'done', result: await actions.importPlan(plan, choices) });
    } catch (error) {
      console.error(error);
      setState({ step: 'error', error: 'readFailed' });
    }
  };

  return (
    <CardSection title={t('statement.title')}>
      <p className="statement-import__text">{t('statement.text')}</p>

      <FileDropZone
        label={t('statement.choose')}
        hint={t('statement.drop')}
        accept=".csv,text/csv,text/plain"
        disabled={isDemo || state.step === 'reading' || state.step === 'importing'}
        onFile={(file) => void read(file)}
      />
      {isDemo && <p className="statement-import__text">{t('data.demoNotice')}</p>}

      <div role="status" aria-live="polite">
        {state.step === 'reading' && <p>{t('statement.reading')}</p>}
        {state.step === 'importing' && <p>{t('statement.importing')}</p>}
      </div>

      {state.step === 'preview' && catalog && (
        <Preview
          plan={state.plan}
          choices={state.choices}
          catalog={catalog}
          onChoice={(key, choice) =>
            setState((current) =>
              current.step === 'preview'
                ? { ...current, choices: { ...current.choices, [key]: choice } }
                : current,
            )
          }
          onConfirm={() => void confirm(state.plan, state.choices)}
          onCancel={() => setState({ step: 'idle' })}
        />
      )}

      {state.step === 'done' && (
        <div className="statement-import__done" role="status">
          <h3 className="statement-import__title">{t('statement.done.title')}</h3>
          <p className="statement-import__figures">
            {t('statement.done.summary', {
              count: state.result.imported,
              amount: formatMoney(state.result.total),
            })}
          </p>
          {state.result.learnedRules > 0 && (
            <p>{t('statement.done.learned', { count: state.result.learnedRules })}</p>
          )}
          {state.result.skipped > 0 && (
            <p>{t('statement.done.skipped', { count: state.result.skipped })}</p>
          )}
          <Link className="statement-import__link" to="/history">
            {t('statement.done.seeHistory')}
          </Link>
        </div>
      )}

      {state.step === 'error' && (
        <p className="statement-import__error" role="alert">
          {t(`statement.errors.${state.error}`)}
        </p>
      )}
    </CardSection>
  );
}

interface PreviewProps {
  plan: ImportPlan;
  choices: Record<string, MerchantChoice | undefined>;
  catalog: NonNullable<ReturnType<typeof useCatalog>>;
  onChoice: (key: string, choice: MerchantChoice | undefined) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

function Preview({ plan, choices, catalog, onChoice, onConfirm, onCancel }: PreviewProps) {
  const { t } = useTranslation('settings');
  const remaining = unresolvedCount(plan, choices);
  const { count, total } = useMemo(() => summarizeChoices(plan, choices), [plan, choices]);

  const skipped = SKIP_ORDER.filter((reason) => plan.skipped[reason] > 0);
  const types = Object.keys(plan.ignoredTypes).join(', ');

  return (
    <div className="statement-import__preview">
      <h3 className="statement-import__title">{t('statement.preview.title')}</h3>

      {plan.groups.length === 0 ? (
        <p>{t('statement.preview.nothing')}</p>
      ) : (
        <>
          <p className="statement-import__figures">
            {t('statement.preview.summary', {
              count: plan.candidateCount,
              amount: formatMoney(plan.total),
            })}
          </p>
          <p role="status">
            {remaining > 0
              ? t('statement.preview.toClassify', { count: remaining })
              : t('statement.preview.allClassified')}
          </p>
        </>
      )}

      {skipped.length > 0 || plan.unreadableRows > 0 ? (
        <div className="statement-import__skipped">
          <h4 className="statement-import__subtitle">{t('statement.preview.skippedTitle')}</h4>
          <ul>
            {skipped.map((reason) => (
              <li key={reason}>
                {t(`statement.preview.skipped.${reason}`, { count: plan.skipped[reason], types })}
              </li>
            ))}
            {plan.unreadableRows > 0 && (
              <li>{t('statement.preview.unreadable', { count: plan.unreadableRows })}</li>
            )}
          </ul>
        </div>
      ) : null}

      {plan.groups.length > 0 && (
        <>
          <h4 className="statement-import__subtitle">{t('statement.preview.merchantsTitle')}</h4>
          <p className="statement-import__hint">{t('statement.preview.merchantsHint')}</p>
          <ul className="statement-import__merchants">
            {plan.groups.map((group) => (
              <MerchantRow
                key={group.key}
                group={group}
                choice={choices[group.key]}
                catalog={catalog}
                onChange={(choice) => onChoice(group.key, choice)}
              />
            ))}
          </ul>
        </>
      )}

      <div className="statement-import__buttons">
        {plan.groups.length > 0 && (
          <Button disabled={remaining > 0 || count === 0} onClick={onConfirm}>
            {t('statement.preview.confirm', { count })}
            {count > 0 && ` · ${formatMoney(total)}`}
          </Button>
        )}
        <Button variant="secondary" onClick={onCancel}>
          {t('statement.preview.cancel')}
        </Button>
      </div>
    </div>
  );
}
