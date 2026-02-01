import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  User,
  Tag,
  CheckCircle,
  Circle,
  AlertCircle,
  Clock,
  Trash2,
  Edit3,
  PlusCircle,
  CheckSquare2,
  RefreshCw,
  Settings,
  CloudOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DialogWithModalTracking,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { toast } from 'sonner';
import { notificationService } from '@/lib/notificationService';

interface Task {
  id: number;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  due_date?: string;
  created_by: number;
  assigned_to?: number;
  created_by_name?: string;
  assigned_to_name?: string;
  church?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  tags?: string[];
}

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  church: string;
}

interface SheetTask {
  id: number;
  titulo: string;
  descricao: string;
  status: string;
  prioridade: string;
  responsavel: string;
  criador: string;
  igreja: string;
  data_criacao: string;
  data_vencimento?: string;
  data_conclusao?: string;
  tags?: string;
}

const priorityConfig = {
  high: {
    color:
      'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-600/50',
    icon: <AlertCircle className="h-3 w-3" />,
    label: 'Alta',
  },
  medium: {
    color:
      'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-600/50',
    icon: <Clock className="h-3 w-3" />,
    label: 'Média',
  },
  low: {
    color:
      'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-600/50',
    icon: <Circle className="h-3 w-3" />,
    label: 'Baixa',
  },
};

const statusConfig = {
  pending: {
    color:
      'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/30 dark:text-gray-300 dark:border-gray-600/50',
    icon: <Circle className="h-3 w-3" />,
    label: 'Pendente',
  },
  in_progress: {
    color:
      'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-600/50',
    icon: <Clock className="h-3 w-3" />,
    label: 'Em Progresso',
  },
  completed: {
    color:
      'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-600/50',
    icon: <CheckCircle className="h-3 w-3" />,
    label: 'Concluída',
  },
};

// 🎯 CONFIGURAÇÃO DO GOOGLE SHEETS
const GOOGLE_SHEETS_CONFIG = {
  proxyUrl: '/api/google-sheets/proxy', // Proxy no servidor (evita CORS)
  spreadsheetId: '1i-x-0KiciwACRztoKX-YHlXT4FsrAzaKwuH-hHkD8go',
  sheetName: 'tarefas',
};

