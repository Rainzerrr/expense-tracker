import { useTranslation } from 'react-i18next';
import { StayProgressSummary } from '@/app/StayProgressSummary';
import { useFocusManagerPanel, useNewExpensePanel } from '@/app/panels';
import { useToday } from '@/app/useToday';
import {
  CategoryBreakdown,
  CumulativeChart,
  MonthHeader,
  SummaryCard,
  useMonthSummary,
} from '@/domains/analytics/react';
import { BackupReminder } from '@/domains/backup/react';
import { useCatalog } from '@/domains/categorization/react';
import { RecentExpenses } from '@/domains/expenses/react';
import { FocusCards, useFocuses } from '@/domains/focus/react';
import { stayDayNumber, stayLengthDays, stayProgress } from '@/domains/stay';
import { useSelectedMonth, useStay, useStayTotal } from '@/domains/stay/react';
import { formatMonthName, formatMonthTitle } from '@/shared/i18n/format';
import { daysInMonth } from '@/shared/lib/time';
import { LinkButton } from '@/shared/ui/atoms/LinkButton';
import { CardSection } from '@/shared/ui/molecules/CardSection';
import './DashboardPage.scss';

const HISTORY_PATH = '/history';

export function DashboardPage() {
  const { t } = useTranslation('analytics');
  const today = useToday();
  const stay = useStay();
  const panel = useNewExpensePanel();
  const focusPanel = useFocusManagerPanel();
  const focuses = useFocuses();
  const { month, previous, next, select } = useSelectedMonth(stay, today);
  const catalog = useCatalog();
  const { expenses, summary } = useMonthSummary(month, today);
  const stayTotal = useStayTotal(stay);

  return (
    <div className="dashboard-page">
      <div className="dashboard-page__header">
        <BackupReminder />
        <MonthHeader
          eyebrow={t('dashboard.stayEyebrow', {
            day: stayDayNumber(stay, today),
            total: stayLengthDays(stay),
          })}
          title={formatMonthTitle(month)}
          previousLabel={t('dashboard.previousMonth')}
          nextLabel={t('dashboard.nextMonth')}
          onPrevious={previous ? () => select(previous) : undefined}
          onNext={next ? () => select(next) : undefined}
          action={
            <LinkButton to={panel.openTo} state={panel.openState}>
              {t('dashboard.newExpense')}
            </LinkButton>
          }
        />
      </div>

      {catalog && expenses && summary && focuses && stayTotal !== undefined && (
        <>
          <div className="dashboard-page__summary">
            <SummaryCard
              summary={summary}
              monthName={formatMonthName(month)}
              daysInMonth={daysInMonth(month)}
              stayTotal={stayTotal}
              stayPercent={Math.round(stayProgress(stay, today) * 100)}
            >
              <StayProgressSummary />
            </SummaryCard>
          </div>

          <CardSection className="dashboard-page__breakdown" title={t('breakdown.title')}>
            <CategoryBreakdown
              breakdown={summary.breakdown}
              catalog={catalog}
              variableSpent={summary.projection.variableSpent}
            />
          </CardSection>

          <CardSection
            className="dashboard-page__rhythm"
            title={t('rhythm.title')}
            subtitle={t('rhythm.subtitle')}
          >
            <CumulativeChart cumulative={summary.cumulative} />
          </CardSection>

          <div className="dashboard-page__focus">
            <FocusCards
              focuses={focuses}
              catalog={catalog}
              expenses={expenses}
              month={month}
              today={today}
              focusTo={(id) => ({ pathname: `/focus/${id}`, search: `?month=${month}` })}
              manageTo={focusPanel.openTo}
              manageState={focusPanel.openState}
            />
          </div>

          <div className="dashboard-page__recent">
            <RecentExpenses
              expenses={expenses}
              catalog={catalog}
              today={today}
              historyHref={HISTORY_PATH}
            />
          </div>
        </>
      )}
    </div>
  );
}
