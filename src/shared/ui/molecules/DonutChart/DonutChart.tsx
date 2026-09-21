import type { ReactNode } from 'react';
import { donutSegments } from '@/shared/lib/chart';
import './DonutChart.scss';

const RADIUS = 46;
const STROKE = 16;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const SEGMENT_GAP = 1.5;

export interface DonutSlice {
  value: number;
  /** Valeur CSS, ex. `var(--category-groceries)`. */
  color: string;
}

export interface DonutChartProps {
  slices: readonly DonutSlice[];
  /** Décrit le graphique pour les lecteurs d'écran (la légende à côté détaille les valeurs). */
  label: string;
  /** Contenu au centre (le total, par exemple). */
  children?: ReactNode;
}

export function DonutChart({ slices, label, children }: DonutChartProps) {
  const segments = donutSegments(
    slices.map((slice) => slice.value),
    CIRCUMFERENCE,
    SEGMENT_GAP,
  );
  return (
    <div className="donut-chart">
      <svg className="donut-chart__svg" viewBox="0 0 120 120" role="img" aria-label={label}>
        {/* Piste grise : reste visible quand il n'y a aucune dépense. */}
        <circle
          className="donut-chart__track"
          cx={60}
          cy={60}
          r={RADIUS}
          fill="none"
          strokeWidth={STROKE}
        />
        <g transform="rotate(-90 60 60)">
          {segments.map((segment, index) => (
            <circle
              key={index}
              cx={60}
              cy={60}
              r={RADIUS}
              fill="none"
              strokeWidth={STROKE}
              stroke={slices[index]?.color}
              strokeDasharray={`${segment.length} ${CIRCUMFERENCE - segment.length}`}
              strokeDashoffset={-segment.offset}
            />
          ))}
        </g>
      </svg>
      {children && <div className="donut-chart__center">{children}</div>}
    </div>
  );
}
