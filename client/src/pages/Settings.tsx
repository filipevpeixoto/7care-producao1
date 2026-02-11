/* eslint-disable no-console, @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
// TODO: Remove eslint-disable once Settings.tsx is fully decomposed (Action #6)
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';


import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Settings as SettingsIcon,
  Users,
  Bell,
  Shield,
  Palette,
  Database,
  Save,
  RefreshCw,
  Download,
  Upload,
  Trash2,
  AlertTriangle,
  Loader2,
  Calendar,
  Cloud,
  Filter,
  Building2,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { hasAdminAccess } from '@/lib/permissions';
import { useToast } from '@/hooks/use-toast';
import type { Event } from '@/types/domain';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { PointsConfiguration } from '@/components/settings/PointsConfiguration';
import { DistrictSettings } from '@/components/settings/DistrictSettings';
import { useLastImportDate } from '@/hooks/useLastImportDate';
import { useSystemLogo } from '@/hooks/useSystemLogo';
import { ImportExcelModal } from '@/components/calendar/ImportExcelModal';
import { GoogleDriveImportModal } from '@/components/calendar/GoogleDriveImportModal';
import { GoogleCalendarConfigModal } from '@/components/calendar/GoogleCalendarConfigModal';
import { EventPermissionsModal } from '@/components/calendar/EventPermissionsModal';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useQueryClient } from '@tanstack/react-query';
import { exportToExcel } from '@/lib/excel';


import { ImportUsersModal } from '@/components/settings/ImportUsersModal';
import { SendNotificationModal } from '@/components/settings/SendNotificationModal';
import { ChurchManagementTab } from '@/components/settings/ChurchManagementTab';

interface SettingsData {
  notifications: {
    emailEnabled: boolean;
    pushEnabled: boolean;
    meetingReminders: boolean;
    messageAlerts: boolean;
    weeklyReport: boolean;
  };
  privacy: {
    profileVisible: boolean;
    contactInfoVisible: boolean;
    attendanceVisible: boolean;
  };
  appearance: {
    theme: 'light' | 'dark' | 'system';
    language: 'pt' | 'en' | 'es';
    dateFormat: 'dd/mm/yyyy' | 'mm/dd/yyyy' | 'yyyy-mm-dd';
  };
  church: {
    name: string;
    address: string;
    phone: string;
    email: string;
    website: string;
    meetingDays: string[];
  };
}

const initialSettings: SettingsData = {
  notifications: {
    emailEnabled: true,
    pushEnabled: true,
    meetingReminders: true,
    messageAlerts: true,
    weeklyReport: false,
  },
  privacy: {
    profileVisible: true,
    contactInfoVisible: false,
    attendanceVisible: true,
  },
  appearance: {
    theme: 'system',
    language: 'pt',
    dateFormat: 'dd/mm/yyyy',
  },
  church: {
    name: 'Igreja Adventista Central',
    address: 'Rua das Flores, 123 - Centro',
    phone: '(11) 3333-4444',
    email: 'contato@igrejacentral.org',
    website: 'www.igrejacentral.org',
    meetingDays: ['saturday', 'wednesday'],
  },
};

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<SettingsData>(initialSettings);
  const [isLoading, setIsLoading] = useState(false);

  // Push notifications hook
  const { isSupported, isSubscribed, requestPermission, subscribe, unsubscribe } =
    usePushNotifications();

  // Estado local para controlar o switch
  const [isPushEnabled, setIsPushEnabled] = useState(false);

  // Função para salvar subscription no backend
  const saveSubscriptionToServer = async (subscription: PushSubscription) => {
    try {
      console.log('💾 PUSH: Salvando subscription no servidor para usuário:', user?.id);

      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          userId: user?.id,
        }),
      });

      console.log('📡 PUSH: Resposta do servidor:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ PUSH: Erro na resposta do servidor:', errorText);
        throw new Error('Failed to save subscription');
      }

      const result = await response.json();
      console.log('✅ PUSH: Subscription salva com sucesso:', result);
      return result;
    } catch (error) {
      console.error('❌ PUSH: Erro ao salvar subscription:', error);
      throw error;
    }
  };

  // Função para remover subscription do backend
  const removeSubscriptionFromServer = async () => {
    try {
      const response = await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user?.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to remove subscription');
      }

      return await response.json();
    } catch (error) {
      console.error('Error removing subscription:', error);
      throw error;
    }
  };

  // Import states
  const [showImportModal, setShowImportModal] = useState(false);
  const {
    lastImportDate,
    updateLastImportDate,
    getDaysSinceLastImport,
    getFormattedLastImportDate,
  } = useLastImportDate();

  // Estado do distrito do usuário para filtrar dados
  const [userDistrictId, setUserDistrictId] = useState<number | null>(null);
  const [userDistrictName, setUserDistrictName] = useState<string>('');

  // Push notifications management states
  const [showNotificationModal, setShowNotificationModal] = useState(false);

  // Clear data dialog states
  const [showClearDataDialog, setShowClearDataDialog] = useState(false);
  const [clearDataCallback, setClearDataCallback] = useState<((value: boolean) => void) | null>(
    null
  );
  const [isClearingDistrict, setIsClearingDistrict] = useState(false);

  // Logo management states
  const [currentLogo, setCurrentLogo] = useState<string>('');
  const { refreshLogo, clearLogoSystem } = useSystemLogo();

  // Calendar modal states
  const [showImportExcelModal, setShowImportExcelModal] = useState(false);
  const [showGoogleDriveModal, setShowGoogleDriveModal] = useState(false);
  const [showGoogleCalendarModal, setShowGoogleCalendarModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  // TODO: Implement Power BI user data import modal (placeholder state)
  const [showUserDataImportModal, setShowUserDataImportModal] = useState(false);

  // Query client for cache invalidation
  const queryClient = useQueryClient();

  // Mobile Header Layout states
  const [mobileHeaderLayout, setMobileHeaderLayout] = useState({
    logo: { offsetX: 0, offsetY: 0 },
    welcome: { offsetX: 0, offsetY: 0 },
    actions: { offsetX: 0, offsetY: 0 },
  });

  // Inicializar userDistrictId a partir do user autenticado
  useEffect(() => {
    if (user?.districtId && !userDistrictId) {
      setUserDistrictId(user.districtId);
      // Buscar nome do distrito
      fetch(`/api/districts/${user.districtId}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.name) setUserDistrictName(data.name);
          else setUserDistrictName('Meu Distrito');
        })
        .catch(() => setUserDistrictName('Meu Distrito'));
    }
  }, [user?.districtId]);

  // Load current system logo from localStorage
  useEffect(() => {
    const savedLogo = localStorage.getItem('systemLogo');
    if (savedLogo && savedLogo !== '') {
      setCurrentLogo(savedLogo);
    }
  }, []);

  // Load mobile header layout from localStorage (deve ser carregado primeiro)
  useEffect(() => {
    console.log('🔧 Settings - Carregando layout do localStorage...');
    const savedLayout = localStorage.getItem('mobileHeaderLayout');
    console.log('🔧 Settings - Layout salvo encontrado:', savedLayout);

    if (savedLayout) {
      try {
        const parsedLayout = JSON.parse(savedLayout);
        console.log('🔧 Settings - Layout parseado com sucesso:', parsedLayout);
        setMobileHeaderLayout(parsedLayout);
      } catch (error) {
        console.error('❌ Settings - Erro ao carregar layout do mobile header:', error);
      }
    } else {
      console.log('🔧 Settings - Nenhum layout salvo encontrado, usando padrão');
    }
  }, []);

  // Debug: Log sempre que o layout mudar no Settings
  useEffect(() => {
    console.log('🔧 Settings - Estado do layout atualizado:', mobileHeaderLayout);
  }, [mobileHeaderLayout]);

  // Verificar subscription do usuário atual ao carregar
  useEffect(() => {
    const checkUserSubscription = async () => {
      if (user?.id) {
        try {
          const response = await fetch(`/api/push/subscriptions?userId=${user.id}`);
          if (response.ok) {
            const data = await response.json();
            const userSubscription = data.subscriptions?.find(
              (sub: any) => sub.user_id === user.id
            );
            if (userSubscription && userSubscription.is_active) {
              // Se o usuário tem subscription ativa, atualizar o estado local
              setIsPushEnabled(true);
              setSettings((prev) => ({
                ...prev,
                notifications: {
                  ...prev.notifications,
                  pushEnabled: true,
                },
              }));
            }
          }
        } catch (error) {
          console.error('Erro ao verificar subscription do usuário:', error);
        }
      }
    };

    checkUserSubscription();
  }, [user?.id]);

  // Mobile Header Layout functions
  const updateMobileHeaderLayout = (
    element: 'logo' | 'welcome' | 'actions',
    axis: 'offsetX' | 'offsetY',
    value: number
  ) => {
    console.log(`🔧 Settings - Atualizando layout: ${element}.${axis} = ${value}`);
    setMobileHeaderLayout((prev) => {
      const newLayout = {
        ...prev,
        [element]: {
          ...prev[element],
          [axis]: value,
        },
      };
      console.log(`🔧 Settings - Novo layout:`, newLayout);
      return newLayout;
    });
  };

  const resetMobileHeaderLayout = () => {
    console.log('🔧 Settings - Resetando layout para valores padrão');
    const defaultLayout = {
      logo: { offsetX: 0, offsetY: 0 },
      welcome: { offsetX: 0, offsetY: 0 },
      actions: { offsetX: 0, offsetY: 0 },
    };
    setMobileHeaderLayout(defaultLayout);
    console.log('🔧 Settings - Layout resetado:', defaultLayout);
  };

  const saveMobileHeaderLayout = () => {
    console.log('🔧 Settings - Salvando layout:', mobileHeaderLayout);

    localStorage.setItem('mobileHeaderLayout', JSON.stringify(mobileHeaderLayout));
    console.log('🔧 Settings - Layout salvo no localStorage');

    // Disparar evento para notificar o MobileHeader
    const layoutEvent = new CustomEvent('mobileHeaderLayoutUpdated', {
      detail: { layout: mobileHeaderLayout },
    });
    console.log('🔧 Settings - Disparando evento:', layoutEvent);
    window.dispatchEvent(layoutEvent);
    console.log('🔧 Settings - Evento disparado com sucesso');

    toast({
      title: 'Layout salvo',
      description: 'As posições do mobile header foram atualizadas com sucesso.',
    });
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      toast({
        title: 'Configurações salvas',
        description: 'Suas configurações foram atualizadas com sucesso.',
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar as configurações.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setSettings(initialSettings);
    toast({
      title: 'Configurações restauradas',
      description: 'Todas as configurações foram restauradas aos valores padrão.',
    });
  };

  const updateSetting = <T extends keyof SettingsData>(
    section: T,
    key: keyof SettingsData[T],
    value: SettingsData[T][keyof SettingsData[T]]
  ) => {
    setSettings((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value,
      },
    }));
  };

  const handleClearDistrictData = async () => {
    if (!userDistrictId) return;
    setIsClearingDistrict(true);
    try {
      const response = await fetch(`/api/districts/${userDistrictId}/data`, {
        method: 'DELETE',
        headers: {
          'x-user-id': user?.id?.toString() || '',
          'x-user-role': user?.role || '',
        },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao limpar dados');

      queryClient.clear();

      toast({
        title: 'Dados limpos',
        description: data.message || 'Dados do distrito removidos com sucesso.',
      });
    } catch (error) {
      toast({
        title: 'Erro ao limpar dados',
        description: (error as Error).message,
        variant: 'destructive',
      });
    } finally {
      setIsClearingDistrict(false);
    }
  };

  const handleClearAllData = async () => {
    const confirmed = await new Promise<boolean>((resolve) => {
      setShowClearDataDialog(true);
      setClearDataCallback(() => resolve);
    });

    if (!confirmed) {
      toast({
        title: 'Operação cancelada',
        description: 'A limpeza dos dados foi cancelada.',
      });
      return;
    }

    try {
      setIsLoading(true);

      console.log('🧹 Iniciando limpeza completa do sistema...');

      // 1. Limpar banco de dados no servidor
      console.log('📡 Limpando banco de dados...');
      const response = await fetch('/api/system/clear-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id?.toString() || '',
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Falha ao limpar dados do servidor');
      }

      console.log('✅ Banco de dados limpo');

      // 2. Limpar React Query Cache
      console.log('🗑️ Limpando React Query cache...');
      queryClient.clear();
      console.log('✅ React Query cache limpo');

      // 3. Limpar IndexedDB
      console.log('🗑️ Limpando IndexedDB...');
      try {
        const databases = await indexedDB.databases();
        for (const db of databases) {
          if (db.name) {
            console.log(`  Deletando database: ${db.name}`);
            indexedDB.deleteDatabase(db.name);
          }
        }
        console.log('✅ IndexedDB limpo');
      } catch (error) {
        console.warn('⚠️ Erro ao limpar IndexedDB:', error);
      }

      // 4. Limpar localStorage (exceto configurações essenciais)
      console.log('🗑️ Limpando localStorage...');
      const keysToKeep = ['theme', 'language'];
      const keysToRemove: string[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && !keysToKeep.includes(key)) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach((key) => {
        console.log(`  Removendo: ${key}`);
        localStorage.removeItem(key);
      });
      console.log('✅ localStorage limpo');

      // 5. Limpar sessionStorage
      console.log('🗑️ Limpando sessionStorage...');
      sessionStorage.clear();
      console.log('✅ sessionStorage limpo');

      // 6. Limpar Service Worker Cache
      console.log('🗑️ Limpando Service Worker cache...');
      try {
        const cacheNames = await caches.keys();
        for (const cacheName of cacheNames) {
          console.log(`  Deletando cache: ${cacheName}`);
          await caches.delete(cacheName);
        }
        console.log('✅ Service Worker cache limpo');
      } catch (error) {
        console.warn('⚠️ Erro ao limpar Service Worker cache:', error);
      }

      // 7. Desregistrar Service Worker
      console.log('🗑️ Desregistrando Service Worker...');
      try {
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          console.log(`  Encontrados ${registrations.length} Service Workers registrados`);

          for (const registration of registrations) {
            console.log(`  Desregistrando SW: ${registration.scope}`);
            await registration.unregister();
          }

          console.log('✅ Service Worker desregistrado');

          // Limpar controller atual
          if (navigator.serviceWorker.controller) {
            console.log('  Enviando mensagem de SKIP_WAITING para SW ativo');
            navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
          }
        }
      } catch (error) {
        console.warn('⚠️ Erro ao desregistrar Service Worker:', error);
      }

      console.log('\n🎉 LIMPEZA COMPLETA CONCLUÍDA!');
      console.log('ℹ️ A página será recarregada em 3 segundos...');

      toast({
        title: 'Sistema limpo com sucesso',
        description:
          'Todos os dados foram removidos: banco de dados, cache, localStorage, IndexedDB e Service Worker.',
        duration: 5000,
      });

      // Recarregar a página para refletir o estado limpo
      // Aguardar mais tempo para garantir que o SW foi desregistrado
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    } catch (error) {
      console.error('❌ Erro ao limpar dados:', error);
      toast({
        title: 'Erro ao limpar dados',
        description: error instanceof Error ? error.message : 'Ocorreu um erro inesperado.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Calendar functions
  const handleImportComplete = () => {
    // Invalidar cache e recarregar eventos após importação
    queryClient.invalidateQueries({ queryKey: ['events'] });
    // Atualizar data da última importação
    updateLastImportDate(new Date().toISOString());
    toast({
      title: 'Agenda atualizada',
      description: 'Os eventos foram importados e a agenda foi atualizada.',
    });
  };

  const handleClearAllEvents = async () => {
    const confirmed = window.confirm(
      '⚠️ ATENÇÃO: Esta ação irá excluir TODOS os eventos da agenda permanentemente!\n\n' +
        'Isso inclui:\n' +
        '• Todos os eventos criados\n' +
        '• Todos os eventos importados\n' +
        '• Todos os tipos de eventos\n\n' +
        'Esta ação NÃO PODE SER DESFEITA!\n\n' +
        'Tem certeza que deseja continuar?'
    );

    if (!confirmed) return;

    const doubleConfirm = window.confirm(
      'ÚLTIMA CONFIRMAÇÃO:\n\n' +
        'Você tem ABSOLUTA CERTEZA que deseja excluir TODOS os eventos da agenda?\n\n' +
        "Digite 'CONFIRMAR' no próximo prompt para prosseguir."
    );

    if (!doubleConfirm) return;

    const finalConfirm = prompt(
      'Para confirmar a exclusão de TODOS os eventos, digite exatamente: CONFIRMAR'
    );

    if (finalConfirm !== 'CONFIRMAR') {
      toast({
        title: 'Operação cancelada',
        description: 'A limpeza dos eventos foi cancelada.',
      });
      return;
    }

    try {
      const response = await fetch('/api/events', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (response.ok) {
        // Invalidar e remover cache de eventos
        queryClient.invalidateQueries({ queryKey: ['events'] });
        queryClient.invalidateQueries({ queryKey: ['events', user?.role] });
        queryClient.removeQueries({ queryKey: ['events'] });
        queryClient.removeQueries({ queryKey: ['events', user?.role] });

        // Forçar refetch imediato
        queryClient.refetchQueries({ queryKey: ['events'] });
        queryClient.refetchQueries({ queryKey: ['events', user?.role] });

        toast({
          title: 'Eventos removidos',
          description: result.message || 'Todos os eventos foram removidos com sucesso.',
        });
      } else {
        throw new Error(result.error || 'Falha ao limpar eventos');
      }
    } catch (error) {
      console.error('Clear events error:', error);
      toast({
        title: 'Erro ao limpar eventos',
        description: error instanceof Error ? error.message : 'Ocorreu um erro inesperado.',
        variant: 'destructive',
      });
    }
  };

  const handleExportCalendar = async () => {
    try {
      // Buscar todos os eventos
      const response = await fetch('/api/events');
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao buscar eventos');
      }

      const events = Array.isArray(result) ? result : result.events || [];

      console.log('🔍 Debug Export - Total eventos encontrados:', events.length);
      console.log('🔍 Debug Export - Primeiro evento:', events[0]);

      if (events.length === 0) {
        toast({
          title: 'Agenda vazia',
          description: 'Não há eventos para exportar.',
          variant: 'destructive',
        });
        return;
      }

      // Preparar dados para exportação
      const exportData = events.map(
        (event: Event & { startDate?: string; end_date?: string; endDate?: string }) => {
          // Formatar mês - usar 'date' em vez de 'startDate'
          const eventDate = event.date || event.startDate;
          const month = eventDate
            ? new Date(eventDate).toLocaleDateString('pt-BR', { month: 'long' })
            : '';

          // Formatar categoria
          const category = event.type || '';

          // Formatar data (DD/MM, DD/MM/YYYY, DD/MM-DD/MM, DD/MM/YYYY - DD/MM/YYYY)
          let formattedDate = '';
          if (eventDate) {
            const startDate = new Date(eventDate);
            const startDay = String(startDate.getDate()).padStart(2, '0');
            const startMonth = String(startDate.getMonth() + 1).padStart(2, '0');
            const startYear = startDate.getFullYear();

            const endDateValue = event.end_date || event.endDate;
            if (endDateValue && endDateValue !== eventDate) {
              // Evento com data de fim diferente
              const endDate = new Date(endDateValue);
              const endDay = String(endDate.getDate()).padStart(2, '0');
              const endMonth = String(endDate.getMonth() + 1).padStart(2, '0');
              const endYear = endDate.getFullYear();

              if (startYear === endYear && startMonth === endMonth) {
                // Mesmo mês e ano: DD/MM - DD/MM
                formattedDate = `${startDay}/${startMonth} - ${endDay}/${endMonth}`;
              } else if (startYear === endYear) {
                // Mesmo ano: DD/MM - DD/MM
                formattedDate = `${startDay}/${startMonth} - ${endDay}/${endMonth}`;
              } else {
                // Anos diferentes: DD/MM/YYYY - DD/MM/YYYY
                formattedDate = `${startDay}/${startMonth}/${startYear} - ${endDay}/${endMonth}/${endYear}`;
              }
            } else {
              // Evento de um dia só: DD/MM/YYYY
              formattedDate = `${startDay}/${startMonth}/${startYear}`;
            }
          }

          // Título do evento
          const eventTitle = event.title || '';

          return {
            Mês: month,
            Categoria: category,
            Data: formattedDate,
            Evento: eventTitle,
          };
        }
      );

      console.log('🔍 Debug Export - Dados processados para Excel:', exportData.slice(0, 3));

      // Gerar nome do arquivo com data atual
      const now = new Date();
      const dateStr = now.toLocaleDateString('pt-BR').replace(/\//g, '-');
      const fileName = `agenda-${dateStr}.xlsx`;

      // Exportar usando excelUtils
      await exportToExcel(exportData, fileName, 'Agenda');

      toast({
        title: 'Exportação concluída',
        description: `${events.length} eventos exportados com sucesso para ${fileName}`,
      });
    } catch (error) {
      console.error('Erro ao exportar agenda:', error);
      toast({
        title: 'Erro na exportação',
        description: 'Não foi possível exportar a agenda. Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const isMemberOnlyNotifications = user?.role === 'member';
  const defaultTab = 'notifications';

  return (
    <MobileLayout>
      <div className="container mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <SettingsIcon className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        </div>

        <Tabs defaultValue={defaultTab} className="space-y-6">
          {/* Desktop Tabs */}
          <TabsList className="hidden md:grid w-full grid-cols-11">
            <TabsTrigger value="notifications" className="text-xs">
              Notificações
            </TabsTrigger>
            {!isMemberOnlyNotifications && (
              <>
                <TabsTrigger value="privacy" className="text-xs">
                  Privacidade
                </TabsTrigger>
                <TabsTrigger value="appearance" className="text-xs">
                  Aparência
                </TabsTrigger>
              </>
            )}

            {hasAdminAccess(user) && (
              <TabsTrigger value="calendar" className="text-xs">
                Calendário
              </TabsTrigger>
            )}
            {hasAdminAccess(user) && (
              <TabsTrigger value="district-settings" className="text-xs">
                Meu Distrito
              </TabsTrigger>
            )}
            {hasAdminAccess(user) && (
              <TabsTrigger value="points-config" className="text-xs">
                Base de Cálculo
              </TabsTrigger>
            )}
            {hasAdminAccess(user) && (
              <TabsTrigger value="system" className="text-xs">
                Sistema
              </TabsTrigger>
            )}
            {hasAdminAccess(user) && (
              <TabsTrigger value="church" className="text-xs">
                Igreja
              </TabsTrigger>
            )}
            {hasAdminAccess(user) && (
              <TabsTrigger value="data-management" className="text-xs">
                Gestão de Dados
              </TabsTrigger>
            )}
          </TabsList>

          {/* Mobile Tabs - Scrollable */}
          <TabsList className="md:hidden flex w-full overflow-x-auto scrollbar-hide">
            <TabsTrigger value="notifications" className="text-xs flex-shrink-0 px-2">
              Notificações
            </TabsTrigger>
            {!isMemberOnlyNotifications && (
              <>
                <TabsTrigger value="privacy" className="text-xs flex-shrink-0 px-2">
                  Privacidade
                </TabsTrigger>
                <TabsTrigger value="appearance" className="text-xs flex-shrink-0 px-2">
                  Aparência
                </TabsTrigger>
              </>
            )}

            {hasAdminAccess(user) && (
              <TabsTrigger value="calendar" className="text-xs flex-shrink-0 px-2">
                Calendário
              </TabsTrigger>
            )}
            {hasAdminAccess(user) && (
              <TabsTrigger value="district-settings" className="text-xs flex-shrink-0 px-2">
                Meu Distrito
              </TabsTrigger>
            )}
            {hasAdminAccess(user) && (
              <TabsTrigger value="points-config" className="text-xs flex-shrink-0 px-2">
                Base de Cálculo
              </TabsTrigger>
            )}
            {hasAdminAccess(user) && (
              <TabsTrigger value="system" className="text-xs flex-shrink-0 px-2">
                Sistema
              </TabsTrigger>
            )}
            {hasAdminAccess(user) && (
              <TabsTrigger value="church" className="text-xs flex-shrink-0 px-2">
                Igreja
              </TabsTrigger>
            )}
            {hasAdminAccess(user) && (
              <TabsTrigger value="data-management" className="text-xs flex-shrink-0 px-2">
                Gestão de Dados
              </TabsTrigger>
            )}
          </TabsList>

          {/* Notifications Settings */}
          <TabsContent value="notifications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notificações
                </CardTitle>
                <CardDescription>Configure como você quer receber notificações</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">Notificações por email</div>
                    <div className="text-xs text-muted-foreground">
                      Receba atualizações por email
                    </div>
                  </div>
                  <Switch
                    checked={settings.notifications.emailEnabled}
                    onCheckedChange={(checked) =>
                      updateSetting('notifications', 'emailEnabled', checked)
                    }
                    data-testid="switch-email-notifications"
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">Notificações push</div>
                    <div className="text-xs text-muted-foreground">Notificações no dispositivo</div>
                  </div>
                  <Switch
                    checked={isPushEnabled}
                    onCheckedChange={async (checked) => {
                      console.log('🔄 Tentando alterar notificações push para:', checked);
                      console.log('🔍 isSupported:', isSupported);

                      try {
                        if (checked) {
                          // Ativar push notifications
                          console.log('📱 Ativando push notifications...');

                          if (!isSupported) {
                            console.log('❌ Push notifications não suportadas');
                            toast({
                              title: 'Não suportado',
                              description: 'Seu navegador não suporta notificações push.',
                              variant: 'destructive',
                            });
                            return;
                          }

                          console.log('🔑 Solicitando permissão...');
                          const subscription = await subscribe();
                          console.log('✅ Subscription criada:', subscription);

                          console.log('💾 Salvando no servidor...');
                          await saveSubscriptionToServer(subscription);
                          console.log('✅ Subscription salva no servidor');

                          setIsPushEnabled(true);
                          updateSetting('notifications', 'pushEnabled', true);

                          toast({
                            title: 'Notificações ativadas',
                            description: 'Você receberá notificações push no seu dispositivo.',
                          });
                        } else {
                          // Desativar push notifications
                          console.log('📱 Desativando push notifications...');

                          await unsubscribe();
                          await removeSubscriptionFromServer();

                          setIsPushEnabled(false);
                          updateSetting('notifications', 'pushEnabled', false);

                          toast({
                            title: 'Notificações desativadas',
                            description: 'As notificações push foram desativadas.',
                          });
                        }
                      } catch (error) {
                        console.error('❌ Error toggling push notifications:', error);
                        toast({
                          title: 'Erro',
                          description: `Não foi possível alterar as configurações de notificação: ${(error as Error).message}`,
                          variant: 'destructive',
                        });
                      }
                    }}
                    data-testid="switch-push-notifications"
                    disabled={!isSupported}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">Lembretes de reuniões</div>
                    <div className="text-xs text-muted-foreground">Avisos antes dos eventos</div>
                  </div>
                  <Switch
                    checked={settings.notifications.meetingReminders}
                    onCheckedChange={(checked) =>
                      updateSetting('notifications', 'meetingReminders', checked)
                    }
                    data-testid="switch-meeting-reminders"
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">Alertas de mensagens</div>
                    <div className="text-xs text-muted-foreground">
                      Notificações de novas mensagens
                    </div>
                  </div>
                  <Switch
                    checked={settings.notifications.messageAlerts}
                    onCheckedChange={(checked) =>
                      updateSetting('notifications', 'messageAlerts', checked)
                    }
                    data-testid="switch-message-alerts"
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">Relatório semanal</div>
                    <div className="text-xs text-muted-foreground">
                      Resumo das atividades da semana
                    </div>
                  </div>
                  <Switch
                    checked={settings.notifications.weeklyReport}
                    onCheckedChange={(checked) =>
                      updateSetting('notifications', 'weeklyReport', checked)
                    }
                    data-testid="switch-weekly-report"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Privacy Settings */}
          {!isMemberOnlyNotifications && (
            <TabsContent value="privacy" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Privacidade
                  </CardTitle>
                  <CardDescription>Controle a visibilidade das suas informações</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="text-sm font-medium">Perfil visível</div>
                      <div className="text-xs text-muted-foreground">
                        Outros membros podem ver seu perfil
                      </div>
                    </div>
                    <Switch
                      checked={settings.privacy.profileVisible}
                      onCheckedChange={(checked) =>
                        updateSetting('privacy', 'profileVisible', checked)
                      }
                      data-testid="switch-profile-visible"
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="text-sm font-medium">Informações de contato</div>
                      <div className="text-xs text-muted-foreground">
                        Mostrar telefone e email no perfil
                      </div>
                    </div>
                    <Switch
                      checked={settings.privacy.contactInfoVisible}
                      onCheckedChange={(checked) =>
                        updateSetting('privacy', 'contactInfoVisible', checked)
                      }
                      data-testid="switch-contact-visible"
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="text-sm font-medium">Frequência visível</div>
                      <div className="text-xs text-muted-foreground">
                        Mostrar sua frequência nos eventos
                      </div>
                    </div>
                    <Switch
                      checked={settings.privacy.attendanceVisible}
                      onCheckedChange={(checked) =>
                        updateSetting('privacy', 'attendanceVisible', checked)
                      }
                      data-testid="switch-attendance-visible"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Appearance Settings */}
          {!isMemberOnlyNotifications && (
            <TabsContent value="appearance" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5" />
                    Aparência
                  </CardTitle>
                  <CardDescription>Personalize a interface do aplicativo</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="theme">Tema</Label>
                    <Select
                      value={settings.appearance.theme}
                      onValueChange={(value: 'light' | 'dark' | 'system') =>
                        updateSetting('appearance', 'theme', value)
                      }
                    >
                      <SelectTrigger data-testid="select-theme">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Claro</SelectItem>
                        <SelectItem value="dark">Escuro</SelectItem>
                        <SelectItem value="system">Sistema</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="language">Idioma</Label>
                    <Select
                      value={settings.appearance.language}
                      onValueChange={(value: 'pt' | 'en' | 'es') =>
                        updateSetting('appearance', 'language', value)
                      }
                    >
                      <SelectTrigger data-testid="select-language">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pt">Português</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Español</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dateFormat">Formato de data</Label>
                    <Select
                      value={settings.appearance.dateFormat}
                      onValueChange={(value: 'dd/mm/yyyy' | 'mm/dd/yyyy' | 'yyyy-mm-dd') =>
                        updateSetting('appearance', 'dateFormat', value)
                      }
                    >
                      <SelectTrigger data-testid="select-date-format">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dd/mm/yyyy">DD/MM/AAAA</SelectItem>
                        <SelectItem value="mm/dd/yyyy">MM/DD/AAAA</SelectItem>
                        <SelectItem value="yyyy-mm-dd">AAAA-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Botão para rever tutorial (apenas para pastores) */}
                  {user?.role === 'pastor' && (
                    <>
                      <Separator className="my-4" />
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <div className="text-sm font-medium">Tutorial de Boas-vindas</div>
                          <div className="text-xs text-muted-foreground">
                            Reveja o tutorial que apresenta as funcionalidades do sistema
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // Remove a flag do localStorage para permitir rever
                            localStorage.removeItem(`7care_welcome_tour_completed_${user.id}`);
                            // Recarrega a página para mostrar o tour
                            window.location.reload();
                          }}
                          className="gap-2"
                        >
                          <RefreshCw className="h-4 w-4" />
                          Rever Tutorial
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Mobile Header Layout Editor */}
              {hasAdminAccess(user) && (
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
                                  updateMobileHeaderLayout(
                                    'logo',
                                    'offsetX',
                                    parseInt(e.target.value)
                                  )
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
                                  updateMobileHeaderLayout(
                                    'logo',
                                    'offsetY',
                                    parseInt(e.target.value)
                                  )
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
                                  updateMobileHeaderLayout(
                                    'welcome',
                                    'offsetX',
                                    parseInt(e.target.value)
                                  )
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
                                  updateMobileHeaderLayout(
                                    'welcome',
                                    'offsetY',
                                    parseInt(e.target.value)
                                  )
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
                                  updateMobileHeaderLayout(
                                    'actions',
                                    'offsetX',
                                    parseInt(e.target.value)
                                  )
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
                                  updateMobileHeaderLayout(
                                    'actions',
                                    'offsetY',
                                    parseInt(e.target.value)
                                  )
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
                            console.log('🔧 Settings - Teste manual do evento');
                            const testEvent = new CustomEvent('mobileHeaderLayoutUpdated', {
                              detail: { layout: mobileHeaderLayout },
                            });
                            window.dispatchEvent(testEvent);
                            console.log('🔧 Settings - Evento de teste disparado');
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          🧪 Testar Sincronização
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          )}

          {/* System Settings (Admin only) */}
          {hasAdminAccess(user) && (
            <TabsContent value="system" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <SettingsIcon className="h-5 w-5" />
                    Configurações do Sistema
                  </CardTitle>
                  <CardDescription>Gerencie as configurações globais do sistema</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Conteúdo de Sistema (sem layout do mobile header) */}
                  {/* Notificações Push foram movidas para página própria de administração */}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* District Settings (Pastor only) */}
          {hasAdminAccess(user) && (
            <TabsContent value="district-settings" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Configurações do Distrito
                  </CardTitle>
                  <CardDescription>
                    Configure as preferências específicas do seu distrito. Essas configurações
                    afetam apenas os membros e igrejas do seu distrito.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DistrictSettings />
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Points Configuration (Admin only) */}
          {hasAdminAccess(user) && (
            <TabsContent value="points-config" className="space-y-4">
              <PointsConfiguration />
            </TabsContent>
          )}

          {/* Church Management (Admin only) */}
          {hasAdminAccess(user) && (
            <TabsContent value="church" className="space-y-4">
              <ChurchManagementTab user={user} userDistrictId={userDistrictId} userDistrictName={userDistrictName} />
            </TabsContent>
          )}

          {/* Calendar Management (Admin only) */}
          {hasAdminAccess(user) && (
            <TabsContent value="calendar" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Gerenciamento do Calendário
                    {userDistrictId && user?.role !== 'superadmin' && (
                      <Badge variant="outline" className="ml-2">
                        {userDistrictName}
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {user?.role === 'superadmin'
                      ? 'Importar, exportar e gerenciar eventos da agenda (Sistema completo)'
                      : `Importar, exportar e gerenciar eventos da agenda do ${userDistrictName || 'seu distrito'}`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Indicador de Filtro por Distrito */}
                  {userDistrictId && user?.role !== 'superadmin' && (
                    <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-purple-600" />
                        <p className="text-sm text-purple-800">
                          Operações limitadas aos eventos do <strong>{userDistrictName}</strong>
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Ações de Importação */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Importação de Dados</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Button
                          onClick={() => setShowUserDataImportModal(true)}
                          variant="outline"
                          className="h-auto p-4 flex flex-col items-start gap-2 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 hover:border-blue-300"
                        >
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-blue-600" />
                            <span className="font-medium text-blue-900">
                              Importar Dados de Usuários
                            </span>
                          </div>
                          <span className="text-sm text-blue-700 text-left">
                            Importar dados de pontuação do Power BI (.xlsx)
                          </span>
                        </Button>

                        <Button
                          onClick={() => setShowImportExcelModal(true)}
                          variant="outline"
                          className="h-auto p-4 flex flex-col items-start gap-2"
                        >
                          <div className="flex items-center gap-2">
                            <Upload className="h-4 w-4" />
                            <span className="font-medium">Importar Eventos</span>
                          </div>
                          <span className="text-sm text-muted-foreground text-left">
                            Importar eventos de um arquivo Excel (.xlsx)
                          </span>
                        </Button>

                        <Button
                          onClick={() => setShowGoogleDriveModal(true)}
                          variant="outline"
                          className="h-auto p-4 flex flex-col items-start gap-2"
                        >
                          <div className="flex items-center gap-2">
                            <Cloud className="h-4 w-4" />
                            <span className="font-medium">Google Drive</span>
                          </div>
                          <span className="text-sm text-muted-foreground text-left">
                            Sincronizar com planilha do Google Drive
                          </span>
                        </Button>

                        <Button
                          onClick={() => setShowGoogleCalendarModal(true)}
                          variant="outline"
                          className="h-auto p-4 flex flex-col items-start gap-2"
                        >
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span className="font-medium">Google Calendar</span>
                          </div>
                          <span className="text-sm text-muted-foreground text-left">
                            Sincronizar eventos do Google Calendar
                          </span>
                        </Button>
                      </div>
                    </div>

                    {/* Ações de Gerenciamento */}
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Gerenciamento</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* Permissões - Apenas superadmin pode modificar (configuração global) */}
                        {user?.role === 'superadmin' && (
                          <Button
                            onClick={() => setShowPermissionsModal(true)}
                            variant="outline"
                            className="h-auto p-4 flex flex-col items-start gap-2"
                          >
                            <div className="flex items-center gap-2">
                              <Filter className="h-4 w-4" />
                              <span className="font-medium">Permissões de Visualização</span>
                            </div>
                            <span className="text-sm text-muted-foreground text-left">
                              Configuração global de quem pode ver cada tipo de evento
                            </span>
                          </Button>
                        )}

                        <Button
                          onClick={handleExportCalendar}
                          variant="outline"
                          className="h-auto p-4 flex flex-col items-start gap-2"
                        >
                          <div className="flex items-center gap-2">
                            <Download className="h-4 w-4" />
                            <span className="font-medium">Exportar Agenda</span>
                          </div>
                          <span className="text-sm text-muted-foreground text-left">
                            {user?.role === 'superadmin'
                              ? 'Baixar todos os eventos em formato Excel'
                              : `Baixar eventos do ${userDistrictName || 'seu distrito'}`}
                          </span>
                        </Button>
                      </div>
                    </div>

                    {/* Ações de Limpeza - Apenas superadmin */}
                    {user?.role === 'superadmin' && (
                      <div>
                        <h3 className="text-lg font-semibold mb-3">Limpeza de Dados</h3>
                        <div className="flex flex-col gap-3">
                          <Button
                            onClick={handleClearAllEvents}
                            variant="destructive"
                            className="h-auto p-4 flex flex-col items-start gap-2"
                          >
                            <div className="flex items-center gap-2">
                              <Trash2 className="h-4 w-4" />
                              <span className="font-medium">Limpar Todos os Eventos</span>
                            </div>
                            <span className="text-sm text-muted-foreground text-left">
                              ⚠️ Remove permanentemente todos os eventos da agenda
                            </span>
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Informações */}
                    <Alert>
                      <Calendar className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Dica:</strong> Use o Google Drive para sincronização em tempo real
                        com uma planilha online. As alterações na planilha serão automaticamente
                        refletidas no calendário.
                      </AlertDescription>
                    </Alert>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Data Management (Admin only) */}
          {hasAdminAccess(user) && (
            <TabsContent value="data-management" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Gestão de Dados
                    {userDistrictId && user?.role !== 'superadmin' && (
                      <Badge variant="outline" className="ml-2">
                        {userDistrictName}
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {user?.role === 'superadmin'
                      ? 'Backup e restauração de dados do sistema completo'
                      : `Backup e restauração de dados do ${userDistrictName || 'seu distrito'}`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Indicador de Filtro por Distrito */}
                  {userDistrictId && user?.role !== 'superadmin' && (
                    <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-purple-600" />
                        <p className="text-sm text-purple-800">
                          Operações limitadas aos dados do <strong>{userDistrictName}</strong>
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Data da Última Importação */}
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Última Importação</p>
                        <p className="text-xs text-muted-foreground">
                          {getFormattedLastImportDate()}
                        </p>
                      </div>
                      {lastImportDate && (
                        <Badge variant="secondary" className="text-xs">
                          {getDaysSinceLastImport()} dias atrás
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button variant="outline" className="flex-1" data-testid="button-export">
                      <Download className="h-4 w-4 mr-2" />
                      Exportar Dados
                    </Button>

                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setShowImportModal(true)}
                      data-testid="button-import"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Importar Dados
                    </Button>

                    {/* Limpar dados - Superadmin: sistema inteiro */}
                    {user?.role === 'superadmin' && (
                      <Button
                        variant="destructive"
                        className="flex-1"
                        data-testid="button-delete-data"
                        onClick={handleClearAllData}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Limpar Dados
                      </Button>
                    )}

                    {/* Limpar dados - Pastor: apenas seu distrito */}
                    {user?.role === 'pastor' && userDistrictId && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="destructive"
                            className="flex-1"
                            disabled={isClearingDistrict}
                          >
                            {isClearingDistrict ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4 mr-2" />
                            )}
                            Limpar Dados do Distrito
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acao vai remover permanentemente todos os membros,
                              relacionamentos, eventos, pedidos de oracao e demais dados do distrito{' '}
                              <strong>{userDistrictName}</strong>. Seu usuario de pastor e o
                              distrito nao serao afetados. Esta acao nao pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={handleClearDistrictData}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Sim, limpar tudo
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>

        {/* Action Buttons */}
        {!isMemberOnlyNotifications && (
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleSave}
              disabled={isLoading}
              className="flex-1"
              data-testid="button-save"
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar Configurações
            </Button>

            <Button
              variant="outline"
              onClick={handleReset}
              className="flex-1"
              data-testid="button-reset"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Restaurar Padrão
            </Button>
          </div>
        )}
      </div>

      {/* Modal de Importação */}
      <ImportUsersModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        user={user}
        onImportComplete={() => updateLastImportDate(new Date().toISOString())}
        loadChurches={async () => {}}
      />
      {/* Dialog de Confirmação para Limpeza de Dados */}
      <Dialog open={showClearDataDialog} onOpenChange={setShowClearDataDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirmar Limpeza de Dados
            </DialogTitle>
            <DialogDescription>
              Esta ação irá <strong>permanentemente</strong> remover todos os dados do sistema,
              incluindo:
              <br />• Usuários e perfis
              <br />• Eventos e reuniões
              <br />• Pontuações e conquistas
              <br />• <strong>Dados do visitômetro</strong> (contadores de visitas)
              <br />• Relacionamentos e discipulado
              <br />• Oração e mensagens
              <br />• Configurações do sistema
              <br />
              <br />
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setShowClearDataDialog(false);
                if (clearDataCallback) {
                  clearDataCallback(false);
                }
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setShowClearDataDialog(false);
                if (clearDataCallback) {
                  clearDataCallback(true);
                }
              }}
            >
              Confirmar Limpeza
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modais do Calendário */}
      <ImportExcelModal
        isOpen={showImportExcelModal}
        onClose={() => setShowImportExcelModal(false)}
        onImportComplete={handleImportComplete}
      />

      <GoogleDriveImportModal
        isOpen={showGoogleDriveModal}
        onClose={() => setShowGoogleDriveModal(false)}
        onImportComplete={handleImportComplete}
      />

      <GoogleCalendarConfigModal
        isOpen={showGoogleCalendarModal}
        onClose={() => setShowGoogleCalendarModal(false)}
        onSyncComplete={handleImportComplete}
      />

      <EventPermissionsModal
        isOpen={showPermissionsModal}
        onClose={() => setShowPermissionsModal(false)}
      />

      {/* Modal de Envio de Notificações */}
      <SendNotificationModal
        isOpen={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
        user={user}
      />
    </MobileLayout>
  );
}
