import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, Plus, Settings, Code } from 'lucide-react';
import { MobileLayout } from '@/components/layout/MobileLayout';

export default function Reports() {
  const [isDeveloping, setIsDeveloping] = useState(true);

  return (
    <MobileLayout>
      <div className="container mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-1" />
              Config
            </Button>
          </div>
        </div>

        {/* Development Mode Banner */}
        <Card className="border-dashed border-2 border-orange-300 bg-orange-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Code className="h-8 w-8 text-orange-600" />
              <div>
                <h3 className="text-lg font-semibold text-orange-800">
                  🚧 Página em Desenvolvimento
                </h3>
                <p className="text-orange-700">
                  Esta página está sendo desenvolvida. Use o espaço abaixo para implementar os relatórios.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Development Area */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Área de Desenvolvimento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  Aqui você pode implementar os relatórios conforme necessário.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg text-center">
                    <p className="text-sm text-gray-500">Card 1</p>
                    <p className="text-xs text-gray-400">Implementar aqui</p>
                  </div>
                  
                  <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg text-center">
                    <p className="text-sm text-gray-500">Card 2</p>
                    <p className="text-xs text-gray-400">Implementar aqui</p>
                  </div>
                  
                  <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg text-center">
                    <p className="text-sm text-gray-500">Card 3</p>
                    <p className="text-xs text-gray-400">Implementar aqui</p>
                  </div>
                  
                  <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg text-center">
                    <p className="text-sm text-gray-500">Card 4</p>
                    <p className="text-xs text-gray-400">Implementar aqui</p>
                  </div>
                </div>

                <div className="text-center pt-4">
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Novo Relatório
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Development Notes */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-800 text-lg">📝 Notas de Desenvolvimento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-blue-700">
              <p>• Página limpa e pronta para desenvolvimento</p>
              <p>• Estrutura básica com MobileLayout</p>
              <p>• Cards placeholder para implementação</p>
              <p>• Design responsivo já configurado</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </MobileLayout>
  );
}