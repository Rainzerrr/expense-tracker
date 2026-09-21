import clsx from 'clsx';
import type { ReactNode } from 'react';
import './Heading.scss';

export interface HeadingProps {
  level: 1 | 2 | 3;
  size?: 'lg' | 'md';
  children: ReactNode;
}

export function Heading({ level, size = 'lg', children }: HeadingProps) {
  const Tag = `h${level}` as const;
  return <Tag className={clsx('heading', `heading--size-${size}`)}>{children}</Tag>;
}
