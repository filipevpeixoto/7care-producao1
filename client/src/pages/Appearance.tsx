import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Save, RefreshCw } from 'lucide-react';
import { MobileLayout } from '@/components/layout/MobileLayout';

export default function Appearance() {
  // Estes estados assumem que você já tinha hooks/estados no Settings.tsx.
  // Se já existem hooks como useMobileHeaderLayout, importe-os aqui.
  const [mobileHeaderLayout, setMobileHeaderLayout] = useState({
    logo: { offsetX: 0, offsetY: 0 },
    welcome: { offsetX: 0, offsetY: 0 },
    actions: { offsetX: 0, offsetY: 0 },
  });

  const update = (section: 'logo'|'welcome'|'actions', key: 'offsetX'|'offsetY', value: number) => {
    setMobileHeaderLayout((prev) => ({
      ...prev,
      [section]: { ...prev[section], [key]: value }
    }));
  };

  const reset = () => setMobileHeaderLayout({
    logo: { offsetX: 0, offsetY: 0 },
    welcome: { offsetX: 0, offsetY: 0 },
    actions: { offsetX: 0, offsetY: 0 },
  });

  const save = () => {
    const event = new CustomEvent('mobileHeaderLayoutUpdated', { detail: { layout: mobileHeaderLayout } });
    window.dispatchEvent(event);
  };

  return (
    <MobileLayout>
      <div className="p-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">Aparência</CardTitle>
            <CardDescription>Layout do Mobile Header</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">Layout do Mobile Header</h3>
              <Badge variant="secondary">Admin</Badge>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg border">
              <p className="text-sm text-gray-600 mb-4">Arraste e solte os elementos para ajustar suas posições no header móvel</p>
              <div className="bg-white rounded-lg border p-4 mb-4">
                <div className="text-xs text-gray-500 mb-2 text-center">Preview do Header</div>
                <div className="bg-gradient-to-r from-white via-blue-50/30 to-purple-50/30 rounded-lg p-3 border">
                  <div className="flex items-center gap-3">
                    <div className="relative cursor-move bg-blue-100 p-2 rounded border-2 border-dashed border-blue-300">
                      <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center text-white text-xs font-bold">L</div>
                    </div>
                    <div className="relative cursor-move bg-green-100 p-2 rounded border-2 border-dashed border-green-300">
                      <div className="text-xs text-green-700 font-medium whitespace-nowrap">Boa noite, Usuário!</div>
                    </div>
                    <div className="relative cursor-move bg-purple-100 p-2 rounded border-2 border-dashed border-purple-300 ml-auto">
                      <div className="flex gap-1">
                        <div className="w-4 h-4 bg-purple-500 rounded text-white text-xs flex items-center justify-center">C</div>
                        <div className="w-4 h-4 bg-purple-500 rounded text-white text-xs flex items-center justify-center">N</div>
                        <div className="w-4 h-4 bg-purple-500 rounded text-white text-xs flex items-center justify-center">U</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Logo</Label>
                  <div className="space-y-2">
                    <div>
                      <Label className="text-xs">X: {mobileHeaderLayout.logo.offsetX}px</Label>
                      <input type="range" min="-50" max="50" value={mobileHeaderLayout.logo.offsetX} onChange={(e) => update('logo','offsetX', parseInt(e.target.value))} className="w-full" />
                    </div>
                    <div>
                      <Label className="text-xs">Y: {mobileHeaderLayout.logo.offsetY}px</Label>
                      <input type="range" min="-20" max="20" value={mobileHeaderLayout.logo.offsetY} onChange={(e) => update('logo','offsetY', parseInt(e.target.value))} className="w-full" />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Boas-vindas</Label>
                  <div className="space-y-2">
                    <div>
                      <Label className="text-xs">X: {mobileHeaderLayout.welcome.offsetX}px</Label>
                      <input type="range" min="-50" max="50" value={mobileHeaderLayout.welcome.offsetX} onChange={(e) => update('welcome','offsetX', parseInt(e.target.value))} className="w-full" />
                    </div>
                    <div>
                      <Label className="text-xs">Y: {mobileHeaderLayout.welcome.offsetY}px</Label>
                      <input type="range" min="-20" max="20" value={mobileHeaderLayout.welcome.offsetY} onChange={(e) => update('welcome','offsetY', parseInt(e.target.value))} className="w-full" />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Botões de Ação</Label>
                  <div className="space-y-2">
                    <div>
                      <Label className="text-xs">X: {mobileHeaderLayout.actions.offsetX}px</Label>
                      <input type="range" min="-50" max="50" value={mobileHeaderLayout.actions.offsetX} onChange={(e) => update('actions','offsetX', parseInt(e.target.value))} className="w-full" />
                    </div>
                    <div>
                      <Label className="text-xs">Y: {mobileHeaderLayout.actions.offsetY}px</Label>
                      <input type="range" min="-20" max="20" value={mobileHeaderLayout.actions.offsetY} onChange={(e) => update('actions','offsetY', parseInt(e.target.value))} className="w-full" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4">
                <Button variant="outline" size="sm" onClick={reset}><RefreshCw className="h-4 w-4 mr-2" />Resetar Posições</Button>
                <Button size="sm" onClick={save} className="bg-green-600 hover:bg-green-700"><Save className="h-4 w-4 mr-2" />Salvar Layout</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MobileLayout>
  );
}



