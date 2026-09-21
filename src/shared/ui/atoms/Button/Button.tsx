import clsx from 'clsx';
import type { ButtonHTMLAttributes } from 'react';
import './Button.scss';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
}

export function Button({ variant = 'primary', type = 'button', className, ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={clsx('button', `button--variant-${variant}`, className)}
      {...rest}
    />
  );
}
