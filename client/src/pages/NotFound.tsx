import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Home, ArrowLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Log apenas em desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      console.error(
        "404 Error: User attempted to access non-existent route:",
        location.pathname
      );
    }
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 p-4">
      <div className="text-center space-y-6 max-w-md">
        {/* Ícone animado */}
        <div className="relative">
          <div className="text-9xl font-bold text-white/10 select-none">404</div>
          <Search className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 text-blue-400 animate-pulse" />
        </div>
        
        {/* Mensagem */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white">Página não encontrada</h1>
          <p className="text-blue-200/80">
            A página que você está procurando não existe ou foi movida.
          </p>
          <p className="text-sm text-blue-300/60">
            Caminho: <code className="bg-white/10 px-2 py-1 rounded">{location.pathname}</code>
          </p>
        </div>
        
        {/* Botões de ação */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <Button
            onClick={() => navigate('/dashboard')}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Home className="w-4 h-4 mr-2" />
            Ir para o Início
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
