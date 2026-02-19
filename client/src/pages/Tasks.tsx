import { useState, useEffect, useDeferredValue, startTransition } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Search, Circle, Clock, Trash2, PlusCircle, CheckSquare2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
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
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { fetchWithAuth } from '@/lib/api';
import { createLogger } from '@/lib/logger';
import { isPastor } from '@/lib/permissions';
import { TaskCard } from './tasks/TaskCard';
import { TasksEmptyState } from './tasks/TasksEmptyState';
import type { Task } from './tasks/tasksTypes';

const tasksLogger = createLogger('Tasks');

// 🎯 Buscar tarefas do banco de dados (isoladas por distrito no backend)
export default function Tasks() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isImpersonating =
    typeof user === 'object' && user !== null && 'isImpersonating' in user
      ? Boolean((user as { isImpersonating?: boolean }).isImpersonating)
      : false;
  const canAccessTasks = isPastor(user) && !isImpersonating;

  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<number[]>([]);
  const [newTask, setNewTask] = useState<{
    title: string;
    description: string;
    priority: Task['priority'];
    due_date: string;
    church: string;
  }>({
    title: '',
    description: '',
    priority: 'medium',
    due_date: '',
    church: '',
  });

  // Buscar tarefas do banco de dados (backend filtra por distrito)
  const {
    data: tasksData,
    isLoading: tasksLoading,
    refetch,
  } = useQuery({
    queryKey: ['tasks', user?.id],
    queryFn: async () => {
      const response = await fetchWithAuth('/api/tasks');
      if (!response.ok) throw new Error('Erro ao buscar tarefas');
      const data = await response.json();
      return (data?.data?.tasks || data?.tasks || []) as Task[];
    },
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
    enabled: !!user?.id && canAccessTasks,
  });

  const allTasks: Task[] = tasksData || [];

  // Limpar seleções quando filtros mudarem
  useEffect(() => {
    setSelectedTasks([]);
  }, [searchTerm, selectedPriority, selectedStatus]);

  // ========================================
  // HANDLERS (banco de dados)
  // ========================================

  const handleCreateTask = async () => {
    if (!newTask.title.trim()) {
      toast.error('Título é obrigatório');
      return;
    }

    try {
      const taskData = {
        title: newTask.title,
        description: newTask.description || undefined,
        priority: newTask.priority,
        dueDate: newTask.due_date || undefined,
        church: newTask.church || undefined,
        status: 'pending' as const,
      };

      const response = await fetchWithAuth('/api/tasks', {
        method: 'POST',
        body: JSON.stringify(taskData),
      });

      if (!response.ok) throw new Error('Erro ao criar tarefa');

      await refetch();

      setIsCreateDialogOpen(false);
      setNewTask({
        title: '',
        description: '',
        priority: 'medium',
        due_date: '',
        church: '',
      });

      toast.success('Tarefa criada!');
    } catch (error) {
      tasksLogger.error('Erro ao criar tarefa:', error);
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
      const updates = {
        title: editingTask.title,
        description: editingTask.description,
        priority: editingTask.priority,
        dueDate: editingTask.due_date,
        church: editingTask.church,
        status: editingTask.status,
      };

      const response = await fetchWithAuth(`/api/tasks/${editingTask.id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });

      if (!response.ok) throw new Error('Erro ao atualizar tarefa');

      await refetch();
      setIsEditDialogOpen(false);
      setEditingTask(null);
      toast.success('Tarefa atualizada!');
    } catch (error) {
      tasksLogger.error('Erro ao atualizar tarefa:', error);
      toast.error('Erro ao atualizar tarefa');
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    if (!confirm('Tem certeza que deseja deletar esta tarefa?')) return;

    try {
      const response = await fetchWithAuth(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      });

      if (!response.ok && response.status !== 404) {
        throw new Error('Erro ao deletar tarefa');
      }

      await refetch();
      toast.success('Tarefa deletada!');
    } catch (error: unknown) {
      tasksLogger.error('Erro ao deletar:', error);
      toast.error(
        `Erro ao deletar: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      );
    }
  };

  const handleToggleTaskSelection = (taskId: number) => {
    setSelectedTasks((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
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
      for (const taskId of selectedTasks) {
        await fetchWithAuth(`/api/tasks/${taskId}`, {
          method: 'DELETE',
        });
      }

      await refetch();
      setSelectedTasks([]);
      toast.success(`${count} tarefa${count > 1 ? 's deletadas' : ' deletada'}!`);
    } catch (error: unknown) {
      tasksLogger.error('Erro ao deletar múltiplas:', error);
      toast.error(`Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  };

  const handleToggleStatus = async (task: Task) => {
    const newStatus: 'pending' | 'completed' =
      task.status === 'completed' ? 'pending' : 'completed';

    try {
      const response = await fetchWithAuth(`/api/tasks/${task.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          status: newStatus,
        }),
      });

      if (!response.ok) throw new Error('Erro ao atualizar');
      await refetch();
    } catch (error) {
      tasksLogger.error('Erro ao alterar status:', error);
      toast.error('Erro ao alterar status');
    }
  };

  // Filtrar tarefas com verificações de segurança
  const filtered = allTasks.filter((task: Task) => {
    if (!task || !task.id) return false; // Ignorar tarefas inválidas

    const matchesSearch =
      (task.title || '').toLowerCase().includes(deferredSearchTerm.toLowerCase()) ||
      (task.description || '').toLowerCase().includes(deferredSearchTerm.toLowerCase()) ||
      (task.assigned_to_name || '').toLowerCase().includes(deferredSearchTerm.toLowerCase()) ||
      (task.church || '').toLowerCase().includes(deferredSearchTerm.toLowerCase());

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

  if (!canAccessTasks) {
    return (
      <MobileLayout>
        <div className="p-4 text-center">
          <h2 className="text-xl font-semibold mb-2">{t('tasks.accessRestricted')}</h2>
          <p className="text-muted-foreground">{t('tasks.accessRestrictedMessage')}</p>
        </div>
      </MobileLayout>
    );
  }

  if (tasksLoading) {
    return (
      <MobileLayout>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-950">
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-950">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-8">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
                  {t('tasks.title')}
                </h1>
              </div>

              <p className="text-gray-600 dark:text-gray-400 text-lg">{t('tasks.subtitle')}</p>
            </div>

            <div className="flex gap-3 flex-wrap">
              {/* Botão de atualizar */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="flex items-center gap-2"
                title={t('tasks.refreshTitle')}
              >
                <RefreshCw className="h-4 w-4" />
                {t('common.refresh')}
              </Button>

              <DialogWithModalTracking
                modalId="create-task-modal"
                open={isCreateDialogOpen}
                onOpenChange={setIsCreateDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-300 px-6 py-3">
                    <PlusCircle className="h-5 w-5 mr-2" />
                    {t('tasks.newTask')}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-semibold">
                      {t('tasks.newTask')}
                    </DialogTitle>
                  </DialogHeader>

                  <div className="space-y-6">
                    <div>
                      <Label htmlFor="title">{t('tasks.titleLabel')}</Label>
                      <Input
                        id="title"
                        value={newTask.title}
                        onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                        placeholder={t('tasks.titlePlaceholder')}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="description">{t('common.description')}</Label>
                      <Textarea
                        id="description"
                        value={newTask.description}
                        onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                        placeholder={t('tasks.descriptionPlaceholder')}
                        className="mt-1"
                        rows={3}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="priority">{t('tasks.priority')}</Label>
                        <Select
                          value={newTask.priority}
                          onValueChange={(value) =>
                            setNewTask({ ...newTask, priority: value as Task['priority'] })
                          }
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">{t('tasks.low')}</SelectItem>
                            <SelectItem value="medium">{t('tasks.medium')}</SelectItem>
                            <SelectItem value="high">{t('tasks.high')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="due_date">{t('tasks.dueDate')}</Label>
                        <Input
                          id="due_date"
                          type="date"
                          value={newTask.due_date}
                          onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="church">{t('tasks.churchLabel')}</Label>
                      <Input
                        id="church"
                        value={newTask.church}
                        onChange={(e) => setNewTask({ ...newTask, church: e.target.value })}
                        placeholder={t('tasks.churchPlaceholder')}
                        className="mt-1"
                      />
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                      <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                        {t('common.cancel')}
                      </Button>
                      <Button
                        onClick={handleCreateTask}
                        className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                      >
                        {t('tasks.createTask')}
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
                      placeholder={t('tasks.searchPlaceholder')}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-12 h-12 text-base"
                    />
                  </div>
                </div>

                <div className="flex gap-3 flex-wrap">
                  <Select
                    value={selectedStatus}
                    onValueChange={(val) => startTransition(() => setSelectedStatus(val))}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('tasks.allStatuses')}</SelectItem>
                      <SelectItem value="pending">{t('tasks.pendingTasks')}</SelectItem>
                      <SelectItem value="in_progress">{t('tasks.inProgressTasks')}</SelectItem>
                      <SelectItem value="completed">{t('tasks.completedTasks')}</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={selectedPriority}
                    onValueChange={(val) => startTransition(() => setSelectedPriority(val))}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Prioridade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('tasks.allPriorities')}</SelectItem>
                      <SelectItem value="high">{t('tasks.high')}</SelectItem>
                      <SelectItem value="medium">{t('tasks.medium')}</SelectItem>
                      <SelectItem value="low">{t('tasks.low')}</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={sortBy}
                    onValueChange={(val) => startTransition(() => setSortBy(val))}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Ordenar por" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">{t('tasks.sortByDate')}</SelectItem>
                      <SelectItem value="priority">{t('tasks.sortByPriority')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Barra de Seleção Múltipla */}
          {filteredTasks.length > 0 && (
            <Card className="mb-6 border-blue-200 dark:border-blue-600/50 bg-gradient-to-r from-blue-50 to-white dark:from-blue-900/20 dark:to-gray-800 shadow-md">
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
                      <p className="text-sm text-gray-600 dark:text-gray-400">
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
            <TabsList className="grid w-full grid-cols-3 bg-white dark:bg-gray-800 border dark:border-gray-700 shadow-sm">
              <TabsTrigger
                value="pending"
                className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 dark:data-[state=active]:bg-blue-900/30 dark:data-[state=active]:text-blue-300"
              >
                <Circle className="h-4 w-4 mr-2" />
                {t('tasks.pendingTasks')} ({pendingTasks.length})
              </TabsTrigger>
              <TabsTrigger
                value="in_progress"
                className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 dark:data-[state=active]:bg-blue-900/30 dark:data-[state=active]:text-blue-300"
              >
                <Clock className="h-4 w-4 mr-2" />
                {t('tasks.inProgressTasks')} ({inProgressTasks.length})
              </TabsTrigger>
              <TabsTrigger
                value="completed"
                className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 dark:data-[state=active]:bg-blue-900/30 dark:data-[state=active]:text-blue-300"
              >
                <CheckSquare2 className="h-4 w-4 mr-2" />
                {t('tasks.completedTasks')} ({completedTasks.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-4">
              {pendingTasks.length === 0 ? (
                <TasksEmptyState
                  icon={Circle}
                  title={t('tasks.noPending')}
                  description={t('tasks.noPending')}
                />
              ) : (
                pendingTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    isSelected={selectedTasks.includes(task.id)}
                    onToggleStatus={handleToggleStatus}
                    onEdit={handleEditTask}
                    onDelete={handleDeleteTask}
                    onToggleSelection={handleToggleTaskSelection}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="in_progress" className="space-y-4">
              {inProgressTasks.length === 0 ? (
                <TasksEmptyState
                  icon={Clock}
                  title={t('tasks.noInProgress')}
                  description={t('tasks.noInProgress')}
                />
              ) : (
                inProgressTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    isSelected={selectedTasks.includes(task.id)}
                    onToggleStatus={handleToggleStatus}
                    onEdit={handleEditTask}
                    onDelete={handleDeleteTask}
                    onToggleSelection={handleToggleTaskSelection}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="completed" className="space-y-4">
              {completedTasks.length === 0 ? (
                <TasksEmptyState
                  icon={CheckSquare2}
                  title={t('tasks.noCompleted')}
                  description={t('tasks.noCompleted')}
                />
              ) : (
                completedTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    isSelected={selectedTasks.includes(task.id)}
                    onToggleStatus={handleToggleStatus}
                    onEdit={handleEditTask}
                    onDelete={handleDeleteTask}
                    onToggleSelection={handleToggleTaskSelection}
                  />
                ))
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
                <DialogTitle className="text-xl font-semibold">{t('tasks.edit')}</DialogTitle>
              </DialogHeader>

              {editingTask && (
                <div className="space-y-6">
                  <div>
                    <Label htmlFor="edit-title">{t('tasks.titleLabel')}</Label>
                    <Input
                      id="edit-title"
                      value={editingTask.title}
                      onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                      placeholder="Digite o título"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit-description">{t('common.description')}</Label>
                    <Textarea
                      id="edit-description"
                      value={editingTask.description || ''}
                      onChange={(e) =>
                        setEditingTask({ ...editingTask, description: e.target.value })
                      }
                      placeholder="Descreva a tarefa"
                      className="mt-1"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="edit-priority">{t('tasks.priority')}</Label>
                      <Select
                        value={editingTask.priority}
                        onValueChange={(value) =>
                          setEditingTask({ ...editingTask, priority: value as Task['priority'] })
                        }
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">{t('tasks.low')}</SelectItem>
                          <SelectItem value="medium">{t('tasks.medium')}</SelectItem>
                          <SelectItem value="high">{t('tasks.high')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="edit-due_date">{t('tasks.dueDate')}</Label>
                      <Input
                        id="edit-due_date"
                        type="date"
                        value={editingTask.due_date ? editingTask.due_date.split('T')[0] : ''}
                        onChange={(e) =>
                          setEditingTask({ ...editingTask, due_date: e.target.value })
                        }
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="edit-status">{t('common.status')}</Label>
                    <Select
                      value={editingTask.status}
                      onValueChange={(value) =>
                        setEditingTask({ ...editingTask, status: value as Task['status'] })
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">{t('tasks.pending')}</SelectItem>
                        <SelectItem value="in_progress">{t('tasks.inProgress')}</SelectItem>
                        <SelectItem value="completed">{t('tasks.completed')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="edit-church">{t('tasks.churchLabel')}</Label>
                    <Input
                      id="edit-church"
                      value={editingTask.church || ''}
                      onChange={(e) => setEditingTask({ ...editingTask, church: e.target.value })}
                      placeholder={t('tasks.churchPlaceholder')}
                      className="mt-1"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                      {t('common.cancel')}
                    </Button>
                    <Button
                      onClick={handleUpdateTask}
                      className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                    >
                      {t('common.save')}
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
