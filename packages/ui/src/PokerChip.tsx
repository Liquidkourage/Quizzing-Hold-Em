import React from 'react';

interface PokerChipProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const PokerChip: React.FC<PokerChipProps> = ({ 
  size = 'md', 
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  return (
    <span 
      className={`inline-block ${sizeClasses[size]} ${className}`}
      style={{
        color: '#ff6b6b',
        fontWeight: 'bold',
        textShadow: '0 0 4px rgba(255,107,107,0.6)',
      }}
    >
      -
    </span>
  );
};
