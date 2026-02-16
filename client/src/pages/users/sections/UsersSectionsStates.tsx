import { User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MobileLayout } from '@/components/layout/MobileLayout';

type UsersLoadingProps = {
  message: string;
};

export const UsersLoadingState = ({ message }: UsersLoadingProps) => (
  <MobileLayout>
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{message}</p>
        </div>
      </div>
    </div>
  </MobileLayout>
);

type UsersErrorProps = {
  onRetry: () => void;
};

export const UsersErrorState = ({ onRetry }: UsersErrorProps) => (
  <MobileLayout>
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <p className="text-destructive">Erro ao carregar usuários</p>
          <Button onClick={onRetry} className="mt-2">
            Tentar novamente
          </Button>
        </div>
      </div>
    </div>
  </MobileLayout>
);

type EmptyStateProps = {
  isVisible: boolean;
};

export const UsersEmptyState = ({ isVisible }: EmptyStateProps) =>
  isVisible ? (
    <div className="text-center py-8" data-testid="empty-state">
      <UserIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
      <h3 className="text-lg font-medium text-foreground mb-2">Nenhum usuário encontrado</h3>
      <p className="text-muted-foreground">Tente ajustar os filtros de busca.</p>
    </div>
  ) : null;
