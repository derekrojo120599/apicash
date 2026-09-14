'use client';

import { useEffect, useRef } from 'react';
import { animate } from 'animejs';

interface AnimatedProgressBarProps {
  progress: number;
  color?: string;
  bgColor?: string;
  height?: number;
  duration?: number;
  delay?: number;
  className?: string;
}

export function AnimatedProgressBar({
  progress,
  color = 'bg-primary-500',
  bgColor = 'bg-slate-100 dark:bg-slate-800',
  height = 12,
  duration = 1000,
  delay = 0,
  className = '',
}: AnimatedProgressBarProps) {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!barRef.current) return;

    const animation = animate(barRef.current, {
      width: `${Math.max(0, Math.min(progress, 100))}%`,
      duration,
      delay,
      ease: 'outExpo',
    });

    return () => { animation.pause(); };
  }, [progress, duration, delay]);

  return (
    <div
      className={`w-full rounded-full overflow-hidden ${bgColor} ${className}`}
      style={{ height }}
    >
      <div
        ref={barRef}
        className={`h-full rounded-full ${color}`}
        style={{ width: '0%' }}
      />
    </div>
  );
}
