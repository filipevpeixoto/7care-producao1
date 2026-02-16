import { memo, type ComponentType } from 'react';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, ArrowUp } from 'lucide-react';

export type Category = {
  name: string;
  points: number;
  icon: ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  description: string;
};

type CategoryCardProps = {
  category: Category;
  tips: string[];
  maxPoints?: number;
};

type CategoryGridProps = {
  title: string;
  categories: Category[];
  columnsClassName: string;
  getTips: (name: string) => string[];
  getMaxPoints?: (name: string) => number;
};

const CategoryCardComponent = ({ category, tips, maxPoints }: CategoryCardProps) => {
  const IconComponent = category.icon;
  const hasTips = tips.length > 0;
  const isMax = maxPoints !== undefined && maxPoints > 0 && category.points >= maxPoints;

  return (
    <div
      className={`p-3 rounded-lg border ${category.bgColor} hover:shadow-md transition-shadow group min-w-0 ${isMax ? 'ring-2 ring-green-200 dark:ring-green-700 border-green-300 dark:border-green-600' : ''}`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <IconComponent className={`h-4 w-4 ${category.color} flex-shrink-0`} />
          <span className="font-medium text-sm truncate">{category.name}</span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Badge variant="secondary" className="text-xs">
            {category.points} pts
          </Badge>
          {isMax && (
            <Badge
              variant="outline"
              className="text-[10px] bg-green-50 dark:bg-green-900/40 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700"
            >
              Máximo
            </Badge>
          )}
          {hasTips && (
            <Badge
              variant="outline"
              className="text-xs bg-yellow-50 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700"
            >
              <Lightbulb className="h-3 w-3 mr-1" />
              Dicas
            </Badge>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{category.description}</p>
      {hasTips && (
        <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-md">
          <div className="flex items-center gap-2 mb-2">
            <ArrowUp className="h-3 w-3 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
            <span className="text-xs font-medium text-yellow-800 dark:text-yellow-200">
              Como ganhar mais pontos:
            </span>
          </div>
          <div className="space-y-1">
            {tips.map((tip, index) => (
              <p
                key={index}
                className="text-xs text-yellow-700 dark:text-yellow-300 leading-relaxed line-clamp-2"
              >
                {tip}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const CategoryCard = memo(CategoryCardComponent);

const CategoryGridComponent = ({
  title,
  categories,
  columnsClassName,
  getTips,
  getMaxPoints,
}: CategoryGridProps) => (
  <div className="space-y-3">
    <h3 className="text-lg font-semibold">{title}</h3>
    <div className={columnsClassName}>
      {categories.map((category) => (
        <CategoryCard
          key={category.name}
          category={category}
          tips={getTips(category.name)}
          maxPoints={getMaxPoints ? getMaxPoints(category.name) : undefined}
        />
      ))}
    </div>
  </div>
);

export const CategoryGrid = memo(CategoryGridComponent);
