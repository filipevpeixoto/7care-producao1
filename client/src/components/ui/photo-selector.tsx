import React, { useRef, useState } from 'react';
import { Camera, Image, X, Upload, Loader2 } from 'lucide-react';
import { Button } from './button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from './dialog';
import { Card, CardContent } from './card';
import { CameraCapture } from './camera-capture';

interface PhotoSelectorProps {
  currentPhoto?: string | null;
  onPhotoSelect: (file: File) => void;
  onPhotoRemove?: () => void;
  isLoading?: boolean;
  trigger?: React.ReactNode;
}

export const PhotoSelector: React.FC<PhotoSelectorProps> = ({
  currentPhoto,
  onPhotoSelect,
  onPhotoRemove,
  isLoading = false,
  trigger
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleCameraCapture = (file: File) => {
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setIsCameraOpen(false);
  };

  const handleConfirm = () => {
    if (selectedFile) {
      onPhotoSelect(selectedFile);
      setIsOpen(false);
      setSelectedFile(null);
      setPreviewUrl(null);
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setIsOpen(false);
  };

  const handleRemove = () => {
    if (onPhotoRemove) {
      onPhotoRemove();
      setIsOpen(false);
    }
  };

  const openFileSelector = () => {
    fileInputRef.current?.click();
  };

  const openCamera = () => {
    setIsCameraOpen(true);
  };

  const displayPhoto = previewUrl || currentPhoto;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" className="absolute -bottom-2 -right-2 rounded-full w-8 h-8 p-0">
            <Camera className="w-4 h-4" />
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Alterar Foto do Perfil</DialogTitle>
          <DialogDescription>
            Escolha uma foto da câmera ou galeria para atualizar sua foto de perfil.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Current Photo Preview */}
          {displayPhoto && (
            <div className="text-center">
              <div className="relative mx-auto w-32 h-32 mb-4">
                <img
                  src={displayPhoto}
                  alt="Foto do perfil"
                  className="w-32 h-32 rounded-full object-cover border-4 border-gray-200"
                />
                {previewUrl && (
                  <div className="absolute -top-2 -right-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      className="rounded-full w-6 h-6 p-0"
                      onClick={() => {
                        setSelectedFile(null);
                        setPreviewUrl(null);
                      }}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {previewUrl ? 'Nova foto selecionada' : 'Foto atual'}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={openCamera}
              className="flex flex-col items-center gap-2 py-6"
            >
              <Camera className="w-6 h-6" />
              <span className="text-sm">Câmera</span>
            </Button>
            
            <Button
              variant="outline"
              onClick={openFileSelector}
              className="flex flex-col items-center gap-2 py-6"
            >
              <Image className="w-6 h-6" />
              <span className="text-sm">Galeria</span>
            </Button>
          </div>

          {/* Hidden Inputs */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          {/* Camera Component */}
          <CameraCapture
            isOpen={isCameraOpen}
            onClose={() => setIsCameraOpen(false)}
            onCapture={handleCameraCapture}
            isLoading={isLoading}
          />

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            {currentPhoto && onPhotoRemove && (
              <Button
                variant="destructive"
                onClick={handleRemove}
                className="flex-1"
              >
                <X className="w-4 h-4 mr-2" />
                Remover
              </Button>
            )}
            
            <Button
              variant="outline"
              onClick={handleCancel}
              className="flex-1"
            >
              Cancelar
            </Button>
            
            <Button
              onClick={handleConfirm}
              disabled={!selectedFile || isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Confirmar
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
