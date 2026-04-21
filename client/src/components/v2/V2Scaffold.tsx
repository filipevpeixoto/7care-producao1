import type { ReactNode } from 'react';

interface V2PageStackProps {
  children: ReactNode;
}

interface V2SectionCardProps {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  padded?: boolean;
  className?: string;
}

interface V2StatGridProps {
  children: ReactNode;
  columns?: 2 | 3 | 4;
}

export const V2PageStack = ({ children }: V2PageStackProps) => (
  <div className="v2-page-stack">{children}</div>
);

export const V2SectionCard = ({
  title,
  subtitle,
  action,
  children,
  padded = true,
  className = '',
}: V2SectionCardProps) => (
  <section className={`v2-section-card ${className}`.trim()}>
    {(title || subtitle || action) && (
      <header className="v2-section-head">
        <div className="min-w-0">
          {title ? <h2 className="v2-section-title">{title}</h2> : null}
          {subtitle ? <p className="v2-section-subtitle">{subtitle}</p> : null}
        </div>
        {action ? <div className="v2-section-action">{action}</div> : null}
      </header>
    )}
    <div className={padded ? 'v2-section-body' : 'v2-section-body v2-section-body--flush'}>
      {children}
    </div>
  </section>
);

export const V2StatGrid = ({ children, columns = 4 }: V2StatGridProps) => (
  <div className={`v2-stat-grid cols-${columns}`}>{children}</div>
);

export const V2StatTile = ({
  value,
  label,
  tone = 'soft',
}: {
  value: ReactNode;
  label: ReactNode;
  tone?: 'navy' | 'soft' | 'gold' | 'red';
}) => (
  <div className={`v2-stat-tile ${tone}`}>
    <div className="v2-stat-value">{value}</div>
    <div className="v2-stat-label">{label}</div>
  </div>
);
