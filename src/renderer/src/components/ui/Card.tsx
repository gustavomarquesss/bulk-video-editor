import type { ReactNode } from 'react';
import './ui.css';

interface CardProps {
  title?: string;
  /** Conteúdo à direita do título (ex.: um chip de status). */
  aside?: ReactNode;
  children: ReactNode;
}

export function Card({ title, aside, children }: CardProps) {
  return (
    <section className="card">
      {title && (
        <header className="card__header">
          <h2 className="card__title">{title}</h2>
          {aside}
        </header>
      )}
      {children}
    </section>
  );
}
