import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import type { To } from 'react-router-dom';
import { useFocusManagerPanel } from '@/app/panels';
import { useToday } from '@/app/useToday';
import { useCatalog } from '@/domains/categorization/react';
import type { CategoryId, SubcategoryId } from '@/domains/categorization';
import { useMonthExpenses } from '@/domains/expenses/react';
import {
  FocusComposition,
  FocusEntries,
  FocusSummary,
  FocusSwitcher,
  useFocusLabels,
  WeeklyBars,
} from '@/domains/focus/detail';
import { useFocuses } from '@/domains/focus/react';
import { focusComposition, focusStats } from '@/domains/focus';
import type { Focus } from '@/domains/focus';
import { useSelectedMonth, useStay } from '@/domains/stay/react';
import { formatMonthTitle } from '@/shared/i18n/format';
import { IconLink } from '@/shared/ui/atoms/IconLink';
import { LinkButton } from '@/shared/ui/atoms/LinkButton';
import { EmptyState } from '@/shared/ui/molecules/EmptyState';
import './FocusPage.scss';

/** L'historique filtré sur ce focus (une sous-catégorie passe par la recherche : l'historique n'a pas de filtre dédié). */
function historyFor(focus: Focus, name: string, monthSearch: string): To {
  const params = new URLSearchParams(monthSearch);
  if (focus.kind === 'category') params.set('category', focus.targetId);
  else if (focus.kind === 'tag') params.set('tag', focus.targetId);
  else params.set('q', name);
  return { pathname: '/history', search: `?${params.toString()}` };
}

export function FocusPage() {
  const { t } = useTranslation('focus');
  const { focusId } = useParams();
  const today = useToday();
  const stay = useStay();
  const { month } = useSelectedMonth(stay, today);
  const focuses = useFocuses();
  const catalog = useCatalog();
  const expenses = useMonthExpenses(month);
  const describe = useFocusLabels(catalog);
  const manager = useFocusManagerPanel();

  const monthSearch = `?month=${month}`;
  // Les focus dont la cible a disparu ne sont pas affichés.
  const visible = useMemo(
    () => (focuses ?? []).filter((focus) => describe(focus)),
    [focuses, describe],
  );
  // Sans identifiant (ou avec un identifiant périmé), on affiche le premier focus : pas de
  // redirection, qui pourrait écraser une navigation de l'utilisateur pendant le chargement.
  const selected = visible.find((focus) => focus.id === focusId) ?? visible[0];
  const description = selected ? describe(selected) : null;

  const stats = useMemo(
    () => selected && expenses && focusStats({ target: selected, expenses, month, today }),
    [selected, expenses, month, today],
  );
  const composition = useMemo(
    () =>
      selected &&
      expenses &&
      catalog &&
      focusComposition({
        target: selected,
        expenses,
        parentCategoryOf: (id: SubcategoryId): CategoryId | undefined =>
          catalog.subcategories.find((s) => s.id === id)?.categoryId,
      }),
    [selected, expenses, catalog],
  );

  const header = (
    <header className="focus-page__header">
      <IconLink
        icon="chevronLeft"
        label={t('page.back')}
        to={{ pathname: '/', search: monthSearch }}
      />
      <div>
        <h1 className="focus-page__title">{t('page.title')}</h1>
        <p className="focus-page__month">{formatMonthTitle(month)}</p>
      </div>
    </header>
  );

  if (!focuses || !catalog || !expenses) return <div className="focus-page">{header}</div>;

  if (visible.length === 0) {
    return (
      <div className="focus-page">
        {header}
        <EmptyState
          title={t('empty.title')}
          text={t('empty.text')}
          action={
            <LinkButton to={manager.openTo} state={manager.openState}>
              {t('empty.action')}
            </LinkButton>
          }
        />
      </div>
    );
  }

  return (
    <div className="focus-page">
      {header}
      <FocusSwitcher
        label={t('switcher.label')}
        addLabel={t('switcher.add')}
        addTo={manager.openTo}
        addState={manager.openState}
        items={visible.flatMap((focus) => {
          const item = describe(focus);
          return item
            ? [
                {
                  id: focus.id,
                  name: item.name,
                  to: { pathname: `/focus/${focus.id}`, search: monthSearch },
                  current: focus.id === selected?.id,
                },
              ]
            : [];
        })}
      />

      {selected && description && stats && (
        <div className="focus-page__content">
          <div className="focus-page__summary">
            <FocusSummary description={description} stats={stats} month={month} />
          </div>
          <div
            className="focus-page__weekly"
            style={{ '--focus-color': description.color } as React.CSSProperties}
          >
            <WeeklyBars weeks={stats.weeks} month={month} />
          </div>
          {composition && (
            <div className="focus-page__composition">
              <FocusComposition
                composition={composition}
                catalog={catalog}
                focusName={description.name}
                color={description.color}
              />
            </div>
          )}
          <div className="focus-page__entries">
            <FocusEntries
              entries={stats.entries}
              today={today}
              seeAllTo={historyFor(selected, description.name, monthSearch)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
