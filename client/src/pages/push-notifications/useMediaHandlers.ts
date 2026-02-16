import { useState, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

export function useMediaHandlers() {
  const { toast } = useToast();
  const { t } = useTranslation();

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Image functions
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: t('pushNotifications.fileTooLarge'),
          description: t('pushNotifications.imageSizeLimit'),
          variant: 'destructive',
        });
        return;
      }
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Audio functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = event => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);

      toast({
        title: t('pushNotifications.recording'),
        description: t('pushNotifications.clickToStopRecording'),
      });
    } catch {
      toast({
        title: t('pushNotifications.recordingError'),
        description: t('pushNotifications.microphoneAccessError'),
        variant: 'destructive',
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      toast({
        title: t('pushNotifications.recordingComplete'),
        description: t('pushNotifications.audioReady'),
      });
    }
  };

  const playAudio = () => {
    if (audioUrl) {
      if (!audioPlayerRef.current) {
        audioPlayerRef.current = new Audio(audioUrl);
      }
      audioPlayerRef.current.play();
      setIsPlayingAudio(true);
      audioPlayerRef.current.onended = () => setIsPlayingAudio(false);
    }
  };

  const pauseAudio = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      setIsPlayingAudio(false);
    }
  };

  const removeAudio = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setIsPlayingAudio(false);
  };

  return {
    selectedImage,
    imagePreview,
    fileInputRef,
    handleImageSelect,
    removeImage,
    isRecording,
    startRecording,
    stopRecording,
    audioBlob,
    audioUrl,
    isPlayingAudio,
    playAudio,
    pauseAudio,
    removeAudio,
  };
}
