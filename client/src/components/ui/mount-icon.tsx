import React from 'react';
import mountain1 from '@/assets/mountain-1.png';
import mountain2 from '@/assets/mountain-2.png';
import mountain3 from '@/assets/mountain-3.png';
import mountain4 from '@/assets/mountain-4.png';
import mountain5 from '@/assets/mountain-5.png';
import mountain6 from '@/assets/mountain-6.png';
import mountain7 from '@/assets/mountain-7.png';
import mountain8 from '@/assets/mountain-8.png';
import mountain9 from '@/assets/mountain-9.png';

interface MountIconProps {
  iconType: string;
  className?: string;
}

export function MountIcon({ iconType, className = "w-6 h-6" }: MountIconProps) {
  const baseClasses = `${className}`;
  
  switch (iconType) {
    case 'valley':
      return (
        <img src={mountain1} alt="Vale do Jordão" className={baseClasses} />
      );
    
    case 'mountain-1':
      return (
        <img src={mountain2} alt="Monte Sinai" className={baseClasses} />
      );
    
    case 'mountain-2':
      return (
        <img src={mountain3} alt="Monte Nebo" className={baseClasses} />
      );
    
    case 'mountain-3':
      return (
        <img src={mountain4} alt="Monte Moriá" className={baseClasses} />
      );
    
    case 'mountain-4':
      return (
        <img src={mountain5} alt="Monte Carmelo" className={baseClasses} />
      );
    
    case 'mountain-5':
      return (
        <img src={mountain6} alt="Monte Hermon" className={baseClasses} />
      );
    
    case 'mountain-6':
      return (
        <img src={mountain7} alt="Monte Sião" className={baseClasses} />
      );
    
    case 'mountain-7':
      return (
        <img src={mountain8} alt="Monte das Oliveiras" className={baseClasses} />
      );
    
    case 'mountain-8':
      return (
        <img src={mountain9} alt="Canaã - Terra Prometida" className={baseClasses} />
      );
    
    default:
      return (
        <svg className={baseClasses} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L2 12h3v8h6v-6h2v6h6v-8h3L12 2z" fill="currentColor"/>
        </svg>
      );
  }
}
