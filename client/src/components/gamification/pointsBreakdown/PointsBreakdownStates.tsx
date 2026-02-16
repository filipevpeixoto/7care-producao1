import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Star } from 'lucide-react';

type LoadingStateProps = {
  message: string;
};

export const PointsBreakdownLoading = ({ message }: LoadingStateProps) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Star className="h-5 w-5 text-primary" />
        Detalhes da Pontuação
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="flex items-center justify-center h-32">
        <div className="text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
      </div>
    </CardContent>
  </Card>
);

type ErrorStateProps = {
  message: string;
  onRetry: () => void;
};

export const PointsBreakdownError = ({ message, onRetry }: ErrorStateProps) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Star className="h-5 w-5 text-primary" />
        Detalhes da Pontuação
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-center p-6">
        <p className="text-sm text-muted-foreground mb-4">{message}</p>
        <button onClick={onRetry} className="text-sm text-primary hover:underline">
          Tentar novamente
        </button>
      </div>
    </CardContent>
  </Card>
);
