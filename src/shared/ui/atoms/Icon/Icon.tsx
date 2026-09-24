export type IconName =
  | 'home'
  | 'stats'
  | 'list'
  | 'tag'
  | 'settings'
  | 'plus'
  | 'close'
  | 'check'
  | 'calendar'
  | 'backspace'
  | 'chevronLeft'
  | 'chevronRight'
  | 'chevronDown'
  | 'search'
  | 'pencil'
  | 'trash'
  | 'arrowUp'
  | 'arrowDown'
  | 'pin'
  | 'basket'
  | 'smile'
  | 'tram'
  | 'plane'
  | 'repeat'
  | 'heart'
  | 'bag'
  | 'dots';

interface IconShape {
  paths: string[];
  circles?: [cx: number, cy: number, r: number][];
}

const SHAPES: Record<IconName, IconShape> = {
  home: { paths: ['m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z'] },
  stats: { paths: ['M4 20V10M10 20V4M16 20v-8M22 20H2'] },
  list: { paths: ['M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01'] },
  tag: {
    paths: ['M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z'],
    circles: [[8, 8, 1]],
  },
  settings: {
    paths: ['M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1'],
    circles: [
      [15, 6, 2],
      [9, 12, 2],
      [17, 18, 2],
    ],
  },
  plus: { paths: ['M12 5v14M5 12h14'] },
  close: { paths: ['M18 6 6 18M6 6l12 12'] },
  check: { paths: ['M20 6 9 17l-5-5'] },
  calendar: {
    paths: [
      'M5 6h14a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z',
      'M8 3v4M16 3v4M3 11h18',
    ],
  },
  chevronLeft: { paths: ['m15 18-6-6 6-6'] },
  chevronRight: { paths: ['m9 18 6-6-6-6'] },
  chevronDown: { paths: ['m6 9 6 6 6-6'] },
  search: { paths: ['m21 21-4.3-4.3'], circles: [[11, 11, 7]] },
  arrowUp: { paths: ['M12 19V5', 'm5 12 7-7 7 7'] },
  arrowDown: { paths: ['M12 5v14', 'm19 12-7 7-7-7'] },
  pin: { paths: ['M12 17v5', 'M9 3h6l-1 6 4 4v2H6v-2l4-4-1-6z'] },
  pencil: { paths: ['M17 3a2.8 2.8 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z'] },
  trash: {
    paths: [
      'M3 6h18',
      'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2',
      'M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6',
      'M10 11v6M14 11v6',
    ],
  },
  basket: {
    paths: ['M8.5 11 12 4l3.5 7', 'M4 11h16l-1.6 8.2a2 2 0 0 1-2 1.6H7.6a2 2 0 0 1-2-1.6L4 11z'],
  },
  smile: {
    paths: ['M8 14.5a5 5 0 0 0 8 0', 'M9 9.5h.01M15 9.5h.01'],
    circles: [[12, 12, 9]],
  },
  tram: {
    paths: [
      'M6 3h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z',
      'M4 10h16M8 21l2-5M16 21l-2-5M8 13h.01M16 13h.01',
    ],
  },
  plane: { paths: ['m22 2-7 20-4-9-9-4 20-7z', 'M22 2 11 13'] },
  repeat: {
    paths: [
      'm17 2 4 4-4 4',
      'M3 11V9a4 4 0 0 1 4-4h14',
      'm7 22-4-4 4-4',
      'M21 13v2a4 4 0 0 1-4 4H3',
    ],
  },
  heart: {
    paths: [
      'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z',
    ],
  },
  bag: {
    paths: [
      'M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z',
      'M3 6h18',
      'M16 10a4 4 0 0 1-8 0',
    ],
  },
  dots: {
    paths: [],
    circles: [
      [5, 12, 1.5],
      [12, 12, 1.5],
      [19, 12, 1.5],
    ],
  },
  backspace: {
    paths: ['M21 5H9l-7 7 7 7h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1z', 'm18 9-6 6M12 9l6 6'],
  },
};

export interface IconProps {
  name: IconName;
  size?: number;
  strokeWidth?: number;
}

/** Icône décorative : le libellé est toujours porté par le composant parent. */
export function Icon({ name, size = 24, strokeWidth = 1.9 }: IconProps) {
  const { paths, circles = [] } = SHAPES[name];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {paths.map((d) => (
        <path key={d} d={d} />
      ))}
      {circles.map(([cx, cy, r]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} />
      ))}
    </svg>
  );
}
