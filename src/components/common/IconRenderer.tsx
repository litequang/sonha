import React from 'react';
import * as Icons from 'lucide-react';

interface IconRendererProps {
  name: string;
  className?: string;
  size?: number;
  color?: string;
}

export const IconRenderer: React.FC<IconRendererProps> = ({ name, className = 'w-5 h-5', size, color }) => {
  // @ts-ignore
  const Component = Icons[name] || Icons.CircleDot;
  return <Component className={className} size={size} color={color} />;
};
