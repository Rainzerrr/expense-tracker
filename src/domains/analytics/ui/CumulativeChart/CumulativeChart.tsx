import { useTranslation } from 'react-i18next';
import { useContainerWidth } from '@/shared/hooks/useContainerWidth';
import { areaPath, dayTicks, linePath, niceTicks, scaleLinear } from '@/shared/lib/chart';
import { formatMoney } from '@/shared/i18n/format';
import type { MonthlyCumulative } from '../../domain/monthlyCumulative';
import './CumulativeChart.scss';

// Le dessin épouse la largeur réelle de sa carte : les textes gardent donc leur taille.
const FALLBACK_WIDTH = 320;
const MARGIN = { top: 26, right: 12, bottom: 24, left: 34 };
const heightFor = (width: number) => (width >= 520 ? 230 : 176);
/** Largeur approximative de « Aujourd'hui · 550 € » : évite qu'il sorte du cadre à gauche. */
const TODAY_LABEL_WIDTH = 92;

export interface CumulativeChartProps {
  cumulative: MonthlyCumulative;
}

const toEuros = (cents: number) => cents / 100;
const whole = (cents: number) => formatMoney(Math.round(cents), { withCents: false });

/** « Rythme du mois » : cumul hors logement (trait plein) prolongé au rythme actuel (pointillés). */
export function CumulativeChart({ cumulative }: CumulativeChartProps) {
  const { t } = useTranslation('analytics');
  const { actual, projection, daysInMonth } = cumulative;
  const [container, width] = useContainerWidth<HTMLElement>(FALLBACK_WIDTH);
  const height = heightFor(width);
  const plotRight = width - MARGIN.right;
  const plotBottom = height - MARGIN.bottom;

  const today = actual.at(-1);
  const projectedEnd = projection.at(-1);
  const highest = Math.max(today?.amount ?? 0, projectedEnd?.amount ?? 0);
  const ticks = niceTicks(toEuros(highest));

  const x = scaleLinear([1, daysInMonth], [MARGIN.left, plotRight]);
  const y = scaleLinear([0, ticks.at(-1) ?? 1], [plotBottom, MARGIN.top]);
  const toPoint = ({ day, amount }: { day: number; amount: number }) => ({
    x: x(day),
    y: y(toEuros(amount)),
  });

  const actualPoints = actual.map(toPoint);
  const todayPoint = today && toPoint(today);
  const endPoint = projectedEnd && toPoint(projectedEnd);

  const ariaLabel =
    today && projectedEnd
      ? t('rhythm.ariaLabelWithProjection', {
          amount: whole(today.amount),
          day: today.day,
          projected: whole(projectedEnd.amount),
        })
      : t('rhythm.ariaLabelFinal', { amount: whole(today?.amount ?? 0) });

  return (
    <figure ref={container} className="cumulative-chart">
      <div className="cumulative-chart__legend" aria-hidden="true">
        <span className="cumulative-chart__key cumulative-chart__key--actual">
          {t('rhythm.actual')}
        </span>
        <span className="cumulative-chart__key cumulative-chart__key--projection">
          {t('rhythm.projection')}
        </span>
      </div>

      <svg
        className="cumulative-chart__svg"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={ariaLabel}
      >
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              className="cumulative-chart__grid"
              x1={MARGIN.left}
              x2={plotRight}
              y1={y(tick)}
              y2={y(tick)}
            />
            <text
              className="cumulative-chart__tick"
              x={MARGIN.left - 6}
              y={y(tick) + 3}
              textAnchor="end"
            >
              {tick}
            </text>
          </g>
        ))}

        {dayTicks(daysInMonth).map((day) => (
          <text
            key={day}
            className="cumulative-chart__tick"
            x={x(day)}
            y={height - 6}
            textAnchor="middle"
          >
            {day}
          </text>
        ))}

        {actualPoints.length > 1 && (
          <path className="cumulative-chart__area" d={areaPath(actualPoints, plotBottom)} />
        )}
        {actualPoints.length > 1 && (
          <path className="cumulative-chart__line" d={linePath(actualPoints)} />
        )}
        {todayPoint && endPoint && (
          <path className="cumulative-chart__projection" d={linePath([todayPoint, endPoint])} />
        )}

        {todayPoint && today && (
          <>
            <circle className="cumulative-chart__dot" cx={todayPoint.x} cy={todayPoint.y} r={4} />
            {/* Ancré à gauche du point : la projection monte vers la droite et le recouvrirait. */}
            <text
              className="cumulative-chart__label"
              x={Math.max(todayPoint.x + 4, MARGIN.left + TODAY_LABEL_WIDTH)}
              y={todayPoint.y - 10}
              textAnchor="end"
            >
              {t('rhythm.today', { amount: whole(today.amount) })}
            </text>
          </>
        )}
        {endPoint && projectedEnd && (
          <text
            className="cumulative-chart__label cumulative-chart__label--projected"
            x={endPoint.x}
            y={endPoint.y - 8}
            textAnchor="end"
          >
            {t('rhythm.projectedEnd', { amount: whole(projectedEnd.amount) })}
          </text>
        )}
      </svg>
    </figure>
  );
}
