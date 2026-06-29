import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverEffect?: boolean;
  key?: string;
  id?: string;
}

export default function GlassCard({
  children,
  className = '',
  onClick,
  hoverEffect = false,
  id,
}: GlassCardProps) {
  return (
    <div
      onClick={onClick}
      id={id}
      className={`
        backdrop-blur-2xl
        bg-[var(--glass-bg)]
        border border-[var(--glass-border)]
        shadow-[var(--card-shadow)]
        rounded-3xl
        p-6
        text-[var(--text-color)]
        transition-all duration-300
        ${hoverEffect ? 'hover:bg-[var(--glass-highlight)] hover:translate-y-[-2px] cursor-pointer' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}
