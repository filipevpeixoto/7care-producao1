import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Church as ChurchIcon, CheckCircle } from 'lucide-react';
import type { ElectionChurch, ElectionConfigData } from './types';

export interface StepChurchSelectionProps {
  config: ElectionConfigData;
  setConfig: React.Dispatch<React.SetStateAction<ElectionConfigData>>;
  churches: ElectionChurch[];
  handleChurchChange: (value: string) => void;
}

export function StepChurchSelection({
  config,
  setConfig,
  churches,
  handleChurchChange,
}: StepChurchSelectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ChurchIcon className="h-5 w-5" />
          Seleção da Igreja
        </CardTitle>
        <CardDescription>Selecione qual igreja será feita a eleição de liderança</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="nomination-title">Nome da Nomeação</Label>
          <Input
            id="nomination-title"
            type="text"
            placeholder="Ex.: Nomeação 2025 - Comissão de Nomeações"
            value={config.title || ''}
            onChange={(e) => setConfig((prev) => ({ ...prev, title: e.target.value }))}
          />
          <p className="text-xs text-muted-foreground">
            Defina um nome para identificar esta nomeação. Útil quando houver várias nomeações para
            a mesma igreja.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="church">Igreja</Label>
          <Select value={config.churchId?.toString() || ''} onValueChange={handleChurchChange}>
            <SelectTrigger aria-label="Selecionar igreja para a nomeação">
              <SelectValue placeholder="Selecione uma igreja" />
            </SelectTrigger>
            <SelectContent>
              {churches.map((church) => (
                <SelectItem key={church.id} value={church.id?.toString() || ''}>
                  {church.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {config.churchName && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Eleição será realizada na igreja: <strong>{config.churchName}</strong>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
