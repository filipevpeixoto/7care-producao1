import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertCircle,
  CheckCircle,
  Circle,
  Clock,
  Edit3,
  Tag,
  Trash2,
  User,
} from 'lucide-react';
import type { Task } from './tasksTypes';

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

interface TaskCardProps {
  task: Task;
  isSelected: boolean;
  onToggleStatus: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: number) => void;
  onToggleSelection: (taskId: number) => void;
}

export const TaskCard = ({
  task,
  isSelected,
  onToggleStatus,
  onEdit,
  onDelete,
  onToggleSelection,
}: TaskCardProps) => (
  <Card
    className={`group relative overflow-hidden bg-white dark:bg-gray-800 border-0 shadow-sm hover:shadow-md transition-shadow duration-200 mb-4 ${isSelected ? 'ring-2 ring-blue-500 shadow-xl' : ''}`}
  >
    <div className="absolute inset-0 bg-gradient-to-r from-gray-50/50 to-white dark:from-gray-700/50 dark:to-gray-800 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

    <CardContent className="p-6 relative z-10">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={() => onToggleStatus(task)}
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
          </div>

          {task.description && (
            <p className="text-gray-600 dark:text-gray-300 text-sm mb-3 line-clamp-2">
              {task.description}
            </p>
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
              <Badge className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-600/50">
                <User className="h-3 w-3 mr-1" />
                {task.assigned_to_name}
              </Badge>
            )}

            {task.church && (
              <Badge className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-600/50">
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

        <div className="flex items-center justify-between gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Button
              onClick={() => onEdit(task)}
              variant="ghost"
              size="sm"
              className="h-9 px-3 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all duration-200"
            >
              <Edit3 className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">Editar</span>
            </Button>

            <Button
              onClick={() => onDelete(task.id)}
              variant="ghost"
              size="sm"
              className="h-9 px-3 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all duration-200"
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">Deletar</span>
            </Button>
          </div>

          <div
            className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
            onClick={() => onToggleSelection(task.id)}
          >
            <span className="text-sm text-gray-600 dark:text-gray-400 hidden sm:inline">
              Selecionar
            </span>
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onToggleSelection(task.id)}
              className="flex-shrink-0"
              aria-label={`Selecionar tarefa ${task.title}`}
              onClick={event => event.stopPropagation()}
            />
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);
