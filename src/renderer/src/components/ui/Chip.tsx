import type { ReactNode } from 'react';
import './ui.css';

interface ChipProps {
  tone?: 'accent' | 'neutral' | 'warning';
  children: ReactNode;
}

export function Chip({ tone = 'accent', children }: ChipProps) {
  const className = tone === 'accent' ? 'chip' : `chip chip--${tone}`;
  return <span className={className}>{children}</span>;
}
