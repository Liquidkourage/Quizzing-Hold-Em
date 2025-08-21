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
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  };

  return (
    <div 
      className={`inline-block ${sizeClasses[size]} ${className}`}
      style={{
        background: '#ff6b6b',
        borderRadius: '50%',
        boxShadow: '0 0 4px rgba(255,107,107,0.6)',
      }}
    />
  );
};
