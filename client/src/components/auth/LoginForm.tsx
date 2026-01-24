import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Limpa localStorage para garantir fluxo correto de primeiro acesso
    localStorage.removeItem('tutorial_completed');
    localStorage.removeItem('tutorial_skipped');

    try {
      console.log('🔍 Debug LoginForm - Attempting login...');
      const success = await login(email, password);
      
      if (success) {
        console.log('🔍 Debug LoginForm - Login successful, showing toast...');
        toast({
          title: "Login realizado com sucesso!",
          description: "Bem-vindo!",
        });
        // Verificar se precisa de primeiro acesso
        const user = JSON.parse(localStorage.getItem('7care_auth') || '{}');
        const tutorialCompleted = localStorage.getItem('tutorial_completed');
        const tutorialSkipped = localStorage.getItem('tutorial_skipped');
        const needsFirstAccess = !tutorialCompleted && !tutorialSkipped && 
          (user.usingDefaultPassword || user.firstAccess || user.status === 'pending');
        
        // Verificar se é pastor e precisa de primeiro acesso específico
        const pastorFirstAccessCompleted = localStorage.getItem('pastor_first_access_completed');
        const isPastorUser = user.role === 'pastor';
        const needsPastorFirstAccess = isPastorUser && !pastorFirstAccessCompleted && needsFirstAccess;
        
        console.log('🔍 Debug LoginForm - Login completed, checking redirect...');
        console.log('  - user:', user);
        console.log('  - needsFirstAccess:', needsFirstAccess);
        console.log('  - isPastorUser:', isPastorUser);
        console.log('  - needsPastorFirstAccess:', needsPastorFirstAccess);
        
        if (needsPastorFirstAccess) {
          console.log('🔍 Debug LoginForm - Redirecting to /pastor-first-access');
          navigate('/pastor-first-access');
        } else if (needsFirstAccess) {
          console.log('🔍 Debug LoginForm - Redirecting to /first-access');
          navigate('/first-access');
        } else {
          console.log('🔍 Debug LoginForm - Redirecting to /dashboard');
          navigate('/dashboard');
        }
      } else {
        toast({
          title: "Erro no login",
          description: "Email ou senha incorretos",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erro no login",
        description: "Ocorreu um erro inesperado",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md shadow-divine">
      <CardHeader className="text-center space-y-4">
        <CardTitle className="text-2xl font-bold text-primary">
          Entre na sua conta
        </CardTitle>

      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email ou Usuário</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="text"
                placeholder="seu@email.com ou seu.usuario"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-gradient-primary hover:opacity-90 transition-opacity"
            disabled={isLoading}
          >
            {isLoading ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>


      </CardContent>
    </Card>
  );
};