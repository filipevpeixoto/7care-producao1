/**
 * OptimizedImage Component
 * Componente para exibir imagens otimizadas com suporte a WebP/AVIF
 * @module components/ui/OptimizedImage
 */

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps {
  /** Caminho base da imagem (sem extensão) */
  src: string;
  /** Texto alternativo para acessibilidade */
  alt: string;
  /** Classes CSS adicionais */
  className?: string;
  /** Largura da imagem */
  width?: number;
  /** Altura da imagem */
  height?: number;
  /** Modo de carregamento */
  loading?: 'lazy' | 'eager';
  /** Prioridade de carregamento */
  priority?: boolean;
  /** Callback quando imagem carrega */
  onLoad?: () => void;
  /** Callback quando ocorre erro */
  onError?: () => void;
  /** Fallback para quando imagem não carrega */
  fallback?: string;
  /** Tamanhos responsivos */
  sizes?: string;
}

/**
 * OptimizedImage - Componente para imagens otimizadas
 *
 * Suporta formatos modernos (WebP, AVIF) com fallback para PNG/JPG.
 * Implementa lazy loading e imagens responsivas automaticamente.
 *
 * @example
 * ```tsx
 * <OptimizedImage
 *   src="/assets/optimized/mountain-1"
 *   alt="Montanha"
 *   className="w-full h-64 object-cover"
 *   loading="lazy"
 * />
 * ```
 */
export function OptimizedImage({
  src,
  alt,
  className,
  width,
  height,
  loading = 'lazy',
  priority = false,
  onLoad,
  onError,
  fallback = '/placeholder.svg',
  sizes = '(max-width: 640px) 640px, (max-width: 1024px) 1024px, 1920px',
}: OptimizedImageProps) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Reset error state when src changes
  useEffect(() => {
    setError(false);
    setLoaded(false);
  }, [src]);

  const handleLoad = () => {
    setLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setError(true);
    onError?.();
  };

  // Se houve erro, mostrar fallback
  if (error) {
    return (
      <img
        src={fallback}
        alt={alt}
        className={cn('bg-gray-100', className)}
        width={width}
        height={height}
      />
    );
  }

  // Gerar srcset para imagens responsivas
  const generateSrcSet = (format: string) => {
    return [
      `${src}-sm.${format} 640w`,
      `${src}-md.${format} 1024w`,
      `${src}-lg.${format} 1920w`,
    ].join(', ');
  };

  return (
    <picture>
      {/* AVIF - melhor compressão, suporte limitado */}
      <source type="image/avif" srcSet={generateSrcSet('avif')} sizes={sizes} />
      {/* WebP - boa compressão, amplo suporte */}
      <source type="image/webp" srcSet={generateSrcSet('webp')} sizes={sizes} />
      {/* Fallback para navegadores antigos */}
      <img
        src={`${src}-lg.png`}
        alt={alt}
        className={cn(
          'transition-opacity duration-300',
          !loaded && 'opacity-0',
          loaded && 'opacity-100',
          className
        )}
        width={width}
        height={height}
        loading={priority ? 'eager' : loading}
        decoding="async"
        onLoad={handleLoad}
        onError={handleError}
        // Fetchpriority for LCP images
        {...(priority && { fetchPriority: 'high' })}
      />
    </picture>
  );
}

/**
 * Hook para precarregar imagens
 */
export function useImagePreload(src: string) {
  useEffect(() => {
    const formats = ['avif', 'webp', 'png'];
    const sizes = ['sm', 'md', 'lg'];

    formats.forEach(format => {
      sizes.forEach(size => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = `${src}-${size}.${format}`;
        link.type = `image/${format}`;
        document.head.appendChild(link);
      });
    });
  }, [src]);
}

export default OptimizedImage;
