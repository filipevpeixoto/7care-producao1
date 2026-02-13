/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { settingsLogger } from '@/lib/logger';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Settings as SettingsIcon, Save, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MobileHeaderLayout {
  logo: { offsetX: number; offsetY: number };
  welcome: { offsetX: number; offsetY: number };
  actions: { offsetX: number; offsetY: number };
}

const defaultLayout: MobileHeaderLayout = {
  logo: { offsetX: 0, offsetY: 0 },
  welcome: { offsetX: 0, offsetY: 0 },
  actions: { offsetX: 0, offsetY: 0 },
};

export function MobileHeaderLayoutEditor() {
  const { toast } = useToast();
  const [mobileHeaderLayout, setMobileHeaderLayout] = useState<MobileHeaderLayout>(defaultLayout);

  // Load mobile header layout from localStorage
  useEffect(() => {
    settingsLogger.debug('Carregando layout do localStorage...');
    const savedLayout = localStorage.getItem('mobileHeaderLayout');
    settingsLogger.debug('Layout salvo encontrado:', savedLayout);

    if (savedLayout) {
      try {
        const parsedLayout = JSON.parse(savedLayout);
        settingsLogger.debug('Layout parseado com sucesso:', parsedLayout);
        setMobileHeaderLayout(parsedLayout);
      } catch (error) {
        settingsLogger.error('Erro ao carregar layout do mobile header:', error);
      }
    } else {
      settingsLogger.debug('Nenhum layout salvo encontrado, usando padrão');
    }
  }, []);

  // Debug: Log sempre que o layout mudar
  useEffect(() => {
    settingsLogger.debug('Estado do layout atualizado:', mobileHeaderLayout);
  }, [mobileHeaderLayout]);

  const updateMobileHeaderLayout = (
    element: 'logo' | 'welcome' | 'actions',
    axis: 'offsetX' | 'offsetY',
    value: number
  ) => {
    settingsLogger.debug(`Atualizando layout: ${element}.${axis} = ${value}`);
    setMobileHeaderLayout((prev) => {
      const newLayout = {
        ...prev,
        [element]: {
          ...prev[element],
          [axis]: value,
        },
      };
      settingsLogger.debug(`Novo layout:`, newLayout);
      return newLayout;
    });
  };

  const resetMobileHeaderLayout = () => {
    settingsLogger.debug('Resetando layout para valores padrão');
    setMobileHeaderLayout(defaultLayout);
    settingsLogger.debug('Layout resetado:', defaultLayout);
  };

  const saveMobileHeaderLayout = () => {
    settingsLogger.debug('Salvando layout:', mobileHeaderLayout);

    localStorage.setItem('mobileHeaderLayout', JSON.stringify(mobileHeaderLayout));
    settingsLogger.debug('Layout salvo no localStorage');

    // Disparar evento para notificar o MobileHeader
    const layoutEvent = new CustomEvent('mobileHeaderLayoutUpdated', {
      detail: { layout: mobileHeaderLayout },
    });
    settingsLogger.debug('Disparando evento:', layoutEvent);
    window.dispatchEvent(layoutEvent);
    settingsLogger.debug('Evento disparado com sucesso');

    toast({
      title: 'Layout salvo',
      description: 'As posições do mobile header foram atualizadas com sucesso.',
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SettingsIcon className="h-5 w-5" />
          Layout do Mobile Header
        </CardTitle>
        <CardDescription>
          Ajuste as posições dos elementos no header móvel
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            Arraste e solte os elementos para ajustar suas posições no header móvel
          </p>

          {/* Preview do Mobile Header */}
          <div className="bg-white dark:bg-gray-900 rounded-lg border dark:border-gray-700 p-4 mb-4">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 text-center">
              Preview do Header
            </div>
            <div className="bg-gradient-to-r from-white via-blue-50/30 to-purple-50/30 rounded-lg p-3 border">
              <div className="flex items-center gap-3">
                {/* Logo */}
                <div
                  className="relative cursor-move bg-blue-100 p-2 rounded border-2 border-dashed border-blue-300"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', 'logo');
                  }}
                  style={{
                    transform: `translateX(${mobileHeaderLayout.logo.offsetX}px) translateY(${mobileHeaderLayout.logo.offsetY}px)`,
                  }}
                >
                  <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center text-white text-xs font-bold">
                    L
                  </div>
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-600 rounded-full text-white text-xs flex items-center justify-center">
                    ↕
                  </div>
                </div>

                {/* Boas-vindas */}
                <div
                  className="relative cursor-move bg-green-100 p-2 rounded border-2 border-dashed border-green-300"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', 'welcome');
                  }}
                  style={{
                    transform: `translateX(${mobileHeaderLayout.welcome.offsetX}px) translateY(${mobileHeaderLayout.welcome.offsetY}px)`,
                  }}
                >
                  <div className="text-xs text-green-700 font-medium whitespace-nowrap">
                    Boa noite, Usuário!
                  </div>
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-600 rounded-full text-white text-xs flex items-center justify-center">
                    ↕
                  </div>
                </div>

                {/* Botões de ação */}
                <div
                  className="relative cursor-move bg-purple-100 p-2 rounded border-2 border-dashed border-purple-300 ml-auto"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', 'actions');
                  }}
                  style={{
                    transform: `translateX(${mobileHeaderLayout.actions.offsetX}px) translateY(${mobileHeaderLayout.actions.offsetY}px)`,
                  }}
                >
                  <div className="flex gap-1">
                    <div className="w-4 h-4 bg-purple-500 rounded text-white text-xs flex items-center justify-center">
                      C
                    </div>
                    <div className="w-4 h-4 bg-purple-500 rounded text-white text-xs flex items-center justify-center">
                      N
                    </div>
                    <div className="w-4 h-4 bg-purple-500 rounded text-white text-xs flex items-center justify-center">
                      U
                    </div>
                  </div>
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-purple-600 rounded-full text-white text-xs flex items-center justify-center">
                    ↕
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Controles de posição */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Logo */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Logo</Label>
              <div className="space-y-2">
                <div>
                  <Label className="text-xs">
                    X: {mobileHeaderLayout.logo.offsetX}px
                  </Label>
                  <input
                    type="range"
                    min="-50"
                    max="50"
                    value={mobileHeaderLayout.logo.offsetX}
                    onChange={(e) =>
                      updateMobileHeaderLayout('logo', 'offsetX', parseInt(e.target.value))
                    }
                    className="w-full"
                  />
                </div>
                <div>
                  <Label className="text-xs">
                    Y: {mobileHeaderLayout.logo.offsetY}px
                  </Label>
                  <input
                    type="range"
                    min="-20"
                    max="20"
                    value={mobileHeaderLayout.logo.offsetY}
                    onChange={(e) =>
                      updateMobileHeaderLayout('logo', 'offsetY', parseInt(e.target.value))
                    }
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* Boas-vindas */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Boas-vindas</Label>
              <div className="space-y-2">
                <div>
                  <Label className="text-xs">
                    X: {mobileHeaderLayout.welcome.offsetX}px
                  </Label>
                  <input
                    type="range"
                    min="-50"
                    max="50"
                    value={mobileHeaderLayout.welcome.offsetX}
                    onChange={(e) =>
                      updateMobileHeaderLayout('welcome', 'offsetX', parseInt(e.target.value))
                    }
                    className="w-full"
                  />
                </div>
                <div>
                  <Label className="text-xs">
                    Y: {mobileHeaderLayout.welcome.offsetY}px
                  </Label>
                  <input
                    type="range"
                    min="-20"
                    max="20"
                    value={mobileHeaderLayout.welcome.offsetY}
                    onChange={(e) =>
                      updateMobileHeaderLayout('welcome', 'offsetY', parseInt(e.target.value))
                    }
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* Botões de ação */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Botões de Ação</Label>
              <div className="space-y-2">
                <div>
                  <Label className="text-xs">
                    X: {mobileHeaderLayout.actions.offsetX}px
                  </Label>
                  <input
                    type="range"
                    min="-50"
                    max="50"
                    value={mobileHeaderLayout.actions.offsetX}
                    onChange={(e) =>
                      updateMobileHeaderLayout('actions', 'offsetX', parseInt(e.target.value))
                    }
                    className="w-full"
                  />
                </div>
                <div>
                  <Label className="text-xs">
                    Y: {mobileHeaderLayout.actions.offsetY}px
                  </Label>
                  <input
                    type="range"
                    min="-20"
                    max="20"
                    value={mobileHeaderLayout.actions.offsetY}
                    onChange={(e) =>
                      updateMobileHeaderLayout('actions', 'offsetY', parseInt(e.target.value))
                    }
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Botões de ação */}
          <div className="flex items-center gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={resetMobileHeaderLayout}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Resetar Posições
            </Button>
            <Button
              size="sm"
              onClick={saveMobileHeaderLayout}
              className="bg-green-600 hover:bg-green-700"
            >
              <Save className="h-4 w-4 mr-2" />
              Salvar Layout
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                settingsLogger.debug('Teste manual do evento');
                const testEvent = new CustomEvent('mobileHeaderLayoutUpdated', {
                  detail: { layout: mobileHeaderLayout },
                });
                window.dispatchEvent(testEvent);
                settingsLogger.debug('Evento de teste disparado');
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              🧪 Testar Sincronização
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
