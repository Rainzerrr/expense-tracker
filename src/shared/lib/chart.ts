/** Pas « rond » (1, 2, 3, 5 × puissance de 10) au moins égal à `raw`. */
function niceStep(raw: number): number {
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const normalized = raw / magnitude;
  const factor = [1, 2, 3, 5, 10].find((candidate) => candidate >= normalized - 1e-9) ?? 10;
  return factor * magnitude;
}

/** Graduations d'un axe vertical : 825 → [0, 300, 600, 900]. Un axe vide reste lisible (0 à 150). */
export function niceTicks(max: number, count = 3): number[] {
  const step = niceStep((max > 0 ? max : 100) / count);
  return Array.from({ length: count + 1 }, (_, index) => index * step);
}

/** Jours affichés sous la courbe : 1, puis tous les 5 jours, puis le dernier jour s'il n'est pas trop proche. */
export function dayTicks(daysInMonth: number): number[] {
  const ticks = [1];
  for (let day = 5; day <= daysInMonth; day += 5) ticks.push(day);
  const last = ticks.at(-1) ?? 1;
  if (daysInMonth - last >= 3) ticks.push(daysInMonth);
  return ticks;
}

export function scaleLinear(
  [domainStart, domainEnd]: readonly [number, number],
  [rangeStart, rangeEnd]: readonly [number, number],
): (value: number) => number {
  const span = domainEnd - domainStart;
  return (value) =>
    span === 0 ? rangeStart : rangeStart + ((value - domainStart) / span) * (rangeEnd - rangeStart);
}

export interface Point {
  x: number;
  y: number;
}

const round = (value: number) => Math.round(value * 100) / 100;

/** Tracé SVG d'une ligne brisée. */
export function linePath(points: readonly Point[]): string {
  return points
    .map(({ x, y }, index) => `${index === 0 ? 'M' : 'L'}${round(x)} ${round(y)}`)
    .join(' ');
}

/** Tracé SVG d'une aire : la ligne, refermée vers la ligne de base. */
export function areaPath(points: readonly Point[], baselineY: number): string {
  const first = points[0];
  const last = points.at(-1);
  if (!first || !last) return '';
  return `${linePath(points)} L${round(last.x)} ${round(baselineY)} L${round(first.x)} ${round(baselineY)} Z`;
}

export interface DonutSegment {
  /** Longueur de l'arc, en unités de circonférence. */
  length: number;
  /** Décalage depuis le point de départ (en haut). */
  offset: number;
}

/**
 * Découpe une circonférence en arcs proportionnels aux valeurs, séparés par un petit espace.
 * Une valeur unique n'a pas d'espace (cercle plein).
 */
export function donutSegments(
  values: readonly number[],
  circumference: number,
  gap = 0,
): DonutSegment[] {
  const total = values.reduce((sum, value) => sum + value, 0);
  if (total <= 0) return [];
  const spacing = values.length > 1 ? gap : 0;
  let offset = 0;
  return values.map((value) => {
    const span = (value / total) * circumference;
    const segment = { length: Math.max(span - spacing, 0), offset };
    offset += span;
    return segment;
  });
}
