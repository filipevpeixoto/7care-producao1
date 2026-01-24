import { useState, useRef, useEffect, ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  Move,
  Maximize2,
  Minimize2,
  RotateCcw
} from "lucide-react";

interface ResizableModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  description?: string;
  defaultSize?: { width: number; height: number };
  className?: string;
}

const ResizableModal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  description,
  defaultSize = { width: 400, height: 600 },
  className = ""
}: ResizableModalProps) => {
  // Estados para redimensionamento e movimento
  const modalRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState(defaultSize);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });

  // Reset para tamanho padrão quando modal abre
  useEffect(() => {
    if (isOpen) {
      setSize(defaultSize);
      setPosition({ x: 0, y: 0 });
      setIsMaximized(false);
    }
  }, [isOpen, defaultSize]);

  // Funções de redimensionamento
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === modalRef.current || modalRef.current?.contains(e.target as Node)) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging && !isMaximized) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      
      // Limitar movimento dentro da viewport
      const maxX = window.innerWidth - size.width;
      const maxY = window.innerHeight - size.height;
      
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      });
    }
    
    if (isResizing && !isMaximized) {
      const newWidth = resizeStart.width + (e.clientX - resizeStart.x);
      const newHeight = resizeStart.height + (e.clientY - resizeStart.y);
      
      setSize({
        width: Math.max(300, Math.min(newWidth, window.innerWidth - position.x)),
        height: Math.max(300, Math.min(newHeight, window.innerHeight - position.y))
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height
    });
  };

  const toggleMaximize = () => {
    if (isMaximized) {
      // Restaurar tamanho anterior
      setSize(defaultSize);
      setPosition({ x: 0, y: 0 });
    } else {
      // Maximizar
      setSize({ width: window.innerWidth, height: window.innerHeight });
      setPosition({ x: 0, y: 0 });
    }
    setIsMaximized(!isMaximized);
  };

  const resetSize = () => {
    setSize(defaultSize);
    setPosition({ x: 0, y: 0 });
    setIsMaximized(false);
  };

  // Event listeners para movimento e redimensionamento
  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
    return undefined;
  }, [isDragging, isResizing, dragStart, resizeStart]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        ref={modalRef}
        className={`p-0 overflow-hidden ${isMaximized ? 'w-full h-full max-w-none' : ''} ${className}`}
        style={{
          width: isMaximized ? '100vw' : `${size.width}px`,
          height: isMaximized ? '100vh' : `${size.height}px`,
          transform: isMaximized ? 'none' : `translate(${position.x}px, ${position.y}px)`,
          left: isMaximized ? '0' : '50%',
          top: isMaximized ? '0' : '50%',
          margin: isMaximized ? '0' : `-${size.height/2}px 0 0 -${size.width/2}px`,
          position: 'fixed',
          maxHeight: 'none',
          maxWidth: 'none',
          gridTemplateRows: 'auto 1fr',
          zIndex: 60
        }}
        aria-describedby={description ? "modal-description" : undefined}
      >
        {/* Barra de título com controles */}
        <DialogHeader 
          className="flex flex-row items-center justify-between bg-background border-b p-3 cursor-move select-none"
          onMouseDown={handleMouseDown}
        >
          <DialogTitle className="text-sm font-semibold">
            {title}
          </DialogTitle>
          {description && (
            <div id="modal-description" className="sr-only">
              {description}
            </div>
          )}
          
          {/* Controles de janela */}
          <div className="flex items-center gap-2">
            {/* Controles de redimensionamento */}
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={resetSize}
                className="h-6 w-6 p-0"
                title="Resetar tamanho"
              >
                <RotateCcw className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleMaximize}
                className="h-6 w-6 p-0"
                title={isMaximized ? "Restaurar" : "Maximizar"}
              >
                {isMaximized ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Área de conteúdo com scroll */}
        <div className="flex-1 overflow-y-auto p-4">
          {children}
        </div>

        {/* Redimensionador no canto inferior direito */}
        {!isMaximized && (
          <div
            className="absolute bottom-0 right-0 w-4 h-4 cursor-nw-resize opacity-30 hover:opacity-60 transition-opacity"
            onMouseDown={handleResizeStart}
            style={{
              background: 'linear-gradient(-45deg, transparent 30%, #ccc 30%, #ccc 40%, transparent 40%, transparent 60%, #ccc 60%, #ccc 70%, transparent 70%)'
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

export { ResizableModal };
