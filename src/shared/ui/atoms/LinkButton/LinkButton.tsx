import clsx from 'clsx';
import { Link } from 'react-router-dom';
import type { LinkProps } from 'react-router-dom';
import '../Button/Button.scss';

export interface LinkButtonProps extends LinkProps {
  variant?: 'primary' | 'secondary' | 'danger';
}

/** Un lien qui ressemble à un bouton : c'est une navigation, donc un `<a>`. */
export function LinkButton({ variant = 'primary', className, ...rest }: LinkButtonProps) {
  return <Link className={clsx('button', `button--variant-${variant}`, className)} {...rest} />;
}
