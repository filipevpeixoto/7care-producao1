import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface UserCardSkeletonProps {
  count?: number;
}

/**
 * Skeleton para UserCard durante carregamento
 * Mantém a mesma estrutura visual do card real
 */
export function UserCardSkeleton({ count = 1 }: UserCardSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <Card 
          key={index} 
          className="overflow-hidden hover:shadow-md transition-shadow animate-pulse"
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <Skeleton className="h-16 w-16 rounded-full shrink-0" />
              
              {/* Conteúdo principal */}
              <div className="flex-1 min-w-0 space-y-3">
                {/* Nome e badges */}
                <div className="flex items-center justify-between gap-2">
                  <Skeleton className="h-5 w-40" />
                  <div className="flex gap-1">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </div>
                </div>
                
                {/* Informações secundárias */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
                
                {/* Stats badges */}
                <div className="flex flex-wrap gap-2 pt-2">
                  <Skeleton className="h-6 w-20 rounded-md" />
                  <Skeleton className="h-6 w-24 rounded-md" />
                  <Skeleton className="h-6 w-16 rounded-md" />
                </div>
              </div>
              
              {/* Menu de ações */}
              <Skeleton className="h-8 w-8 rounded-md shrink-0" />
            </div>
            
            {/* Barra de progresso/pontos */}
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between mb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  );
}

/**
 * Skeleton para lista de usuários em grid
 */
export function UserGridSkeleton({ count = 6 }: UserCardSkeletonProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <UserCardSkeleton count={count} />
    </div>
  );
}

/**
 * Skeleton para lista de usuários
 */
export function UserListSkeleton({ count = 5 }: UserCardSkeletonProps) {
  return (
    <div className="space-y-4">
      <UserCardSkeleton count={count} />
    </div>
  );
}

export default UserCardSkeleton;
