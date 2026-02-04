import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { usePageHelp, HelpItem } from '@/hooks/usePageHelp';
import { useAppTour } from '@/hooks/useAppTour';
import {
  ChevronRight,
  Play,
  Info,
  ExternalLink,
  Navigation,
  MousePointerClick,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageHelpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Modal índice de funcionalidades da página atual
 * Permite navegação rápida e acesso ao tour guiado
 */
export function PageHelpModal({ open, onOpenChange }: PageHelpModalProps) {
  const navigate = useNavigate();
  const { pageHelp, executeAction, isAdmin } = usePageHelp();
  const { startTour } = useAppTour();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const PageIcon = pageHelp.pageIcon;

  /**
   * Manipula clique em um item do índice
   */
  const handleItemClick = (item: HelpItem) => {
    const shouldClose = executeAction(item, navigate);
    if (shouldClose) {
      onOpenChange(false);
    }
  };

  /**
   * Inicia o tour guiado
   */
  const handleStartTour = () => {
    onOpenChange(false);
    // Pequeno delay para fechar o modal antes de iniciar o tour
    setTimeout(() => {
      startTour();
    }, 300);
  };

  /**
   * Retorna o ícone de ação baseado no tipo
   */
  const getActionIcon = (action: HelpItem['action']) => {
    switch (action) {
      case 'navigate':
        return <ExternalLink className="w-4 h-4" />;
      case 'scroll':
      case 'highlight':
        return <Navigation className="w-4 h-4" />;
      case 'info':
        return <Info className="w-4 h-4" />;
      default:
        return <ChevronRight className="w-4 h-4" />;
    }
  };

  /**
   * Retorna a cor do badge baseado no conteúdo
   */
  const getBadgeVariant = (badge: string) => {
    switch (badge.toLowerCase()) {
      case 'admin':
        return 'default';
      case 'superadmin':
        return 'destructive';
      case 'ação':
      case 'novo':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader className="text-left pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
              <PageIcon className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <SheetTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {pageHelp.pageTitle}
              </SheetTitle>
              <SheetDescription className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                {pageHelp.pageDescription}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(85vh-180px)] pr-4">
          {/* Lista de Funcionalidades */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              O que você pode fazer aqui
            </h3>

            {pageHelp.items.map((item, index) => {
              const ItemIcon = item.icon;
              const isHovered = hoveredItem === item.id;
              const isClickable = item.action !== 'info';

              return (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  onMouseEnter={() => setHoveredItem(item.id)}
                  onMouseLeave={() => setHoveredItem(null)}
                  disabled={!isClickable}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200',
                    isClickable
                      ? 'hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:shadow-md cursor-pointer active:scale-[0.98]'
                      : 'cursor-default opacity-75',
                    isHovered && isClickable && 'bg-blue-50 dark:bg-blue-900/20 shadow-md'
                  )}
                >
                  {/* Ícone */}
                  <div
                    className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors',
                      isHovered && isClickable
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                    )}
                  >
                    <ItemIcon className="w-5 h-5" />
                  </div>

                  {/* Conteúdo */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
                        {item.title}
                      </span>
                      {item.badge && (
                        <Badge
                          variant={getBadgeVariant(item.badge) as any}
                          className="text-[10px] px-1.5 py-0"
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {item.description}
                    </p>
                  </div>

                  {/* Indicador de ação */}
                  {isClickable && (
                    <div
                      className={cn(
                        'flex-shrink-0 transition-colors',
                        isHovered ? 'text-blue-500' : 'text-gray-400'
                      )}
                    >
                      {getActionIcon(item.action)}
                    </div>
                  )}
                </button>
              );
            })}

            {/* Mensagem se não houver itens */}
            {pageHelp.items.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Nenhuma funcionalidade disponível nesta página.</p>
              </div>
            )}
          </div>

          {/* Dica de navegação */}
          <div className="mt-6 p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl">
            <div className="flex items-start gap-3">
              <MousePointerClick className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Dica de navegação
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Toque em qualquer item acima para ir diretamente até ele. Os itens com{' '}
                  <ExternalLink className="w-3 h-3 inline" /> navegam para outra página, e os com{' '}
                  <Navigation className="w-3 h-3 inline" /> rolam até o elemento nesta página.
                </p>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Botão do Tour */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent pt-8">
          <Separator className="mb-4" />
          <Button
            onClick={handleStartTour}
            className="w-full h-12 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
          >
            <Play className="w-5 h-5 mr-2" />
            Iniciar Tour Guiado
          </Button>
          <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-2">
            O tour mostrará passo a passo como usar cada funcionalidade
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
