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
    <div
      className="mx-auto max-w-lg rounded-[1.5rem] border border-border/70 bg-card/90 px-6 py-8 text-center shadow-sm"
      data-testid="empty-state"
    >
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <UserIcon className="h-7 w-7" />
      </div>
      <h3 className="mb-2 text-lg font-medium text-foreground">
        Nenhum usuário corresponde aos filtros
      </h3>
      <p className="text-sm leading-6 text-muted-foreground">
        Revise o termo de busca, a igreja e os filtros ativos para ampliar os resultados desta
        lista.
      </p>
    </div>
  ) : null;
