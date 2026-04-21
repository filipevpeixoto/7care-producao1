import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Home, ArrowLeft, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { uiLogger } from '@/lib/logger';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';
import { PublicPageV2 } from '@/components/layout/v2/PublicPageV2';

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { skin } = useTheme();

  useEffect(() => {
    // Log apenas em desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      uiLogger.error('404 Error: User attempted to access non-existent route:', location.pathname);
    }
  }, [location.pathname]);

  if (skin === 'v2') {
    return (
      <PublicPageV2
        title={t('notFound.title')}
        subtitle="Não encontramos esta página, mas o restante da jornada continua disponível."
        icon={Search}
        backLabel={t('common.back')}
      >
        <div className="p7-card p7-card-p text-center">
          <div className="mx-auto mb-6 flex max-w-[22rem] flex-col items-center gap-4">
            <div className="relative flex h-40 w-40 items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_top,oklch(0.92_0.03_258),transparent_72%)]" />
              <div className="absolute inset-[16%] rounded-[30px] border border-[var(--p7-border)] bg-[linear-gradient(180deg,var(--p7-card),var(--p7-surface-2))] shadow-[var(--shadow-card)]" />
              <div className="absolute inset-x-[32%] top-[26%] h-10 rounded-full bg-[color-mix(in_oklab,var(--v2-blue)_16%,transparent)] blur-sm" />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-[24px] border border-[color-mix(in_oklab,var(--v2-blue)_24%,transparent)] bg-[color-mix(in_oklab,var(--v2-blue)_8%,var(--p7-card))] text-[var(--v2-blue)]">
                <Search className="h-9 w-9" />
              </div>
              <div className="absolute bottom-3 flex items-center gap-2 rounded-full border border-[var(--p7-border)] bg-[var(--p7-card)] px-4 py-2 shadow-[var(--shadow-card)]">
                <span className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--p7-text-3)]">
                  Erro
                </span>
                <span className="v2-heading text-[1rem] text-[var(--p7-text)]">404</span>
              </div>
            </div>

            <span className="p7-pill soft">Rota não encontrada</span>
          </div>

          <div className="space-y-3">
            <p className="text-[var(--p7-text-2)]">{t('notFound.description')}</p>
            <p className="mx-auto max-w-[44ch] text-sm leading-[1.6] text-[var(--p7-text-3)]">
              {t('notFound.path')}{' '}
              <code className="rounded-full bg-[var(--p7-surface-2)] px-3 py-1 text-[var(--p7-text)]">
                {location.pathname}
              </code>
            </p>
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button variant="outline" onClick={() => navigate(-1)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('common.back')}
            </Button>
            <Button onClick={() => navigate('/dashboard')}>
              <Home className="mr-2 h-4 w-4" />
              {t('notFound.goHome')}
            </Button>
          </div>
        </div>
      </PublicPageV2>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 p-4">
      <div className="text-center space-y-6 max-w-md">
        {/* Ícone animado */}
        <div className="relative">
          <div className="text-9xl font-bold text-white/10 select-none">404</div>
          <Search className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 text-blue-400 animate-pulse" />
        </div>

        {/* Mensagem */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white">{t('notFound.title')}</h1>
          <p className="text-blue-200/80">{t('notFound.description')}</p>
          <p className="text-sm text-blue-300/60">
            {t('notFound.path')}{' '}
            <code className="bg-white/10 px-2 py-1 rounded">{location.pathname}</code>
          </p>
        </div>

        {/* Botões de ação */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('common.back')}
          </Button>
          <Button
            onClick={() => navigate('/dashboard')}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Home className="w-4 h-4 mr-2" />
            {t('notFound.goHome')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