export default function Tasks() {
  console.log('🚀 Tasks - Sistema de sincronização simplificado');

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date'); // 'date', 'priority'
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<number[]>([]);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium' as const,
    due_date: '',
    assigned_to: 'none',
    church: '',
    tags: [] as string[],
  });

  // Verificação simples de conexão
  const isOnline = navigator.onLine;

  // Hook SIMPLIFICADO - buscar tarefas DIRETO DO GOOGLE SHEETS (fonte da verdade)
  const {
    data: tasksData,
    isLoading: tasksLoading,
    refetch,
  } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      console.log('📖 [TASKS] Buscando tarefas DO GOOGLE SHEETS (fonte da verdade)...');

      // Buscar DIRETO do Google Sheets
      const response = await fetch(GOOGLE_SHEETS_CONFIG.proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': '1',
        },
        body: JSON.stringify({
          action: 'getTasks',
          spreadsheetId: GOOGLE_SHEETS_CONFIG.spreadsheetId,
          sheetName: GOOGLE_SHEETS_CONFIG.sheetName,
        }),
      });

      if (!response.ok) throw new Error('Erro ao buscar tarefas do Google Sheets');

      const data = await response.json();
      const tasks = data.tasks || [];

      // Converter formato do Sheets para formato do app
      const convertedTasks = tasks.map((sheetTask: SheetTask) => ({
        id: sheetTask.id,
        title: sheetTask.titulo || '',
        description: sheetTask.descricao || '',
        status:
          sheetTask.status === 'Concluída'
            ? 'completed'
            : sheetTask.status === 'Em Progresso'
              ? 'in_progress'
              : 'pending',
        priority:
          sheetTask.prioridade === 'Alta'
            ? 'high'
            : sheetTask.prioridade === 'Baixa'
              ? 'low'
              : 'medium',
        assigned_to_name: sheetTask.responsavel || '',
        created_by_name: sheetTask.criador || '',
        church: sheetTask.igreja || '',
        created_at: sheetTask.data_criacao
          ? new Date(sheetTask.data_criacao.split('/').reverse().join('-')).toISOString()
          : new Date().toISOString(),
        updated_at: new Date().toISOString(),
        due_date: sheetTask.data_vencimento || '',
        completed_at: sheetTask.data_conclusao || '',
        tags: sheetTask.tags ? sheetTask.tags.split(',').filter(Boolean) : [],
      }));

      console.log(`✅ [TASKS] ${convertedTasks.length} tarefas carregadas DO GOOGLE SHEETS`);
      return convertedTasks;
    },
    staleTime: 2 * 60 * 1000, // 2 minutos - dados não mudam tão frequentemente
    refetchInterval: 5 * 60 * 1000, // 5 minutos - menos frequente
    refetchOnWindowFocus: false, // Não refetch a cada foco
  });

  const allTasks = tasksData || [];

  // Monitoramento de conexão agora é feito pelo hook useOnlineStatus

  // Limpar seleções quando filtros mudarem
  useEffect(() => {
    setSelectedTasks([]);
  }, [searchTerm, selectedPriority, selectedStatus]);

  // Sincronização automática é feita pelo refetchInterval do React Query (30s)

  // ========================================
  // 🎯 SINCRONIZAÇÃO COM GOOGLE SHEETS
  // ========================================

  /**
   * Adiciona uma tarefa específica ao Google Sheets
   */
  const addTaskToGoogleSheets = async (task: Task) => {
    if (!isOnline) {
      console.log('📴 Sem conexão - adição no Google Sheets adiada');
      return;
    }

    try {
      console.log(`📤 [ADD] Adicionando tarefa ${task.id} ao Google Sheets...`);

      const taskData = {
        id: task.id,
        titulo: task.title,
        descricao: task.description || '',
        status:
          task.status === 'completed'
            ? 'Concluída'
            : task.status === 'in_progress'
              ? 'Em Progresso'
              : 'Pendente',
        prioridade: task.priority === 'high' ? 'Alta' : task.priority === 'low' ? 'Baixa' : 'Média',
        responsavel: task.assigned_to_name || 'Sistema',
        criador: task.created_by_name || 'App',
        igreja: task.church || '',
        data_criacao: new Date(task.created_at).toLocaleDateString('pt-BR'),
        data_vencimento: task.due_date ? new Date(task.due_date).toLocaleDateString('pt-BR') : '',
        data_conclusao: task.completed_at
          ? new Date(task.completed_at).toLocaleDateString('pt-BR')
          : '',
        tags: task.tags?.join(',') || '',
      };

      const response = await fetch(GOOGLE_SHEETS_CONFIG.proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': '1',
        },
        body: JSON.stringify({
          action: 'addTask',
          spreadsheetId: GOOGLE_SHEETS_CONFIG.spreadsheetId,
          sheetName: GOOGLE_SHEETS_CONFIG.sheetName,
          taskData,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          console.log(`✅ [ADD] Tarefa ${task.id} adicionada ao Google Sheets!`);
        } else {
          console.warn(`⚠️ [ADD] Falha ao adicionar tarefa ${task.id}:`, result);
        }
      } else {
        console.error(`❌ [ADD] Erro HTTP ${response.status} ao adicionar tarefa ${task.id}`);
      }
    } catch (error) {
      console.error(`❌ [ADD] Erro ao adicionar tarefa ${task.id} ao Google Sheets:`, error);
    }
  };

  /**
   * Atualiza uma tarefa específica no Google Sheets
   */
  const updateTaskInGoogleSheets = async (task: Task) => {
    if (!isOnline) {
      console.log('📴 Sem conexão - atualização no Google Sheets adiada');
      return;
    }

    try {
      console.log(`📝 [UPDATE] Atualizando tarefa ${task.id} no Google Sheets...`);

      // Verificar se a tarefa ainda existe no servidor antes de atualizar
      const checkResponse = await fetch(`/api/tasks`, {
        headers: { 'x-user-id': '1' },
      });

      if (checkResponse.ok) {
        const checkData = await checkResponse.json();
        const tasks = checkData.tasks || [];
        const taskExists = tasks.find((t: Task) => t.id === task.id);

        if (!taskExists) {
          console.log(`⚠️ [UPDATE] Tarefa ${task.id} não existe mais, cancelando atualização`);
          return;
        }
      }

      // Deletar a linha antiga do Google Sheets
      await fetch(GOOGLE_SHEETS_CONFIG.proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': '1',
        },
        body: JSON.stringify({
          action: 'deleteTask',
          spreadsheetId: GOOGLE_SHEETS_CONFIG.spreadsheetId,
          sheetName: GOOGLE_SHEETS_CONFIG.sheetName,
          taskId: task.id,
        }),
      });

      // Adicionar com os dados atualizados
      await addTaskToGoogleSheets(task);

      console.log(`✅ [UPDATE] Tarefa ${task.id} atualizada no Google Sheets!`);
    } catch (error) {
      console.error(`❌ [UPDATE] Erro ao atualizar tarefa ${task.id} no Google Sheets:`, error);
    }
  };

  /**
   * Deleta uma tarefa específica do Google Sheets por ID
   */
  const deleteTaskFromGoogleSheets = async (taskId: number) => {
    if (!isOnline) {
      console.log('📴 Sem conexão - deleção no Google Sheets adiada');
      return;
    }

    try {
      console.log(`🗑️ [DELETE] Deletando tarefa ${taskId} do Google Sheets...`);

      const response = await fetch(GOOGLE_SHEETS_CONFIG.proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': '1',
        },
        body: JSON.stringify({
          action: 'deleteTask',
          spreadsheetId: GOOGLE_SHEETS_CONFIG.spreadsheetId,
          sheetName: GOOGLE_SHEETS_CONFIG.sheetName,
          taskId: taskId,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          console.log(
            `✅ [DELETE] Tarefa ${taskId} deletada do Google Sheets (linha ${result.linha})`
          );
        } else {
          console.warn(`⚠️ [DELETE] Falha ao deletar tarefa ${taskId}:`, result.error);
        }
      } else {
        console.error(`❌ [DELETE] Erro HTTP ${response.status} ao deletar tarefa ${taskId}`);
      }
    } catch (error) {
      console.error(`❌ [DELETE] Erro ao deletar tarefa ${taskId} do Google Sheets:`, error);
    }
  };

  /**
   * Sincronização manual - apenas refetch dos dados
   */
  const syncFromGoogleSheets = async (showToast = false) => {
    if (!isOnline) {
      console.log('📴 Sem conexão');
      if (showToast) toast.error('Você está sem conexão');
      return;
    }

    try {
      if (showToast) toast.info('Sincronizando...');
      console.log('🔄 [SYNC] Recarregando do Google Sheets...');

      await refetch();

      if (showToast) toast.success('Sincronizado!');
    } catch (error) {
      console.error('❌ [SYNC] Erro:', error);
      if (showToast) toast.error('Erro ao sincronizar');
    }
  };

  /**
   * REMOVIDA - Google Sheets é a fonte da verdade
   * Não precisamos mais sincronizar DO app PARA o Sheets automaticamente
   * As tarefas são adicionadas ao Sheets quando criadas/atualizadas
   */

  // ========================================
  // SINCRONIZAÇÃO COM GOOGLE SHEETS
  // ========================================

  // ⚠️ SINCRONIZAÇÃO AUTOMÁTICA DESATIVADA
  // Motivo: Deletar tarefas usa função específica (deleteTaskFromGoogleSheets)
  // que deleta APENAS a linha da tarefa, sem relançar tudo
  //
  // Para sincronização completa manual, use o botão "Servidor"

  // useEffect(() => {
  //   if (!isOnline || !allTasks) return;
  //
  //   // Debounce de 5 segundos para evitar múltiplas sincronizações
  //   const timer = setTimeout(() => {
  //     console.log('🔄 [AUTO-SYNC] Sincronização automática iniciada...');
  //     syncWithGoogleSheets();
  //   }, 5000); // 5 segundos de delay
  //
  //   return () => clearTimeout(timer);
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [allTasks?.length, isOnline]); // Apenas quando o número de tarefas mudar

  // ========================================
  // HANDLERS
  // ========================================

  const handleCreateTask = async () => {
    if (!newTask.title.trim()) {
      toast.error('Título é obrigatório');
      return;
    }

    try {
      console.log('➕ [CREATE] Criando tarefa:', newTask.title);

      const taskData = {
        title: newTask.title,
        description: newTask.description,
        priority: newTask.priority,
        due_date: newTask.due_date || undefined,
        assigned_to:
          newTask.assigned_to && newTask.assigned_to !== 'none'
            ? parseInt(newTask.assigned_to)
            : undefined,
        church: newTask.church || undefined,
        status: 'pending' as const,
        created_by: 1,
        tags: newTask.tags,
      };

      // Criar no servidor
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': '1',
        },
        body: JSON.stringify(taskData),
      });

      if (!response.ok) throw new Error('Erro ao criar tarefa');

      const data = await response.json();
      const createdTask = data.task || data;
      console.log('✅ [CREATE] Tarefa criada no servidor:', createdTask);

      // Adicionar ao Google Sheets
      if (createdTask) {
        await addTaskToGoogleSheets(createdTask);
      }

      // Recarregar lista
      await refetch();

      setIsCreateDialogOpen(false);
      setNewTask({
        title: '',
        description: '',
        priority: 'medium',
        due_date: '',
        assigned_to: 'none',
        church: '',
        tags: [],
      });

      toast.success('Tarefa criada!');

      // Notificar usuário
      if (newTask.assigned_to && newTask.assigned_to !== 'none') {
        try {
          await notificationService.notifyTaskCreated(newTask.title, parseInt(newTask.assigned_to));
        } catch (error) {
          console.error('Erro ao enviar notificação:', error);
        }
      }
    } catch (error) {
      console.error('Erro ao criar tarefa:', error);
      toast.error('Erro ao criar tarefa');
    }
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsEditDialogOpen(true);
  };

  const handleUpdateTask = async () => {
    if (!editingTask) return;

    try {
      console.log('📝 [UPDATE] Atualizando tarefa:', editingTask.id);

      const updates = {
        title: editingTask.title,
        description: editingTask.description,
        priority: editingTask.priority,
        due_date: editingTask.due_date,
        assigned_to: editingTask.assigned_to,
        church: editingTask.church,
        status: editingTask.status,
      };

      // Atualizar no servidor
      const response = await fetch(`/api/tasks/${editingTask.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': '1',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) throw new Error('Erro ao atualizar tarefa');

      // Atualizar no Google Sheets
      await updateTaskInGoogleSheets(editingTask);

      // Recarregar lista
      await refetch();

      setIsEditDialogOpen(false);
      setEditingTask(null);

      toast.success('Tarefa atualizada!');
    } catch (error) {
      console.error('Erro ao atualizar tarefa:', error);
      toast.error('Erro ao atualizar tarefa');
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    if (!confirm('Tem certeza que deseja deletar esta tarefa?')) return;

    try {
      console.log(`🗑️ [DELETE] Deletando tarefa ${taskId}...`);

      // Deletar do servidor
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
        headers: { 'x-user-id': '1' },
      });

      if (!response.ok && response.status !== 404) {
        throw new Error('Erro ao deletar tarefa');
      }

      // Deletar do Google Sheets
      await deleteTaskFromGoogleSheets(taskId);

      // Recarregar lista
      await refetch();

      toast.success('Tarefa deletada!');
      console.log(`✅ [DELETE] Tarefa ${taskId} deletada`);
    } catch (error: any) {
      console.error('❌ [DELETE] Erro:', error);
      toast.error(`Erro ao deletar: ${error.message}`);
    }
  };

  const handleToggleTaskSelection = (taskId: number) => {
    setSelectedTasks(prev =>
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
  };

  const handleSelectAllTasks = () => {
    if (selectedTasks.length === filteredTasks.length) {
      setSelectedTasks([]);
    } else {
      setSelectedTasks(filteredTasks.map((task: Task) => task.id));
    }
  };

  const handleDeleteMultipleTasks = async () => {
    if (selectedTasks.length === 0) {
      toast.error('Selecione pelo menos uma tarefa');
      return;
    }

    const count = selectedTasks.length;
    if (!confirm(`Deletar ${count} tarefa${count > 1 ? 's' : ''}?`)) return;

    try {
      console.log(`🗑️ [MULTIPLE] Deletando ${count} tarefas...`);

      for (const taskId of selectedTasks) {
        // Deletar do servidor
        await fetch(`/api/tasks/${taskId}`, {
          method: 'DELETE',
          headers: { 'x-user-id': '1' },
        });

        // Deletar do Google Sheets
        await deleteTaskFromGoogleSheets(taskId);
      }

      // Recarregar lista
      await refetch();

      setSelectedTasks([]);
      toast.success(`${count} tarefa${count > 1 ? 's deletadas' : ' deletada'}!`);
      console.log(`✅ [MULTIPLE] ${count} tarefas deletadas`);
    } catch (error: any) {
      console.error('❌ [MULTIPLE] Erro:', error);
      toast.error(`Erro: ${error.message}`);
    }
  };

  const handleToggleStatus = async (task: Task) => {
    const newStatus: 'pending' | 'completed' =
      task.status === 'completed' ? 'pending' : 'completed';

    try {
      // Atualizar no servidor
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': '1',
        },
        body: JSON.stringify({
          status: newStatus,
          completed_at: newStatus === 'completed' ? new Date().toISOString() : undefined,
        }),
      });

      if (!response.ok) throw new Error('Erro ao atualizar');

      // Atualizar no Google Sheets
      const updatedTask = {
        ...task,
        status: newStatus,
        completed_at: newStatus === 'completed' ? new Date().toISOString() : undefined,
      };
      await updateTaskInGoogleSheets(updatedTask);

      // Recarregar lista
      await refetch();
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      toast.error('Erro ao alterar status');
    }
  };

  // Buscar usuários
  const { data: usersData } = useQuery({
    queryKey: ['tasks-users'],
    queryFn: async () => {
      const response = await fetch('/api/tasks/users', {
        headers: { 'x-user-id': '1' },
      });
      if (!response.ok) throw new Error('Erro ao buscar usuários');
      return response.json();
    },
  });

  const users = usersData?.users || [];

  // Filtrar tarefas com verificações de segurança
  const filtered = allTasks.filter((task: Task) => {
    if (!task || !task.id) return false; // Ignorar tarefas inválidas

    const matchesSearch =
      (task.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (task.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (task.assigned_to_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (task.church || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = selectedStatus === 'all' || task.status === selectedStatus;
    const matchesPriority = selectedPriority === 'all' || task.priority === selectedPriority;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  // Ordenar tarefas
  const filteredTasks = [...filtered].sort((a: Task, b: Task) => {
    if (sortBy === 'priority') {
      // Alta > Média > Baixa
      const priorityOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
      return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
    } else {
      // Data de criação (mais recente primeiro) - já vem ordenado do hook
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      return dateB - dateA;
    }
  });

  const pendingTasks = filteredTasks.filter((task: Task) => task.status === 'pending');
  const inProgressTasks = filteredTasks.filter((task: Task) => task.status === 'in_progress');
  const completedTasks = filteredTasks.filter((task: Task) => task.status === 'completed');

  const TaskCard = ({ task }: { task: Task }) => {
    const isNotSynced = (task as any)._synced === false || (task as any)._localCreated === true;
    const isSelected = selectedTasks.includes(task.id);

    return (
      <Card
        className={`group relative overflow-hidden bg-white border-0 shadow-sm hover:shadow-md transition-shadow duration-200 mb-4 ${isNotSynced ? 'border-l-4 border-l-yellow-400' : ''} ${isSelected ? 'ring-2 ring-blue-500 shadow-xl' : ''}`}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-gray-50/50 to-white opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

        <CardContent className="p-6 relative z-10">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-3">
                <button
                  onClick={() => handleToggleStatus(task)}
                  className="flex-shrink-0 transition-all duration-200 hover:scale-110"
                >
                  {task.status === 'completed' ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <Circle className="h-5 w-5 text-gray-300 hover:text-gray-500" />
                  )}
                </button>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                  {task.title}
                </h3>
                {isNotSynced && (
                  <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 text-xs">
                    <CloudOff className="h-2 w-2 mr-1" />
                    Sem conexão
                  </Badge>
                )}
              </div>

              {task.description && (
                <p className="text-gray-600 text-sm mb-3 line-clamp-2">{task.description}</p>
              )}

              <div className="flex flex-wrap gap-2 mb-3">
                <Badge className={`${statusConfig[task.status].color} border`}>
                  {statusConfig[task.status].icon}
                  <span className="ml-1">{statusConfig[task.status].label}</span>
                </Badge>

                <Badge className={`${priorityConfig[task.priority].color} border`}>
                  {priorityConfig[task.priority].icon}
                  <span className="ml-1">{priorityConfig[task.priority].label}</span>
                </Badge>

                {task.assigned_to_name && (
                  <Badge className="bg-blue-50 text-blue-700 border-blue-200">
                    <User className="h-3 w-3 mr-1" />
                    {task.assigned_to_name}
                  </Badge>
                )}

                {task.church && (
                  <Badge className="bg-purple-50 text-purple-700 border-purple-200">
                    🏛️ {task.church}
                  </Badge>
                )}
              </div>

              {task.tags && task.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {task.tags.map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      <Tag className="h-2 w-2 mr-1" />
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 pt-3 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => handleEditTask(task)}
                  variant="ghost"
                  size="sm"
                  className="h-9 px-3 text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200"
                >
                  <Edit3 className="h-4 w-4 mr-1.5" />
                  <span className="hidden sm:inline">Editar</span>
                </Button>

                <Button
                  onClick={() => handleDeleteTask(task.id)}
                  variant="ghost"
                  size="sm"
                  className="h-9 px-3 text-gray-600 hover:text-red-600 hover:bg-red-50 transition-all duration-200"
                >
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  <span className="hidden sm:inline">Deletar</span>
                </Button>
              </div>

              <div
                className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => handleToggleTaskSelection(task.id)}
              >
                <span className="text-sm text-gray-600 hidden sm:inline">Selecionar</span>
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => handleToggleTaskSelection(task.id)}
                  className="flex-shrink-0"
                  aria-label={`Selecionar tarefa ${task.title}`}
                  onClick={e => e.stopPropagation()}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const EmptyState = ({
    icon: Icon,
    title,
    description,
  }: {
    icon: any;
    title: string;
    description: string;
  }) => (
    <div className="text-center py-12">
      <div className="inline-flex p-4 rounded-full bg-gray-100 mb-4">
        <Icon className="h-8 w-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{title}</h3>
      <p className="text-gray-500 max-w-sm mx-auto">{description}</p>
    </div>
  );

  if (tasksLoading) {
    return (
      <MobileLayout>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
          <div className="container mx-auto px-4 py-8">
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          </div>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-8">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  Tarefas
                </h1>
              </div>

              <p className="text-gray-600 text-lg">Organize e acompanhe suas tarefas</p>
            </div>

            <div className="flex gap-3 flex-wrap">
              {/* Botão de sincronização manual */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => syncFromGoogleSheets(true)}
                className="flex items-center gap-2 bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                title="Sincronizar do Google Sheets manualmente"
              >
                <RefreshCw className="h-4 w-4" />
                Sincronizar
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open('/settings', '_blank')}
                className="flex items-center gap-2"
              >
                <Settings className="h-4 w-4" />
                Configurar
              </Button>

              <DialogWithModalTracking
                modalId="create-task-modal"
                open={isCreateDialogOpen}
                onOpenChange={setIsCreateDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-300 px-6 py-3">
                    <PlusCircle className="h-5 w-5 mr-2" />
                    Nova Tarefa
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-semibold">Nova Tarefa</DialogTitle>
                  </DialogHeader>

                  <div className="space-y-6">
                    <div>
                      <Label htmlFor="title">Título *</Label>
                      <Input
                        id="title"
                        value={newTask.title}
                        onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                        placeholder="Digite o título da tarefa"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="description">Descrição</Label>
                      <Textarea
                        id="description"
                        value={newTask.description}
                        onChange={e => setNewTask({ ...newTask, description: e.target.value })}
                        placeholder="Descreva a tarefa em detalhes"
                        className="mt-1"
                        rows={3}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="priority">Prioridade</Label>
                        <Select
                          value={newTask.priority}
                          onValueChange={value =>
                            setNewTask({ ...newTask, priority: value as any })
                          }
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Baixa</SelectItem>
                            <SelectItem value="medium">Média</SelectItem>
                            <SelectItem value="high">Alta</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="due_date">Vencimento</Label>
                        <Input
                          id="due_date"
                          type="date"
                          value={newTask.due_date}
                          onChange={e => setNewTask({ ...newTask, due_date: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="assigned_to">Responsável</Label>
                      <Select
                        value={newTask.assigned_to}
                        onValueChange={value => setNewTask({ ...newTask, assigned_to: value })}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sem responsável</SelectItem>
                          {users.map((user: User) => (
                            <SelectItem key={user.id} value={user.id.toString()}>
                              {user.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="church">Igreja</Label>
                      <Input
                        id="church"
                        value={newTask.church}
                        onChange={e => setNewTask({ ...newTask, church: e.target.value })}
                        placeholder="Digite o nome da igreja"
                        className="mt-1"
                      />
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                      <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button
                        onClick={handleCreateTask}
                        className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                      >
                        Criar Tarefa
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </DialogWithModalTracking>
            </div>
          </div>

          {/* Filtros */}
          <Card className="mb-8 border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <Input
                      placeholder="Buscar tarefas..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="pl-12 h-12 text-base"
                    />
                  </div>
                </div>

                <div className="flex gap-3 flex-wrap">
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="pending">Pendentes</SelectItem>
                      <SelectItem value="in_progress">Em Progresso</SelectItem>
                      <SelectItem value="completed">Concluídas</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={selectedPriority} onValueChange={setSelectedPriority}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Prioridade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                      <SelectItem value="medium">Média</SelectItem>
                      <SelectItem value="low">Baixa</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Ordenar por" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">Data de Lançamento</SelectItem>
                      <SelectItem value="priority">Prioridade</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Barra de Seleção Múltipla */}
          {filteredTasks.length > 0 && (
            <Card className="mb-6 border-blue-200 bg-gradient-to-r from-blue-50 to-white shadow-md">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={
                        selectedTasks.length === filteredTasks.length && filteredTasks.length > 0
                      }
                      onCheckedChange={handleSelectAllTasks}
                      className="flex-shrink-0"
                    />
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">
                        {selectedTasks.length > 0
                          ? `${selectedTasks.length} selecionada${selectedTasks.length > 1 ? 's' : ''}`
                          : 'Selecionar todas'}
                      </p>
                      <p className="text-sm text-gray-600">
                        {filteredTasks.length} tarefa{filteredTasks.length > 1 ? 's' : ''}{' '}
                        disponível{filteredTasks.length > 1 ? 'is' : ''}
                      </p>
                    </div>
                  </div>

                  {selectedTasks.length > 0 && (
                    <div className="flex gap-2 w-full sm:w-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedTasks([])}
                        className="flex-1 sm:flex-none"
                      >
                        Desmarcar
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleDeleteMultipleTasks}
                        className="flex-1 sm:flex-none bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Deletar ({selectedTasks.length})
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Lista de Tarefas */}
          <Tabs defaultValue="pending" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 bg-white border shadow-sm">
              <TabsTrigger
                value="pending"
                className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
              >
                <Circle className="h-4 w-4 mr-2" />
                Pendentes ({pendingTasks.length})
              </TabsTrigger>
              <TabsTrigger
                value="in_progress"
                className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
              >
                <Clock className="h-4 w-4 mr-2" />
                Em Progresso ({inProgressTasks.length})
              </TabsTrigger>
              <TabsTrigger
                value="completed"
                className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
              >
                <CheckSquare2 className="h-4 w-4 mr-2" />
                Concluídas ({completedTasks.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-4">
              {pendingTasks.length === 0 ? (
                <EmptyState
                  icon={Circle}
                  title="Nenhuma tarefa pendente"
                  description="Crie uma nova tarefa para começar"
                />
              ) : (
                pendingTasks.map(task => <TaskCard key={task.id} task={task} />)
              )}
            </TabsContent>

            <TabsContent value="in_progress" className="space-y-4">
              {inProgressTasks.length === 0 ? (
                <EmptyState
                  icon={Clock}
                  title="Nenhuma tarefa em progresso"
                  description="Mova tarefas pendentes para começar"
                />
              ) : (
                inProgressTasks.map(task => <TaskCard key={task.id} task={task} />)
              )}
            </TabsContent>

            <TabsContent value="completed" className="space-y-4">
              {completedTasks.length === 0 ? (
                <EmptyState
                  icon={CheckSquare2}
                  title="Nenhuma tarefa concluída"
                  description="Complete tarefas para vê-las aqui"
                />
              ) : (
                completedTasks.map(task => <TaskCard key={task.id} task={task} />)
              )}
            </TabsContent>
          </Tabs>

          {/* Dialog de Edição */}
          <DialogWithModalTracking
            modalId="edit-task-modal"
            open={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
          >
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold">Editar Tarefa</DialogTitle>
              </DialogHeader>

              {editingTask && (
                <div className="space-y-6">
                  <div>
                    <Label htmlFor="edit-title">Título *</Label>
                    <Input
                      id="edit-title"
                      value={editingTask.title}
                      onChange={e => setEditingTask({ ...editingTask, title: e.target.value })}
                      placeholder="Digite o título"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit-description">Descrição</Label>
                    <Textarea
                      id="edit-description"
                      value={editingTask.description || ''}
                      onChange={e =>
                        setEditingTask({ ...editingTask, description: e.target.value })
                      }
                      placeholder="Descreva a tarefa"
                      className="mt-1"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="edit-priority">Prioridade</Label>
                      <Select
                        value={editingTask.priority}
                        onValueChange={value =>
                          setEditingTask({ ...editingTask, priority: value as any })
                        }
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Baixa</SelectItem>
                          <SelectItem value="medium">Média</SelectItem>
                          <SelectItem value="high">Alta</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="edit-due_date">Vencimento</Label>
                      <Input
                        id="edit-due_date"
                        type="date"
                        value={editingTask.due_date ? editingTask.due_date.split('T')[0] : ''}
                        onChange={e => setEditingTask({ ...editingTask, due_date: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="edit-status">Status</Label>
                    <Select
                      value={editingTask.status}
                      onValueChange={value =>
                        setEditingTask({ ...editingTask, status: value as any })
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pendente</SelectItem>
                        <SelectItem value="in_progress">Em Progresso</SelectItem>
                        <SelectItem value="completed">Concluída</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="edit-assigned_to">Responsável</Label>
                    <Select
                      value={editingTask.assigned_to?.toString() || 'none'}
                      onValueChange={value =>
                        setEditingTask({
                          ...editingTask,
                          assigned_to: value === 'none' ? undefined : parseInt(value),
                        })
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sem responsável</SelectItem>
                        {users.map((user: User) => (
                          <SelectItem key={user.id} value={user.id.toString()}>
                            {user.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="edit-church">Igreja</Label>
                    <Input
                      id="edit-church"
                      value={editingTask.church || ''}
                      onChange={e => setEditingTask({ ...editingTask, church: e.target.value })}
                      placeholder="Digite o nome da igreja"
                      className="mt-1"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleUpdateTask}
                      className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                    >
                      Salvar
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </DialogWithModalTracking>
        </div>
      </div>
    </MobileLayout>
  );
}
