import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, RotateCcw, Loader2, Check } from 'lucide-react';
import { Button } from './button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './dialog';

interface CameraCaptureProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
  isLoading?: boolean;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({
  isOpen,
  onClose,
  onCapture,
  isLoading = false
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isStreamActive, setIsStreamActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Detectar se é mobile
    const checkMobile = () => {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsMobile(isMobileDevice);
    };
    
    checkMobile();
  }, []);

  useEffect(() => {
    if (isOpen && !capturedImage) {
      startCamera();
    }
    
    return () => {
      stopCamera();
    };
  }, [isOpen, capturedImage]);

  const startCamera = async () => {
    try {
      setHasPermission(null);
      
      // Configurações da câmera
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: isMobile ? 'environment' : 'user', // Câmera traseira no mobile, frontal no desktop
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
      
      setStream(mediaStream);
      setIsStreamActive(true);
      setHasPermission(true);
    } catch (error) {
      console.error('Erro ao acessar câmera:', error);
      setHasPermission(false);
      setIsStreamActive(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setIsStreamActive(false);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Definir tamanho do canvas
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Desenhar frame atual do vídeo no canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Converter para blob/file
    canvas.toBlob((blob) => {
      if (blob) {
        const imageUrl = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(imageUrl);
        stopCamera();
      }
    }, 'image/jpeg', 0.8);
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    startCamera();
  };

  const confirmPhoto = () => {
    if (!capturedImage || !canvasRef.current) return;

    canvasRef.current.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
        onCapture(file);
        handleClose();
      }
    }, 'image/jpeg', 0.8);
  };

  const handleClose = () => {
    stopCamera();
    setCapturedImage(null);
    onClose();
  };

  const switchCamera = async () => {
    stopCamera();
    
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: isMobile ? (stream?.getVideoTracks()[0]?.getSettings().facingMode === 'environment' ? 'user' : 'environment') : 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
      
      setStream(mediaStream);
      setIsStreamActive(true);
    } catch (error) {
      console.error('Erro ao trocar câmera:', error);
      startCamera(); // Volta para a câmera anterior
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg p-0">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Tirar Foto
          </DialogTitle>
          <DialogDescription>
            Use os controles para tirar uma foto com sua câmera.
          </DialogDescription>
        </DialogHeader>

        <div className="relative bg-black rounded-lg overflow-hidden">
          {/* Área da Câmera */}
          <div className="relative aspect-[4/3] bg-black flex items-center justify-center">
            {hasPermission === null && (
              <div className="text-white text-center p-4">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p>Solicitando acesso à câmera...</p>
              </div>
            )}

            {hasPermission === false && (
              <div className="text-white text-center p-4">
                <Camera className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="mb-2">Câmera não disponível</p>
                <p className="text-sm text-gray-300">
                  Verifique se você deu permissão para acessar a câmera
                </p>
                <Button variant="outline" size="sm" className="mt-4" onClick={startCamera}>
                  Tentar Novamente
                </Button>
              </div>
            )}

            {capturedImage ? (
              <img
                src={capturedImage}
                alt="Foto capturada"
                className="w-full h-full object-cover"
              />
            ) : (
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                muted
              />
            )}

            {/* Canvas oculto para captura */}
            <canvas ref={canvasRef} className="hidden" />
          </div>

          {/* Controles */}
          {hasPermission && (
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
              <div className="flex items-center justify-center gap-4">
                {capturedImage ? (
                  // Controles pós-captura
                  <>
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={retakePhoto}
                      className="bg-white/20 border-white/30 text-white hover:bg-white/30"
                    >
                      <RotateCcw className="h-5 w-5 mr-2" />
                      Tirar Novamente
                    </Button>
                    
                    <Button
                      size="lg"
                      onClick={confirmPhoto}
                      disabled={isLoading}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <Check className="h-5 w-5 mr-2" />
                          Confirmar
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  // Controles durante captura
                  <>
                    {isMobile && (
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={switchCamera}
                        className="bg-white/20 border-white/30 text-white hover:bg-white/30"
                      >
                        <RotateCcw className="h-5 w-5" />
                      </Button>
                    )}
                    
                    <Button
                      size="lg"
                      onClick={capturePhoto}
                      disabled={!isStreamActive}
                      className="bg-white text-black hover:bg-gray-100 rounded-full w-16 h-16 p-0"
                    >
                      <div className="w-12 h-12 bg-white rounded-full border-4 border-gray-300" />
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={handleClose}
                      className="bg-white/20 border-white/30 text-white hover:bg-white/30"
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
