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
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  return (
    <div 
      className={`inline-block ${sizeClasses[size]} ${className}`}
      style={{
        background: 'radial-gradient(circle at 30% 30%, #ff6b6b, #ee5a24)',
        borderRadius: '50%',
        border: '2px solid #2c3e50',
        boxShadow: 'inset 0 0 8px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.2)',
        position: 'relative'
      }}
    >
      {/* Inner ring */}
      <div 
        className="absolute inset-1 rounded-full"
        style={{
          border: '1px solid #34495e',
          background: 'radial-gradient(circle at 40% 40%, #ff8e8e, #ff6b6b)'
        }}
      />
      {/* Center dot */}
      <div 
        className="absolute inset-2 rounded-full"
        style={{
          background: 'radial-gradient(circle at 50% 50%, #ffa5a5, #ff8e8e)',
          border: '1px solid #ecf0f1'
        }}
      />
    </div>
  );
};
