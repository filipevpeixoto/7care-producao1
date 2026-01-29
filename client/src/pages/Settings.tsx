import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Settings as SettingsIcon,
  Users,
  Bell,
  Shield,
  Palette,
  Globe,
  Database,
  Save,
  RefreshCw,
  Download,
  Upload,
  Trash2,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle,
  X,
  Loader2,
  Plus,
  Star,
  Calendar,
  Cloud,
  Send,
  Eye,
  EyeOff,
  Filter,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { hasAdminAccess } from '@/lib/permissions';
import { useToast } from '@/hooks/use-toast';
import type { Church, Event } from '@/types/domain';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { PointsConfiguration } from '@/components/settings/PointsConfiguration';
import { useLastImportDate } from '@/hooks/useLastImportDate';
import { useSystemLogo } from '@/hooks/useSystemLogo';
import { ImportExcelModal } from '@/components/calendar/ImportExcelModal';
import { GoogleDriveImportModal } from '@/components/calendar/GoogleDriveImportModal';
import { EventPermissionsModal } from '@/components/calendar/EventPermissionsModal';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useQueryClient } from '@tanstack/react-query';
import { readExcelFile, exportToExcel } from '@/lib/excel';

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

  // Funções para gerenciar notificações personalizadas
  const loadUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        setUsersList(data.users || []);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadSubscriptions = async () => {
    try {
      const response = await fetch('/api/push/subscriptions');
      if (response.ok) {
        const data = await response.json();
        setSubscriptionsList(data.subscriptions || []);
      }
    } catch (error) {
      console.error('Error loading subscriptions:', error);
    }
  };

  const sendNotification = async () => {
    try {
      if (!notificationTitle || !notificationMessage) {
        toast({
          title: 'Campos obrigatórios',
          description: 'Título e mensagem são obrigatórios.',
          variant: 'destructive',
        });
        return;
      }

      const response = await fetch('/api/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: notificationTitle,
          message: notificationMessage,
          type: notificationType,
          userId: selectedUserId === 'all' ? null : selectedUserId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send notification');
      }

      const data = await response.json();

      toast({
        title: 'Notificação enviada',
        description: `Enviada para ${data.sentTo} usuário(s).`,
      });

      // Limpar formulário
      setNotificationTitle('');
      setNotificationMessage('');
      setNotificationType('general');
      setSelectedUserId(null);
      setShowNotificationModal(false);

      // Recarregar subscriptions
      await loadSubscriptions();
    } catch (error) {
      console.error('Error sending notification:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível enviar a notificação.',
        variant: 'destructive',
      });
    }
  };

  // Import states
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const [importStep, setImportStep] = useState<
    'upload' | 'preview' | 'mapping' | 'validation' | 'importing' | 'complete'
  >('upload');
  const [importData, setImportData] = useState<any[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importDuplicates, setImportDuplicates] = useState<any[]>([]);
  const {
    lastImportDate,
    updateLastImportDate,
    getDaysSinceLastImport,
    getFormattedLastImportDate,
  } = useLastImportDate();

  // Church management states
  const [editingChurch, setEditingChurch] = useState<number | null>(null);
  const [churchesList, setChurchesList] = useState<any[]>([]);
  const [defaultChurchId, setDefaultChurchId] = useState<number | null>(null);
  const [defaultChurchName, setDefaultChurchName] = useState<string>('');

  // Push notifications management states
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationType, setNotificationType] = useState('general');
  const [selectedUserId, setSelectedUserId] = useState<number | string | null>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [subscriptionsList, setSubscriptionsList] = useState<any[]>([]);
  const [isSavingDefault, setIsSavingDefault] = useState(false);

  // Clear data dialog states
  const [showClearDataDialog, setShowClearDataDialog] = useState(false);
  const [clearDataCallback, setClearDataCallback] = useState<((value: boolean) => void) | null>(
    null
  );

  // Logo management states
  const [currentLogo, setCurrentLogo] = useState<string>('');
  const { refreshLogo, clearLogoSystem } = useSystemLogo();

  // Calendar modal states
  const [showImportExcelModal, setShowImportExcelModal] = useState(false);
  const [showGoogleDriveModal, setShowGoogleDriveModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [showUserDataImportModal, setShowUserDataImportModal] = useState(false);
  const [importingUserData, setImportingUserData] = useState(false);
  const [importStats, setImportStats] = useState({ total: 0, success: 0, errors: 0 });

  // Query client for cache invalidation
  const queryClient = useQueryClient();

  // Mobile Header Layout states
  const [mobileHeaderLayout, setMobileHeaderLayout] = useState({
    logo: { offsetX: 0, offsetY: 0 },
    welcome: { offsetX: 0, offsetY: 0 },
    actions: { offsetX: 0, offsetY: 0 },
  });

  // Load churches from backend
  const loadChurches = async () => {
    try {
      const response = await fetch('/api/churches', {
        headers: {
          'x-user-id': user?.id?.toString() || '',
        },
      });
      if (response.ok) {
        const rawChurches = await response.json();
        const churches = Array.isArray(rawChurches) ? rawChurches : rawChurches?.data || [];
        const formattedChurches = churches.map((church: Church) => ({
          id: church.id,
          name: church.name,
          address: church.address || 'Endereço não informado',
          active: true, // Todas as igrejas são consideradas ativas por padrão
        }));
        setChurchesList(formattedChurches);
      }
    } catch (error) {
      console.error('Error loading churches:', error);
    }
  };

  // Load default church
  const loadDefaultChurch = async () => {
    try {
      const response = await fetch('/api/settings/default-church');
      if (response.ok) {
        const data = await response.json();
        if (data.defaultChurch) {
          setDefaultChurchId(data.defaultChurch.id);
          setDefaultChurchName(data.defaultChurch.name);
        }
      }
    } catch (error) {
      console.error('Error loading default church:', error);
    }
  };

  // Logo management functions

  // Save default church
  const saveDefaultChurch = async () => {
    if (!defaultChurchId) return;

    setIsSavingDefault(true);
    try {
      const response = await fetch('/api/settings/default-church', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ churchId: defaultChurchId }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Update local state
          const selectedChurch = (
            churchesList as Array<{
              id: number | string;
              name: string;
              address: string;
              active: boolean;
            }>
          ).find(c => c.id === defaultChurchId);
          if (selectedChurch) {
            setDefaultChurchName(selectedChurch.name);
          }

          toast({
            title: 'Igreja padrão atualizada',
            description: 'A igreja padrão foi definida com sucesso.',
          });
        }
      } else {
        throw new Error('Failed to update default church');
      }
    } catch (error) {
      console.error('Error saving default church:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível definir a igreja padrão.',
        variant: 'destructive',
      });
    } finally {
      setIsSavingDefault(false);
    }
  };

  useEffect(() => {
    if (hasAdminAccess(user)) {
      loadChurches();
      loadDefaultChurch();
    }
  }, [user]);

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

  // Carregar dados iniciais para notificações
  useEffect(() => {
    if (hasAdminAccess(user)) {
      loadUsers();
      loadSubscriptions();
    }
  }, [user?.role]);

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
              setSettings(prev => ({
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
    setMobileHeaderLayout(prev => {
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
      await new Promise(resolve => setTimeout(resolve, 1000));

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
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value,
      },
    }));
  };

  const processRealFile = async (file: File) => {
    try {
      setImportProgress(20);
      setImportStep('preview');

      if (file.name.endsWith('.xlsx')) {
        // Process Excel file using excelUtils
        const { rows } = await readExcelFile(file);
        setImportData(rows);
      } else if (file.name.endsWith('.csv')) {
        // Process CSV file
        const arrayBuffer = await file.arrayBuffer();
        const text = new TextDecoder().decode(arrayBuffer);
        const lines = text.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());

        const jsonData = lines
          .slice(1)
          .filter(line => line.trim())
          .map(line => {
            const values = line.split(',').map(v => v.trim());
            const obj: Record<string, string> = {};
            headers.forEach((header, index) => {
              obj[header] = values[index] || '';
            });
            return obj;
          });

        setImportData(jsonData);
      }

      setTimeout(() => {
        setImportProgress(40);
        setImportStep('mapping');
      }, 500);
    } catch (error) {
      console.error('Error processing file:', error);
      toast({
        title: 'Erro no arquivo',
        description: 'Não foi possível processar o arquivo. Verifique o formato.',
        variant: 'destructive',
      });
    }
  };

  const toggleChurchStatus = async (churchId: number) => {
    const church = churchesList.find(c => c.id === churchId);
    if (!church) return;

    try {
      const response = await fetch(`/api/churches/${churchId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id?.toString() || '',
        },
        body: JSON.stringify({ isActive: !church.active }),
      });

      if (response.ok) {
        setChurchesList(prev =>
          prev.map(c => (c.id === churchId ? { ...c, active: !c.active } : c))
        );

        const newStatus = !church.active;
        const statusText = newStatus ? 'ativada' : 'desativada';

        toast({
          title: 'Igreja atualizada',
          description: `${church.name} foi ${statusText} com sucesso.${!newStatus ? ' Usuários associados podem ser afetados.' : ''}`,
        });
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o status da igreja.',
        variant: 'destructive',
      });
    }
  };

  const addNewChurch = async () => {
    try {
      const response = await fetch('/api/churches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id?.toString() || '',
        },
        body: JSON.stringify({
          name: 'Nova Igreja',
          address: 'Endereço da igreja',
        }),
      });

      if (response.ok) {
        await loadChurches(); // Reload churches
        toast({
          title: 'Igreja adicionada',
          description: 'Nova igreja foi criada. Clique nos campos para editar.',
        });
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível criar a igreja.',
        variant: 'destructive',
      });
    }
  };

  const updateChurchField = async (churchId: number, field: string, value: string) => {
    try {
      const response = await fetch(`/api/churches/${churchId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id?.toString() || '',
        },
        body: JSON.stringify({ [field]: value }),
      });

      if (response.ok) {
        setChurchesList(prev =>
          prev.map(church => (church.id === churchId ? { ...church, [field]: value } : church))
        );

        // Se o nome da igreja foi alterado, atualizar todos os usuários
        if (field === 'name') {
          const church = churchesList.find(c => c.id === churchId);
          if (church) {
            toast({
              title: 'Igreja atualizada',
              description: `Nome da igreja alterado de "${church.name}" para "${value}". Todos os usuários associados serão atualizados.`,
            });
          } else {
            toast({
              title: 'Igreja atualizada',
              description:
                'As informações da igreja foram salvas e todos os usuários associados serão atualizados.',
            });
          }
        } else {
          toast({
            title: 'Igreja atualizada',
            description: 'As informações da igreja foram salvas.',
          });
        }
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar a igreja.',
        variant: 'destructive',
      });
    }
  };

  const deleteChurch = (churchId: number, churchName: string) => {
    if (
      window.confirm(
        `Tem certeza que deseja excluir a igreja "${churchName}"? Esta ação não pode ser desfeita.`
      )
    ) {
      setChurchesList(prev => prev.filter(church => church.id !== churchId));
      toast({
        title: 'Igreja excluída',
        description: `${churchName} foi removida do sistema.`,
        variant: 'destructive',
      });
    }
  };

  const handleClearAllData = async () => {
    const confirmed = await new Promise<boolean>(resolve => {
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

      keysToRemove.forEach(key => {
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

  const validateImportData = () => {
    const errors: string[] = [];
    const duplicates: string[] = [];
    const emails = new Set();

    const validatedData = importData.map((row, index) => {
      const validatedRow = { ...row, valid: true, errors: [] };
      const lineNumber = index + 1;

      // Check required fields
      const name = row.nome || row.Nome || row.name;
      if (!name || name.toString().trim() === '') {
        errors.push(`Linha ${lineNumber}: Nome é obrigatório`);
        validatedRow.valid = false;
      }

      // Validate email
      const email = row.email || row.Email;
      if (email) {
        const emailStr = email.toString().trim();
        if (emailStr && !emailStr.includes('@')) {
          errors.push(`Linha ${lineNumber}: Email "${emailStr}" é inválido`);
          validatedRow.valid = false;
        }
        if (emails.has(emailStr)) {
          duplicates.push(`Linha ${lineNumber}: Email "${emailStr}" duplicado`);
          validatedRow.valid = false;
        } else {
          emails.add(emailStr);
        }
      }

      // Validate phone
      const phone = row.celular || row.Celular || row.telefone || row.Telefone || row.phone;
      if (phone) {
        const phoneStr = phone.toString().trim();
        if (phoneStr && phoneStr.length < 10) {
          errors.push(`Linha ${lineNumber}: Telefone "${phoneStr}" muito curto`);
          validatedRow.valid = false;
        }
      }

      // Validate role/type
      const tipo = row.tipo || row.Tipo || row.role;
      if (tipo) {
        const tipoStr = tipo.toString().toLowerCase();
        const validRoles = [
          'admin',
          'superadmin',
          'pastor',
          'missionary',
          'member',
          'interested',
          'diácono',
          'membro',
          'interessado',
        ];
        if (!validRoles.some(role => tipoStr.includes(role))) {
          errors.push(
            `Linha ${lineNumber}: Tipo "${tipo}" não reconhecido. Use: Superadmin, Pastor, Missionary, Member ou Interested`
          );
          validatedRow.valid = false;
        }
      }

      return validatedRow;
    });

    setImportData(validatedData);
    setImportErrors([...errors, ...duplicates]);
    setImportDuplicates(duplicates);
  };

  const performImport = async () => {
    try {
      setImportStep('importing');
      setImportProgress(85);

      // Filter out only rows with critical errors (no name), allow others through
      const validRows = importData.filter(row => {
        const name = row.nome || row.Nome || row.name;
        return name && name.toString().trim() !== ''; // Only skip if no name at all
      });

      // Process in smaller batches to avoid payload size issues
      const batchSize = 50; // Process 50 users at a time
      let totalImported = 0;
      const totalSkipped = importData.length - validRows.length;

      let lastResult: {
        created?: number;
        updated?: number;
        errors?: number;
        skipped?: number;
        imported?: number;
        message?: string;
      } | null = null;

      for (let i = 0; i < validRows.length; i += batchSize) {
        const batch = validRows.slice(i, i + batchSize);

        const usersToImport = batch.map(row => {
          // Mapeamento completo de telefone com todas as variações
          const originalPhone =
            row.Celular ||
            row.celular ||
            row.telefone ||
            row.Telefone ||
            row.phone ||
            row['Celular'];
          const formattedPhone = formatPhoneNumber(originalPhone);

          // Check if phone was too short
          const phoneWarning = originalPhone && !formattedPhone;

          return {
            // Campos básicos
            name: row.Nome || row.nome || row.name || 'Usuário Importado',
            email:
              row.Email ||
              row.email ||
              `${(row.Nome || row.nome || 'usuario').toLowerCase().replace(/\s+/g, '.')}@igreja.com`,
            password: '123456', // Default password
            role: getRole(row.Tipo || row.tipo || row.role),

            // Campos da igreja
            church: row.Igreja || row.igreja || row.church || 'Igreja Principal',
            churchCode: row.Código || row.codigo || row.code,

            // Contato
            phone: formattedPhone,
            cpf: row.CPF || row.cpf,

            // Endereço
            address: row.Endereço || row.endereco || row.address,

            // Datas
            birthDate: parseDate(row.Nascimento || row.nascimento || row.birthDate),
            baptismDate: parseDate(row.Batismo || row.batismo || row.baptismDate),

            // Informações pessoais
            civilStatus: row['Estado civil'] || row.estadoCivil || row.civilStatus,
            occupation: row.Ocupação || row.ocupacao || row.profissao || row.occupation,
            education: row['Grau de educação'] || row.educacao || row.education,

            // ===== CAMPOS DE PONTUAÇÃO (COLUNAS DIRETAS DO BANCO) =====

            // Engajamento e Classificação (COLUNAS DIRETAS)
            engajamento: row.Engajamento || row.engajamento || null,
            classificacao: row.Classificação || row.classificacao || null,

            // Dados financeiros
            ...(() => {
              const dizimistaResult = parseDizimistaField(row.Dizimista || row.dizimista);
              return {
                isDonor: dizimistaResult.isDonor,
                dizimistaType: dizimistaResult.dizimistaType,
              };
            })(),
            ...(() => {
              const ofertanteResult = parseOfertanteField(row.Ofertante || row.ofertante);
              return {
                isOffering: ofertanteResult.isOffering,
                ofertanteType: ofertanteResult.ofertanteType,
              };
            })(),

            // Campos de pontuação - Colunas diretas do banco
            tempoBatismoAnos: (() => {
              // Tentar ler direto primeiro
              const direto = parseNumber(row['Tempo de batismo - anos'] || row.tempoBatismoAnos);
              if (direto > 0) return direto;

              // Se não tem, calcular a partir da data de batismo
              const dataBatismo = parseDate(row.Batismo || row.batismo || row.baptismDate);
              if (dataBatismo) {
                const hoje = new Date();
                const batismo = new Date(dataBatismo);
                const diffAnos = Math.floor(
                  (hoje.getTime() - batismo.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
                );
                return diffAnos > 0 ? diffAnos : 0;
              }
              return 0;
            })(),
            departamentosCargos:
              row['Departamentos e cargos'] || row.departamentosCargos || row.departamentos || null,
            nomeUnidade: row['Nome da unidade'] || row.nomeUnidade || null,
            temLicao: parseBooleanField(row['Tem lição'] || row.temLicao),
            totalPresenca: parseNumber(
              row['Total de presença'] || row.totalPresenca || row.presencaTotal
            ),
            comunhao: parseNumber(row.Comunhão || row.comunhao),
            missao: parseNumber(row.Missão || row.missao),
            estudoBiblico: parseNumber(row['Estudo bíblico'] || row.estudoBiblico),
            batizouAlguem: (() => {
              const valor = row['Batizou alguém'] || row.batizouAlguem;
              // Se é número, converter >0 para true
              if (typeof valor === 'number') return valor > 0;
              // Se é string/boolean, usar parseBooleanField
              return parseBooleanField(valor);
            })(),
            discPosBatismal: parseNumber(row['Disc. pós batismal'] || row.discPosBatismal),
            cpfValido: parseBooleanField(row['CPF válido'] || row.cpfValido),
            camposVazios: (() => {
              const valor = row['Campos vazios/inválidos'] || row.camposVazios;
              // Se é número: 0 = false, >0 = true
              if (typeof valor === 'number') return valor > 0;
              // Se é boolean, usar direto
              return parseBooleanField(valor);
            })(),

            // Escola Sabatina
            isEnrolledES: parseBooleanField(row['Matriculado na ES'] || row.matriculadoES),
            hasLesson: parseBooleanField(row['Tem lição'] || row.temLicao),
            esPeriod: row['Período ES'] || row.periodoES,

            // Dados espirituais
            previousReligion: row['Religião anterior'] || row.religiaoAnterior,
            biblicalInstructor: row['Instrutor bíblico'] || row.instrutorBiblico,

            // Departamentos
            departments: row['Departamentos e cargos'] || row.departamentos,

            // Dados extras completos (manter para compatibilidade e campos adicionais)
            extraData: JSON.stringify({
              // Dados básicos
              sexo: row.Sexo || row.sexo,
              idade: parseNumber(row.Idade || row.idade),
              codigo: row.Código || row.codigo,

              // REMOVIDO: engajamento e classificacao agora são colunas diretas
              // REMOVIDO: campos de pontuação agora são colunas diretas

              // Telefone
              phoneWarning: phoneWarning,
              originalPhone: phoneWarning ? originalPhone : null,

              // Endereço completo
              bairro: row.Bairro || row.bairro,
              cidadeEstado: row['Cidade e Estado'] || row.cidadeEstado,
              cidadeNascimento: row['Cidade de nascimento'] || row.cidadeNascimento,
              estadoNascimento: row['Estado de nascimento'] || row.estadoNascimento,
              cpf: row.CPF || row.cpf,

              // Quantidade real de "Batizou alguém" (se for número)
              quantidadeBatizados:
                typeof (row['Batizou alguém'] || row.batizouAlguem) === 'number'
                  ? parseNumber(row['Batizou alguém'] || row.batizouAlguem)
                  : 0,

              // Dízimos
              dizimos12m: row['Dízimos - 12m'] || row.dizimos12m,
              ultimoDizimo: row['Último dízimo - 12m'] || row.ultimoDizimo,
              valorDizimo: row['Valor dízimo - 12m'] || row.valorDizimo,
              numeroMesesSemDizimar: row['Número de meses s/ dizimar'] || row.numeroMesesSemDizimar,
              dizimistaAntesUltimoDizimo:
                row['Dizimista antes do últ. dízimo'] || row.dizimistaAntesUltimoDizimo,
              dizimistaType: (() => {
                const dizimistaResult = parseDizimistaField(row.Dizimista || row.dizimista);
                return dizimistaResult.dizimistaType;
              })(),

              // Ofertas
              ofertas12m: row['Ofertas - 12m'] || row.ofertas12m,
              ultimaOferta: row['Última oferta - 12m'] || row.ultimaOferta,
              valorOferta: row['Valor oferta - 12m'] || row.valorOferta,
              numeroMesesSemOfertar: row['Número de meses s/ ofertar'] || row.numeroMesesSemOfertar,
              ofertanteAntesUltimaOferta:
                row['Ofertante antes da últ. oferta'] || row.ofertanteAntesUltimaOferta,
              ofertanteType: (() => {
                const ofertanteResult = parseOfertanteField(row.Ofertante || row.ofertante);
                return ofertanteResult.ofertanteType;
              })(),

              // Movimentos
              ultimoMovimento: row['Último movimento'] || row.ultimoMovimento,
              dataUltimoMovimento: row['Data do último movimento'] || row.dataUltimoMovimento,
              tipoEntrada: row['Tipo de entrada'] || row.tipoEntrada,

              // Batismo
              tempoBatismo: row['Tempo de batismo'] || row.tempoBatismo,
              localidadeBatismo: row['Localidade do batismo'] || row.localidadeBatismo,
              batizadoPor: row['Batizado por'] || row.batizadoPor,
              idadeBatismo: row['Idade no Batismo'] || row.idadeBatismo,
              // REMOVIDO: tempoBatismoAnos (agora é coluna direta)

              // Conversão
              comoConheceu: row['Como conheceu a IASD'] || row.comoConheceu,
              fatorDecisivo: row['Fator decisivo'] || row.fatorDecisivo,
              comoEstudou: row['Como estudou a Bíblia'] || row.comoEstudou,
              instrutorBiblico2: row['Instrutor bíblico 2'] || row.instrutorBiblico2,

              // Cargos e departamentos
              temCargo: row['Tem cargo'] || row.temCargo,
              teen: row.Teen || row.teen,
              // REMOVIDO: departamentosCargos (agora é coluna direta)

              // Família
              nomeMae: row['Nome da mãe'] || row.nomeMae,
              nomePai: row['Nome do pai'] || row.nomePai,
              dataCasamento: parseDate(row['Data de casamento'] || row.dataCasamento),

              // REMOVIDO: Campos de endereço já adicionados acima (linha 1278-1283)

              // REMOVIDO: Campos que agora são colunas diretas do banco
              // nomeUnidade, comunhao, missao, estudoBiblico, batizouAlguem,
              // discPosBatismal, totalPresenca, cpfValido, camposVazios, temLicao

              // Presença (dados extras, não usados no cálculo)
              presencaCartao: parseNumber(row['Total presença no cartão'] || row.presencaCartao),
              presencaQuizLocal: parseNumber(
                row['Presença no quiz local'] || row.presencaQuizLocal
              ),
              presencaQuizOutra: parseNumber(
                row['Presença no quiz outra unidade'] || row.presencaQuizOutraUnidade
              ),
              presencaQuizOnline: parseNumber(
                row['Presença no quiz online'] || row.presencaQuizOnline
              ),
              teveParticipacao: row['Teve participação'] || row.teveParticipacao,
              matriculadoES: parseBooleanField(row['Matriculado na ES'] || row.matriculadoES),

              // Colaboração
              campoColaborador: row['Campo - colaborador'] || row.campoColaborador,
              areaColaborador: row['Área - colaborador'] || row.areaColaborador,
              estabelecimentoColaborador:
                row['Estabelecimento - colaborador'] || row.estabelecimentoColaborador,
              funcaoColaborador: row['Função - colaborador'] || row.funcaoColaborador,

              // Validação (referência para debug)
              nomeCamposVazios: row['Nome dos campos vazios no ACMS'] || row.nomeCamposVazios,

              // Educação
              alunoEducacao: row['Aluno educação Adv.'] || row.alunoEducacao,
              parentesco: row['Parentesco p/ c/ aluno'] || row.parentesco,
            }),

            // Observações
            observations:
              [
                row['Como estudou a Bíblia'] && `Como estudou: ${row['Como estudou a Bíblia']}`,
                row['Teve participação'] && `Participação: ${row['Teve participação']}`,
                row['Campos vazios/inválidos'] &&
                  `Campos vazios: ${row['Campos vazios/inválidos']}`,
                row['Tempo de batismo'] && `Tempo de batismo: ${row['Tempo de batismo']}`,
                row['Engajamento'] && `Engajamento: ${row['Engajamento']}`,
                row['Classificação'] && `Classificação: ${row['Classificação']}`,
              ]
                .filter(Boolean)
                .join(' | ') || null,
          };
        });

        const response = await fetch('/api/users/bulk-import', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            users: usersToImport,
            allowUpdates: importErrors.length > 0, // Se há erros, permite atualizações
          }),
        });

        const result = await response.json();
        lastResult = result;

        if (response.ok) {
          totalImported += result.imported + (result.updated || 0);

          // Update progress
          const progress = 85 + ((i + batchSize) / validRows.length) * 15;
          setImportProgress(Math.min(progress, 100));
        } else {
          throw new Error(result.error || 'Erro na importação');
        }
      }

      // Complete the import
      setImportProgress(100);
      setImportStep('complete');

      // Show the server's message which includes duplicate handling
      toast({
        title: 'Importação concluída!',
        description: lastResult?.message || `${totalImported} usuários importados com sucesso`,
      });

      // Recarregar igrejas se o usuário for admin
      if (hasAdminAccess(user)) {
        await loadChurches();
      }

      // Dispatch custom event to update dashboard
      window.dispatchEvent(new CustomEvent('user-imported'));
    } catch (error) {
      console.error('Import error:', error);

      // Show more detailed error information
      let errorMessage = 'Ocorreu um erro durante a importação.';
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      toast({
        title: 'Erro na importação',
        description: errorMessage,
        variant: 'destructive',
      });
      setImportStep('validation');
    }
  };

  const getRole = (tipo: string): string => {
    if (!tipo) return 'member';
    const tipoLower = tipo.toLowerCase().trim();

    // Superadmin roles
    if (
      tipoLower.includes('superadmin') ||
      tipoLower.includes('super admin') ||
      tipoLower.includes('super-adm') ||
      tipoLower.includes('admin geral')
    ) {
      return 'superadmin';
    }

    // Admin/Pastor roles
    if (
      tipoLower.includes('admin') ||
      tipoLower.includes('pastor') ||
      tipoLower.includes('pastora') ||
      tipoLower.includes('ministro') ||
      tipoLower.includes('ministra') ||
      tipoLower.includes('líder') ||
      tipoLower.includes('lider') ||
      tipoLower.includes('coordenador') ||
      tipoLower.includes('coordenadora')
    ) {
      return 'pastor';
    }

    // Missionary/Diácono roles
    if (
      tipoLower.includes('mission') ||
      tipoLower.includes('missionário') ||
      tipoLower.includes('missionaria') ||
      tipoLower.includes('diácon') ||
      tipoLower.includes('diacon') ||
      tipoLower.includes('evangelista') ||
      tipoLower.includes('pioneiro') ||
      tipoLower.includes('pioneira') ||
      tipoLower.includes('colportor') ||
      tipoLower.includes('colportora')
    ) {
      return 'missionary';
    }

    // Interested/Visitor roles
    if (
      tipoLower.includes('interest') ||
      tipoLower.includes('interessado') ||
      tipoLower.includes('interessada') ||
      tipoLower.includes('visit') ||
      tipoLower.includes('visitante') ||
      tipoLower.includes('simpatizante') ||
      tipoLower.includes('estudante') ||
      tipoLower.includes('candidato') ||
      tipoLower.includes('candidata') ||
      tipoLower.includes('prospecto') ||
      tipoLower.includes('prospecta')
    ) {
      return 'interested';
    }

    // Member roles (default)
    if (
      tipoLower.includes('member') ||
      tipoLower.includes('membro') ||
      tipoLower.includes('fiel') ||
      tipoLower.includes('batizado') ||
      tipoLower.includes('batizada') ||
      tipoLower.includes('adventista') ||
      tipoLower.includes('crente') ||
      tipoLower.includes('frequentador') ||
      tipoLower.includes('frequentadora')
    ) {
      return 'member';
    }

    // Default to member if no match found
    return 'member';
  };

  const parseNumber = (value: unknown): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const num = parseFloat(value.replace(',', '.'));
      return isNaN(num) ? 0 : num;
    }
    return 0;
  };

  const parseDate = (dateValue: unknown): Date | null => {
    if (!dateValue) return null;

    try {
      // Limpa a string (remove espaços, aspas)
      const dateStr = String(dateValue).trim().replace(/['"]/g, '');
      console.log(`Tentando processar data: "${dateStr}" (tipo original: ${typeof dateValue})`);

      // 1. Detecção de Números do Excel (serial dates)
      if (typeof dateValue === 'number') {
        console.log(`Detectado número do Excel: ${dateValue}`);
        // Excel armazena datas como número de dias desde 1/1/1900
        // Mas o JavaScript usa 1/1/1970 como epoch, então precisamos ajustar
        const excelEpoch = new Date(1900, 0, 1); // 1 de janeiro de 1900
        const daysSinceEpoch = dateValue - 2; // Excel tem bug do ano bissexto 1900
        const date = new Date(excelEpoch.getTime() + daysSinceEpoch * 24 * 60 * 60 * 1000);

        if (!isNaN(date.getTime()) && date.getFullYear() > 1900) {
          console.log(
            `Data do Excel convertida: ${date.toISOString()} (${date.toLocaleDateString('pt-BR')})`
          );
          return date;
        }
      }

      // 2. Formato DD/MM/YYYY (formato brasileiro padrão)
      if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
          const [day, month, year] = parts;
          const parsedDay = parseInt(day);
          const parsedMonth = parseInt(month);
          let parsedYear = parseInt(year);

          // Se o ano tem 2 dígitos, converte para 4 dígitos
          if (parsedYear < 100) {
            parsedYear += parsedYear < 50 ? 2000 : 1900;
          }

          console.log(`Partes da data: dia=${parsedDay}, mês=${parsedMonth}, ano=${parsedYear}`);

          // Validação de dados
          if (
            parsedDay >= 1 &&
            parsedDay <= 31 &&
            parsedMonth >= 1 &&
            parsedMonth <= 12 &&
            parsedYear >= 1900 &&
            parsedYear <= 2100
          ) {
            const date = new Date(parsedYear, parsedMonth - 1, parsedDay);
            // Verifica se a data é válida (handles edge cases like 31/02/2023)
            if (
              date.getDate() === parsedDay &&
              date.getMonth() === parsedMonth - 1 &&
              date.getFullYear() === parsedYear
            ) {
              console.log(
                `Data DD/MM/YYYY válida: ${date.toISOString()} (${date.toLocaleDateString('pt-BR')})`
              );
              return date;
            } else {
              console.log(`Data DD/MM/YYYY inválida após criação: ${date.toISOString()}`);
            }
          } else {
            console.log(
              `Partes da data DD/MM/YYYY inválidas: dia=${parsedDay}, mês=${parsedMonth}, ano=${parsedYear}`
            );
          }
        }
      }

      // 3. Formato DD-MM-YYYY
      if (dateStr.includes('-') && dateStr.match(/^\d{1,2}-\d{1,2}-\d{4}$/)) {
        const parts = dateStr.split('-');
        const [day, month, year] = parts;
        const parsedDay = parseInt(day);
        const parsedMonth = parseInt(month);
        const parsedYear = parseInt(year);

        if (
          parsedDay >= 1 &&
          parsedDay <= 31 &&
          parsedMonth >= 1 &&
          parsedMonth <= 12 &&
          parsedYear >= 1900 &&
          parsedYear <= 2100
        ) {
          const date = new Date(parsedYear, parsedMonth - 1, parsedDay);
          if (
            date.getDate() === parsedDay &&
            date.getMonth() === parsedMonth - 1 &&
            date.getFullYear() === parsedYear
          ) {
            console.log(
              `Data DD-MM-YYYY válida: ${date.toISOString()} (${date.toLocaleDateString('pt-BR')})`
            );
            return date;
          }
        }
      }

      // 4. Formato YYYY-MM-DD (formato ISO)
      if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime()) && date.getFullYear() > 1900) {
          console.log(
            `Data ISO válida: ${date.toISOString()} (${date.toLocaleDateString('pt-BR')})`
          );
          return date;
        }
      }

      // 5. Formato YYYY/MM/DD (formato alternativo)
      if (dateStr.match(/^\d{4}\/\d{2}\/\d{2}$/)) {
        const parts = dateStr.split('/');
        const [year, month, day] = parts;
        const parsedYear = parseInt(year);
        const parsedMonth = parseInt(month);
        const parsedDay = parseInt(day);

        if (
          parsedYear >= 1900 &&
          parsedYear <= 2100 &&
          parsedMonth >= 1 &&
          parsedMonth <= 12 &&
          parsedDay >= 1 &&
          parsedDay <= 31
        ) {
          const date = new Date(parsedYear, parsedMonth - 1, parsedDay);
          if (
            date.getDate() === parsedDay &&
            date.getMonth() === parsedMonth - 1 &&
            date.getFullYear() === parsedYear
          ) {
            console.log(
              `Data YYYY/MM/DD válida: ${date.toISOString()} (${date.toLocaleDateString('pt-BR')})`
            );
            return date;
          }
        }
      }

      // 6. Formato DD.MM.YYYY
      if (dateStr.includes('.') && dateStr.match(/^\d{1,2}\.\d{1,2}\.\d{4}$/)) {
        const parts = dateStr.split('.');
        const [day, month, year] = parts;
        const parsedDay = parseInt(day);
        const parsedMonth = parseInt(month);
        const parsedYear = parseInt(year);

        if (
          parsedDay >= 1 &&
          parsedDay <= 31 &&
          parsedMonth >= 1 &&
          parsedMonth <= 12 &&
          parsedYear >= 1900 &&
          parsedYear <= 2100
        ) {
          const date = new Date(parsedYear, parsedMonth - 1, parsedDay);
          if (
            date.getDate() === parsedDay &&
            date.getMonth() === parsedMonth - 1 &&
            date.getFullYear() === parsedYear
          ) {
            console.log(
              `Data DD.MM.YYYY válida: ${date.toISOString()} (${date.toLocaleDateString('pt-BR')})`
            );
            return date;
          }
        }
      }

      // 7. Formato DD.MM.YY
      if (dateStr.includes('.') && dateStr.match(/^\d{1,2}\.\d{1,2}\.\d{2}$/)) {
        const parts = dateStr.split('.');
        const [day, month, year] = parts;
        const parsedDay = parseInt(day);
        const parsedMonth = parseInt(month);
        let parsedYear = parseInt(year);

        // Se o ano tem 2 dígitos, converte para 4 dígitos
        parsedYear += parsedYear < 50 ? 2000 : 1900;

        if (
          parsedDay >= 1 &&
          parsedDay <= 31 &&
          parsedMonth >= 1 &&
          parsedMonth <= 12 &&
          parsedYear >= 1900 &&
          parsedYear <= 2100
        ) {
          const date = new Date(parsedYear, parsedMonth - 1, parsedDay);
          if (
            date.getDate() === parsedDay &&
            date.getMonth() === parsedMonth - 1 &&
            date.getFullYear() === parsedYear
          ) {
            console.log(
              `Data DD.MM.YY válida: ${date.toISOString()} (${date.toLocaleDateString('pt-BR')})`
            );
            return date;
          }
        }
      }

      // 8. Intervalos com ano (ex: "15/01-20/02/2024") - usa a primeira data
      if (dateStr.includes('-') && dateStr.includes('/')) {
        const match = dateStr.match(/^(\d{1,2}\/\d{1,2})-\d{1,2}\/\d{1,2}\/(\d{4})$/);
        if (match) {
          const firstDate = `${match[1]}/${match[2]}`; // "15/01/2024"
          console.log(`Detectado intervalo, usando primeira data: ${firstDate}`);
          return parseDate(firstDate);
        }
      }

      // 9. Intervalos sem ano (ex: "24/07-03/08") - usa ano atual
      if (dateStr.includes('-') && dateStr.includes('/') && !dateStr.match(/\d{4}/)) {
        const match = dateStr.match(/^(\d{1,2}\/\d{1,2})-\d{1,2}\/\d{1,2}$/);
        if (match) {
          const currentYear = new Date().getFullYear();
          const firstDate = `${match[1]}/${currentYear}`; // "24/07/2024"
          console.log(
            `Detectado intervalo sem ano, usando primeira data com ano atual: ${firstDate}`
          );
          return parseDate(firstDate);
        }
      }

      // 10. Data sem ano (ex: "03/12") - usa ano atual
      if (dateStr.match(/^\d{1,2}\/\d{1,2}$/)) {
        const currentYear = new Date().getFullYear();
        const dateWithYear = `${dateStr}/${currentYear}`;
        console.log(`Data sem ano detectada, adicionando ano atual: ${dateWithYear}`);
        return parseDate(dateWithYear);
      }

      // 11. Fallback: tenta o construtor padrão do JavaScript
      const date = new Date(dateValue as string | number | Date);
      if (!isNaN(date.getTime()) && date.getFullYear() > 1900) {
        console.log(
          `Data processada por fallback: ${date.toISOString()} (${date.toLocaleDateString('pt-BR')})`
        );
        return date;
      }

      console.log(`Não foi possível processar a data: "${dateStr}"`);
      return null;
    } catch (error) {
      console.log(`Erro ao processar data: ${error}`);
      return null;
    }
  };

  const parseBooleanField = (value: unknown): boolean => {
    if (!value) return false;
    const str = String(value).toLowerCase();
    return str === 'sim' || str === 'true' || str === '1' || str === 'yes';
  };

  // Função para detectar e mapear valores de dizimista
  const parseDizimistaField = (value: unknown): { isDonor: boolean; dizimistaType: string } => {
    if (!value) return { isDonor: false, dizimistaType: 'Não Dizimista' };

    const str = String(value).trim();
    const lowerStr = str.toLowerCase();

    // Mapeamento dos valores textuais
    if (
      lowerStr === 'não dizimista' ||
      lowerStr === 'nao dizimista' ||
      lowerStr === 'não' ||
      lowerStr === 'nao' ||
      lowerStr === 'n'
    ) {
      return { isDonor: false, dizimistaType: 'Não Dizimista' };
    }

    if (lowerStr === 'pontual (1-3)' || lowerStr === 'pontual' || lowerStr.includes('pontual')) {
      return { isDonor: true, dizimistaType: 'Pontual (1-3)' };
    }

    if (lowerStr === 'sazonal (4-7)' || lowerStr === 'sazonal' || lowerStr.includes('sazonal')) {
      return { isDonor: true, dizimistaType: 'Sazonal (4-7)' };
    }

    if (
      lowerStr === 'recorrente (8-12)' ||
      lowerStr === 'recorrente' ||
      lowerStr.includes('recorrente')
    ) {
      return { isDonor: true, dizimistaType: 'Recorrente (8-12)' };
    }

    // Fallback para valores booleanos tradicionais
    if (lowerStr === 'sim' || lowerStr === 'true' || lowerStr === '1' || lowerStr === 'yes') {
      return { isDonor: true, dizimistaType: 'Sim' };
    }

    // Se não reconhecer, assume que é um dizimista com o valor original
    return { isDonor: true, dizimistaType: str };
  };

  // Função para detectar e mapear valores de ofertante
  const parseOfertanteField = (value: unknown): { isOffering: boolean; ofertanteType: string } => {
    if (!value) return { isOffering: false, ofertanteType: 'Não Ofertante' };

    const str = String(value).trim();
    const lowerStr = str.toLowerCase();

    // Mapeamento dos valores textuais
    if (
      lowerStr === 'não ofertante' ||
      lowerStr === 'nao ofertante' ||
      lowerStr === 'não' ||
      lowerStr === 'nao' ||
      lowerStr === 'n'
    ) {
      return { isOffering: false, ofertanteType: 'Não Ofertante' };
    }

    if (lowerStr === 'pontual (1-3)' || lowerStr === 'pontual' || lowerStr.includes('pontual')) {
      return { isOffering: true, ofertanteType: 'Pontual (1-3)' };
    }

    if (lowerStr === 'sazonal (4-7)' || lowerStr === 'sazonal' || lowerStr.includes('sazonal')) {
      return { isOffering: true, ofertanteType: 'Sazonal (4-7)' };
    }

    if (
      lowerStr === 'recorrente (8-12)' ||
      lowerStr === 'recorrente' ||
      lowerStr.includes('recorrente')
    ) {
      return { isOffering: true, ofertanteType: 'Recorrente (8-12)' };
    }

    // Fallback para valores booleanos tradicionais
    if (lowerStr === 'sim' || lowerStr === 'true' || lowerStr === '1' || lowerStr === 'yes') {
      return { isOffering: true, ofertanteType: 'Sim' };
    }

    // Se não reconhecer, assume que é um ofertante com o valor original
    return { isOffering: true, ofertanteType: str };
  };

  const formatPhoneNumber = (phone: unknown): string | null => {
    if (!phone) return null;

    const cleanPhone = String(phone).replace(/[^0-9]/g, '');

    if (cleanPhone.length < 10) {
      return null; // Return null for short phones - will be ignored
    }

    let formattedPhone = '';

    // If doesn't start with 55 (Brazil code), add it
    if (!cleanPhone.startsWith('55') && cleanPhone.length === 11) {
      formattedPhone = `55${cleanPhone}`;
    } else if (!cleanPhone.startsWith('55') && cleanPhone.length === 10) {
      formattedPhone = `55${cleanPhone}`;
    } else {
      formattedPhone = cleanPhone;
    }

    // Format to +55(DDD)99999-9999 or +55(DDD)9999-9999
    if (formattedPhone.length === 13) {
      // 55 + 11 digits
      const countryCode = formattedPhone.substring(0, 2);
      const areaCode = formattedPhone.substring(2, 4);
      const firstPart = formattedPhone.substring(4, 9);
      const lastPart = formattedPhone.substring(9, 13);
      return `+${countryCode}(${areaCode})${firstPart}-${lastPart}`;
    } else if (formattedPhone.length === 12) {
      // 55 + 10 digits
      const countryCode = formattedPhone.substring(0, 2);
      const areaCode = formattedPhone.substring(2, 4);
      const firstPart = formattedPhone.substring(4, 8);
      const lastPart = formattedPhone.substring(8, 12);
      return `+${countryCode}(${areaCode})${firstPart}-${lastPart}`;
    } else {
      // Keep original if doesn't match expected format
      return cleanPhone;
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
                    onCheckedChange={checked =>
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
                    onCheckedChange={async checked => {
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
                    onCheckedChange={checked =>
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
                    onCheckedChange={checked =>
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
                    onCheckedChange={checked =>
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
                      onCheckedChange={checked =>
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
                      onCheckedChange={checked =>
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
                      onCheckedChange={checked =>
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
                    <div className="p-4 bg-gray-50 rounded-lg border">
                      <p className="text-sm text-gray-600 mb-4">
                        Arraste e solte os elementos para ajustar suas posições no header móvel
                      </p>

                      {/* Preview do Mobile Header */}
                      <div className="bg-white rounded-lg border p-4 mb-4">
                        <div className="text-xs text-gray-500 mb-2 text-center">
                          Preview do Header
                        </div>
                        <div className="bg-gradient-to-r from-white via-blue-50/30 to-purple-50/30 rounded-lg p-3 border">
                          <div className="flex items-center gap-3">
                            {/* Logo */}
                            <div
                              className="relative cursor-move bg-blue-100 p-2 rounded border-2 border-dashed border-blue-300"
                              draggable
                              onDragStart={e => {
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
                              onDragStart={e => {
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
                              onDragStart={e => {
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
                                onChange={e =>
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
                                onChange={e =>
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
                                onChange={e =>
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
                                onChange={e =>
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
                                onChange={e =>
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
                                onChange={e =>
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

          {/* Points Configuration (Admin only) */}
          {hasAdminAccess(user) && (
            <TabsContent value="points-config" className="space-y-4">
              <PointsConfiguration />
            </TabsContent>
          )}

          {/* Church Management (Admin only) */}
          {hasAdminAccess(user) && (
            <TabsContent value="church" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Globe className="h-5 w-5" />
                        Gestão de Igrejas
                      </CardTitle>
                      <CardDescription>Clique nos campos para editar diretamente</CardDescription>
                    </div>
                    <Button
                      onClick={addNewChurch}
                      data-testid="add-church-button"
                      className="w-full sm:w-auto"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Nova Igreja
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Default Church Configuration */}
                  <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <Star className="h-5 w-5 text-blue-600" />
                      <h3 className="font-semibold text-blue-900">Igreja Padrão</h3>
                    </div>
                    <p className="text-sm text-blue-700 mb-4">
                      Esta igreja será usada como padrão para novos usuários e usuários sem igreja
                      definida.
                    </p>
                    <div className="flex items-center gap-3">
                      <Select
                        value={defaultChurchId?.toString() || ''}
                        onValueChange={value => setDefaultChurchId(parseInt(value))}
                      >
                        <SelectTrigger className="w-full sm:w-64">
                          <SelectValue placeholder="Selecione a igreja padrão" />
                        </SelectTrigger>
                        <SelectContent>
                          {churchesList.map(church => (
                            <SelectItem key={church.id} value={church.id.toString()}>
                              {church.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        onClick={saveDefaultChurch}
                        disabled={!defaultChurchId || isSavingDefault}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {isSavingDefault ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        Salvar
                      </Button>
                    </div>
                    {defaultChurchName && (
                      <div className="mt-3 p-2 bg-blue-100 rounded text-sm text-blue-800">
                        <strong>Igreja padrão atual:</strong> {defaultChurchName}
                      </div>
                    )}
                  </div>

                  {/* Tabela Responsiva */}
                  <div className="space-y-2">
                    {/* Header da Tabela - Apenas em Desktop */}
                    <div className="hidden sm:grid sm:grid-cols-12 gap-2 px-3 py-2 bg-muted/50 rounded-lg text-sm font-medium">
                      <div className="col-span-4">Nome da Igreja</div>
                      <div className="col-span-5">Endereço</div>
                      <div className="col-span-1 text-center">Status</div>
                      <div className="col-span-2 text-center">Ações</div>
                    </div>

                    {/* Lista de Igrejas */}
                    {churchesList.map(church => (
                      <div
                        key={church.id}
                        className="border rounded-lg p-3 hover:bg-muted/20 transition-colors"
                      >
                        {/* Layout Mobile */}
                        <div className="sm:hidden space-y-3">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="text-sm font-medium text-muted-foreground">
                                Nome:
                              </label>
                              <Badge variant={church.active ? 'secondary' : 'destructive'}>
                                {church.active ? 'Ativa' : 'Inativa'}
                              </Badge>
                            </div>
                            <EditableField
                              value={church.name}
                              onSave={value => updateChurchField(church.id, 'name', value)}
                              className="font-medium"
                              data-testid={`church-name-${church.id}`}
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">
                              Endereço:
                            </label>
                            <EditableField
                              value={church.address}
                              onSave={value => updateChurchField(church.id, 'address', value)}
                              className="text-sm"
                              data-testid={`church-address-${church.id}`}
                            />
                          </div>

                          <div className="flex gap-2 pt-2">
                            <Button
                              variant={church.active ? 'secondary' : 'default'}
                              size="sm"
                              onClick={() => toggleChurchStatus(church.id)}
                              className="flex-1"
                              data-testid={`toggle-church-${church.id}`}
                            >
                              {church.active ? 'Desativar' : 'Ativar'}
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => deleteChurch(church.id, church.name)}
                              data-testid={`delete-church-${church.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Layout Desktop */}
                        <div className="hidden sm:grid sm:grid-cols-12 gap-2 items-center">
                          <div className="col-span-4">
                            <EditableField
                              value={church.name}
                              onSave={value => updateChurchField(church.id, 'name', value)}
                              className="font-medium"
                              data-testid={`church-name-${church.id}`}
                            />
                          </div>

                          <div className="col-span-5">
                            <EditableField
                              value={church.address}
                              onSave={value => updateChurchField(church.id, 'address', value)}
                              className="text-sm"
                              data-testid={`church-address-${church.id}`}
                            />
                          </div>

                          <div className="col-span-1 flex justify-center">
                            <Badge variant={church.active ? 'secondary' : 'destructive'}>
                              {church.active ? 'Ativa' : 'Inativa'}
                            </Badge>
                          </div>

                          <div className="col-span-2 flex gap-1 justify-center">
                            <Button
                              variant={church.active ? 'secondary' : 'default'}
                              size="sm"
                              onClick={() => toggleChurchStatus(church.id)}
                              data-testid={`toggle-church-${church.id}`}
                            >
                              {church.active ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => deleteChurch(church.id, church.name)}
                              data-testid={`delete-church-${church.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}

                    {churchesList.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium">Nenhuma igreja cadastrada</p>
                        <p className="text-sm">Adicione a primeira igreja do sistema</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
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
                  </CardTitle>
                  <CardDescription>
                    Importar, exportar e gerenciar eventos da agenda
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
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
                      </div>
                    </div>

                    {/* Ações de Gerenciamento */}
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Gerenciamento</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Button
                          onClick={() => setShowPermissionsModal(true)}
                          variant="outline"
                          className="h-auto p-4 flex flex-col items-start gap-2"
                        >
                          <div className="flex items-center gap-2">
                            <Filter className="h-4 w-4" />
                            <span className="font-medium">Permissões</span>
                          </div>
                          <span className="text-sm text-muted-foreground text-left">
                            Gerenciar permissões de visualização de eventos
                          </span>
                        </Button>

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
                            Baixar todos os eventos em formato Excel
                          </span>
                        </Button>
                      </div>
                    </div>

                    {/* Ações de Limpeza */}
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
                  </CardTitle>
                  <CardDescription>Backup e restauração de dados</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
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

                    <Button
                      variant="destructive"
                      className="flex-1"
                      data-testid="button-delete-data"
                      onClick={handleClearAllData}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Limpar Dados
                    </Button>
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
      <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Importar Usuários
            </DialogTitle>
            <DialogDescription>
              Importe dados de usuários a partir de arquivos Excel (.xlsx) ou CSV
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Progresso da Importação</span>
                <span>{importProgress}%</span>
              </div>
              <Progress value={importProgress} className="w-full" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span className={importStep === 'upload' ? 'text-primary font-medium' : ''}>
                  Upload
                </span>
                <span className={importStep === 'preview' ? 'text-primary font-medium' : ''}>
                  Preview
                </span>
                <span className={importStep === 'mapping' ? 'text-primary font-medium' : ''}>
                  Mapeamento
                </span>
                <span className={importStep === 'validation' ? 'text-primary font-medium' : ''}>
                  Validação
                </span>
                <span className={importStep === 'importing' ? 'text-primary font-medium' : ''}>
                  Importando
                </span>
                <span className={importStep === 'complete' ? 'text-primary font-medium' : ''}>
                  Concluído
                </span>
              </div>
            </div>

            {/* Upload Step */}
            {importStep === 'upload' && (
              <div className="space-y-4">
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                  <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Selecione o arquivo</h3>
                    <p className="text-sm text-muted-foreground">
                      Formatos aceitos: .xlsx, .csv (máximo 10MB)
                    </p>
                  </div>
                  <input
                    type="file"
                    accept=".xlsx,.csv"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setImportFile(file);
                        processRealFile(file);
                      }
                    }}
                    className="mt-4"
                    data-testid="file-upload"
                  />
                </div>

                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Colunas reconhecidas:</strong> Igreja, Nome, Código, Tipo, Sexo, Idade,
                    Nascimento, Engajamento, Classificação, Dizimista, Ofertante, Email, Celular,
                    CPF, Estado civil, Ocupação, Grau de educação, Batismo, Religião anterior,
                    Instrutor bíblico, Departamentos e cargos, Nome da mãe/pai, Bairro, Endereço,
                    Matriculado na ES, Tem lição, e muitos outros campos específicos da IASD.
                    <br />
                    <strong>Formatos aceitos:</strong> Telefone (qualquer formato), Email (com @),
                    Datas (DD/MM/AAAA ou outros formatos), Valores Sim/Não para campos booleanos
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {/* Preview Step */}
            {importStep === 'preview' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Preview dos Dados</h3>
                  <Badge variant="secondary">{importData.length} registros encontrados</Badge>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Igreja</TableHead>
                        <TableHead>Código</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Celular</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importData.slice(0, 5).map((row, index) => (
                        <TableRow key={index}>
                          <TableCell>{row.Nome || row.nome || 'N/A'}</TableCell>
                          <TableCell>{row.Igreja || row.igreja || 'N/A'}</TableCell>
                          <TableCell>{row.Código || row.codigo || 'N/A'}</TableCell>
                          <TableCell>{row.Tipo || row.tipo || 'N/A'}</TableCell>
                          <TableCell>{row.Email || row.email || 'N/A'}</TableCell>
                          <TableCell>{row.Celular || row.celular || 'N/A'}</TableCell>
                          <TableCell>
                            <Badge variant={row.valid !== false ? 'secondary' : 'destructive'}>
                              {row.valid !== false ? 'Válido' : 'Erro'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {importData.length > 5 && (
                  <p className="text-sm text-muted-foreground text-center">
                    Mostrando 5 de {importData.length} registros
                  </p>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      setImportStep('mapping');
                      setImportProgress(50);
                    }}
                    data-testid="continue-mapping"
                  >
                    Continuar para Mapeamento
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setImportStep('upload');
                      setImportProgress(0);
                      setImportFile(null);
                    }}
                  >
                    Voltar
                  </Button>
                </div>
              </div>
            )}

            {/* Mapping Step */}
            {importStep === 'mapping' && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Mapeamento de Colunas</h3>
                <p className="text-sm text-muted-foreground">
                  Confirme o mapeamento automático das colunas ou ajuste conforme necessário
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { field: 'nome', label: 'Nome', required: true },
                    { field: 'email', label: 'Email', required: true },
                    { field: 'celular', label: 'Telefone', required: true },
                    { field: 'tipo', label: 'Tipo de Usuário', required: true },
                    { field: 'igreja', label: 'Igreja', required: false },
                    { field: 'nascimento', label: 'Data de Nascimento', required: false },
                  ].map(mapping => (
                    <div key={mapping.field} className="space-y-2">
                      <Label>
                        {mapping.label}
                        {mapping.required && <span className="text-destructive ml-1">*</span>}
                      </Label>
                      <Select defaultValue={mapping.field}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={mapping.field}>
                            {mapping.field.charAt(0).toUpperCase() + mapping.field.slice(1)}
                          </SelectItem>
                          <SelectItem value="none">Não mapear</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      setImportStep('validation');
                      setImportProgress(75);
                      validateImportData();
                    }}
                    data-testid="continue-validation"
                  >
                    Continuar para Validação
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setImportStep('preview');
                      setImportProgress(25);
                    }}
                  >
                    Voltar
                  </Button>
                </div>
              </div>
            )}

            {/* Validation Step */}
            {importStep === 'validation' && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Validação dos Dados</h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="font-medium">{importData.filter(r => r.valid).length}</p>
                          <p className="text-sm text-muted-foreground">Registros válidos</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-yellow-600" />
                        <div>
                          <p className="font-medium">{importErrors.length}</p>
                          <p className="text-sm text-muted-foreground">Erros encontrados</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <X className="h-5 w-5 text-red-600" />
                        <div>
                          <p className="font-medium">{importDuplicates.length}</p>
                          <p className="text-sm text-muted-foreground">Duplicatas</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {importErrors.length > 0 && (
                  <Alert variant="default">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-1">
                        <p className="font-medium">Avisos encontrados (linhas serão ignoradas):</p>
                        <ul className="list-disc pl-4 space-y-1">
                          {importErrors.slice(0, 3).map((error, index) => (
                            <li key={index} className="text-sm">
                              {error}
                            </li>
                          ))}
                        </ul>
                        {importErrors.length > 3 && (
                          <p className="text-sm">E mais {importErrors.length - 3} avisos...</p>
                        )}
                        <p className="text-sm font-medium mt-2">
                          Somente linhas sem nome serão ignoradas. Outros erros serão corrigidos
                          automaticamente.
                        </p>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-2">
                  <Button onClick={performImport} data-testid="start-import">
                    {importErrors.length > 0 ? 'Importar (ignorar erros)' : 'Iniciar Importação'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setImportStep('mapping');
                      setImportProgress(50);
                    }}
                  >
                    Voltar
                  </Button>
                </div>
              </div>
            )}

            {/* Importing Step */}
            {importStep === 'importing' && (
              <div className="space-y-4 text-center">
                <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
                <div>
                  <h3 className="text-lg font-medium">Importando dados...</h3>
                  <p className="text-sm text-muted-foreground">
                    Processando {importData.filter(r => r.valid).length} registros válidos
                  </p>
                </div>
              </div>
            )}

            {/* Complete Step */}
            {importStep === 'complete' && (
              <div className="space-y-4 text-center">
                <CheckCircle className="h-12 w-12 mx-auto text-green-600" />
                <div>
                  <h3 className="text-lg font-medium text-green-600">Importação Concluída!</h3>
                  <p className="text-sm text-muted-foreground">
                    {importData.filter(r => r.valid).length} usuários importados com sucesso
                  </p>
                </div>

                <Button
                  onClick={() => {
                    // Emitir evento personalizado para notificar que a importação foi bem-sucedida
                    const importSuccessEvent = new CustomEvent('import-success', {
                      detail: {
                        type: 'users',
                        count: importData.filter(r => r.valid).length,
                        timestamp: new Date().toISOString(),
                      },
                    });
                    window.dispatchEvent(importSuccessEvent);

                    setShowImportModal(false);
                    setImportStep('upload');
                    setImportProgress(0);
                    setImportFile(null);
                    setImportData([]);
                    updateLastImportDate(new Date().toISOString());
                  }}
                  data-testid="close-import"
                >
                  Fechar
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

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

      <EventPermissionsModal
        isOpen={showPermissionsModal}
        onClose={() => setShowPermissionsModal(false)}
      />

      {/* Modal de Envio de Notificações */}
      <Dialog open={showNotificationModal} onOpenChange={setShowNotificationModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Enviar Notificação Push
            </DialogTitle>
            <DialogDescription>
              Envie uma notificação personalizada para os usuários
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notification-title">Título</Label>
              <Input
                id="notification-title"
                placeholder="Digite o título da notificação"
                value={notificationTitle}
                onChange={e => setNotificationTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notification-message">Mensagem</Label>
              <textarea
                id="notification-message"
                className="w-full min-h-[100px] p-3 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Digite a mensagem da notificação"
                value={notificationMessage}
                onChange={e => setNotificationMessage(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notification-type">Tipo</Label>
              <Select value={notificationType} onValueChange={setNotificationType}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">Geral</SelectItem>
                  <SelectItem value="announcement">Anúncio</SelectItem>
                  <SelectItem value="reminder">Lembrete</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notification-user">Destinatário (opcional)</Label>
              <Select
                value={selectedUserId?.toString() || ''}
                onValueChange={value =>
                  setSelectedUserId(value === 'all' ? 'all' : value ? parseInt(value) : null)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os usuários" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os usuários</SelectItem>
                  {usersList.map(user => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="text-sm text-blue-800">
                <strong>Preview:</strong>
              </div>
              <div className="text-sm text-blue-700 mt-1">
                <div className="font-medium">{notificationTitle || 'Título da notificação'}</div>
                <div className="text-xs">{notificationMessage || 'Mensagem da notificação'}</div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowNotificationModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={sendNotification}
              disabled={!notificationTitle || !notificationMessage}
            >
              <Send className="h-4 w-4 mr-2" />
              Enviar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </MobileLayout>
  );

  // Componente de Campo Editável Inline
  function EditableField({
    value,
    onSave,
    className = '',
    ...props
  }: {
    value: string;
    onSave: (value: string) => void;
    className?: string;
  } & React.HTMLAttributes<HTMLDivElement>) {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(value);

    const handleSave = () => {
      if (editValue.trim() !== value) {
        onSave(editValue.trim());
      }
      setIsEditing(false);
    };

    const handleCancel = () => {
      setEditValue(value);
      setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSave();
      } else if (e.key === 'Escape') {
        handleCancel();
      }
    };

    if (isEditing) {
      return (
        <div className="flex gap-1">
          <Input
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            autoFocus
            className="h-8 text-sm"
            {...props}
          />
        </div>
      );
    }

    return (
      <div
        onClick={() => setIsEditing(true)}
        className={`p-1 rounded cursor-text hover:bg-muted/50 transition-colors min-h-[32px] flex items-center ${className}`}
        {...props}
      >
        {value || 'Clique para editar'}
      </div>
    );
  }
}
