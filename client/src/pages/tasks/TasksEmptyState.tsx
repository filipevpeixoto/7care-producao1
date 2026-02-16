import type { ElementType } from 'react';

interface TasksEmptyStateProps {
  icon: ElementType;
  title: string;
  description: string;
}

export const TasksEmptyState = ({ icon: Icon, title, description }: TasksEmptyStateProps) => (
  <div className="text-center py-12">
    <div className="inline-flex p-4 rounded-full bg-gray-100 dark:bg-gray-700 mb-4">
      <Icon className="h-8 w-8 text-gray-400" />
    </div>
    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{title}</h3>
    <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">{description}</p>
  </div>
);
