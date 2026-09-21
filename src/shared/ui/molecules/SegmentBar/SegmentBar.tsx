import type { CSSProperties } from 'react';
import './SegmentBar.scss';

export interface Segment {
  value: number;
  /** Valeur CSS, ex. `var(--category-groceries)`. */
  color: string;
  /** Le segment principal (« Viande ») est plein, les autres (« le reste ») sont plus clairs. */
  emphasis?: boolean;
}

export interface SegmentBarProps {
  segments: readonly Segment[];
  /** Décrit la barre pour les lecteurs d'écran ; la légende à côté détaille les valeurs. */
  label: string;
}

/** Une barre découpée en parts proportionnelles. */
export function SegmentBar({ segments, label }: SegmentBarProps) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  return (
    <div className="segment-bar" role="img" aria-label={label}>
      {total > 0 &&
        segments
          .filter((segment) => segment.value > 0)
          .map((segment, index) => (
            <span
              key={index}
              className={
                segment.emphasis
                  ? 'segment-bar__part segment-bar__part--emphasis'
                  : 'segment-bar__part'
              }
              style={{ '--part-color': segment.color, flexGrow: segment.value } as CSSProperties}
            />
          ))}
    </div>
  );
}
