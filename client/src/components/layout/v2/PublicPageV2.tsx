import type { ReactNode } from 'react';
import { ArrowLeft, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PrototypeStatusBar } from '@/pages/v2/prototypeShared';
import { useTransitionNavigate } from '@/hooks/useTransitionNavigate';

interface PublicPageV2Props {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  children: ReactNode;
  backLabel: string;
}

export const PublicPageV2 = ({
  title,
  subtitle,
  icon: Icon,
  children,
  backLabel,
}: PublicPageV2Props) => {
  const navigate = useTransitionNavigate();

  return (
    <div className="p7-stage p7-stage--public min-h-screen bg-background">
      <div className="p7-shell p7-bridge-shell route-page-shell">
        <div className="p7-screen">
          <PrototypeStatusBar />
          <div className="p7-grad-header p7-bridge-header">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="p7-header-label">7care</div>
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-white/14 text-white">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="p7-header-title">{title}</div>
                    <p className="p7-bridge-subtitle">{subtitle}</p>
                  </div>
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
                className="rounded-full bg-white/10 text-white hover:bg-white/20 hover:text-white"
                aria-label={backLabel}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <div className="p7-scroll">
            <div className="p7-bridge p7-legal-content">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
