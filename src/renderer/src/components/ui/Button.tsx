import type { ButtonHTMLAttributes } from 'react';
import './ui.css';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  block?: boolean;
}

export function Button({
  variant = 'primary',
  block = false,
  className = '',
  ...rest
}: ButtonProps) {
  const classes = ['button', `button--${variant}`, block && 'button--block', className]
    .filter(Boolean)
    .join(' ');
  return <button type="button" className={classes} {...rest} />;
}
