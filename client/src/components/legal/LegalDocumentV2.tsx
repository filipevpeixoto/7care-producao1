import { ArrowLeft, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

type LegalSection = {
  id: string;
  title: string;
  content: string;
  items?: string[];
};

type LegalSummaryItem = {
  icon: LucideIcon;
  label: string;
  value: string;
};

interface LegalDocumentV2Props {
  badge: string;
  kicker: string;
  updatedLabel: string;
  intro: string;
  summaryItems: LegalSummaryItem[];
  sections: LegalSection[];
  backLabel: string;
  onBack: () => void;
}

export const LegalDocumentV2 = ({
  badge,
  kicker,
  updatedLabel,
  intro,
  summaryItems,
  sections,
  backLabel,
  onBack,
}: LegalDocumentV2Props) => {
  return (
    <div className="space-y-6">
      <div className="p7-legal-meta">
        <span className="p7-pill soft">{badge}</span>
        <p className="text-sm text-[var(--p7-text-3)]">{updatedLabel}</p>
      </div>

      <div className="p7-legal-hero">
        <div>
          <div className="p7-legal-kicker">{kicker}</div>
          <p className="p7-legal-intro">{intro}</p>
        </div>

        <div className="p7-legal-summary-grid">
          {summaryItems.map((item) => (
            <div key={item.label} className="p7-legal-summary-card">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-[14px] bg-[color-mix(in_oklab,var(--v2-gold)_12%,transparent)] text-[var(--v2-gold)]">
                <item.icon className="h-4 w-4" />
              </div>
              <div className="text-sm font-semibold text-[var(--p7-text)]">{item.value}</div>
              <div className="mt-1 text-[0.74rem] leading-[1.45] text-[var(--p7-text-3)]">
                {item.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="p7-legal-nav">
        {sections.map((section, index) => (
          <a key={section.id} href={`#${section.id}`} className="p7-legal-nav-chip">
            {index + 1}. {section.title}
          </a>
        ))}
      </div>

      <div className="p7-legal-sections">
        {sections.map((section, index) => (
          <section key={section.id} id={section.id} className="p7-legal-section">
            <div className="p7-legal-section-index">{String(index + 1).padStart(2, '0')}</div>
            <div className="space-y-3">
              <h2 className="p7-legal-section-title">{section.title}</h2>
              <p className="p7-legal-section-body">{section.content}</p>
              {section.items?.length ? (
                <ul className="p7-legal-list">
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          </section>
        ))}
      </div>

      <div className="border-t border-[var(--p7-border)] pt-5">
        <Button onClick={onBack} className="w-full sm:w-auto">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {backLabel}
        </Button>
      </div>
    </div>
  );
};
