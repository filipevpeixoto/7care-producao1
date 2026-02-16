import { Button } from '@/components/ui/button';
import { Save, RefreshCw } from 'lucide-react';

export const ActionButtons = ({
  isLoading,
  handleSave,
  handleReset,
}: {
  isLoading: boolean;
  handleSave: () => void;
  handleReset: () => void;
}) => (
  <div className="flex flex-col sm:flex-row gap-3">
    <Button onClick={handleSave} disabled={isLoading} className="flex-1" data-testid="button-save">
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
);
