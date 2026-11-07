'use client';

import { useEffect, useRef } from 'react';
import { animate } from 'animejs';

interface AnimatedCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function AnimatedCard({ children, className = '', onClick }: AnimatedCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const animationRef = useRef<{ pause: () => void } | null>(null);

  useEffect(() => {
    if (!ref.current) return;

    ref.current.style.transform = 'translateY(0px) scale(1)';

    return () => {
      animationRef.current?.pause();
    };
  }, []);

  const handleMouseEnter = () => {
    if (!ref.current) return;
    animationRef.current?.pause();
    animationRef.current = animate(ref.current, {
      translateY: -4,
      duration: 300,
      ease: 'outQuad',
    });
  };

  const handleMouseLeave = () => {
    if (!ref.current) return;
    animationRef.current?.pause();
    animationRef.current = animate(ref.current, {
      translateY: 0,
      duration: 300,
      ease: 'outQuad',
    });
  };

  const handleMouseDown = () => {
    if (!ref.current) return;
    animate(ref.current, {
      scale: 0.98,
      duration: 100,
      ease: 'outQuad',
    });
  };

  const handleMouseUp = () => {
    if (!ref.current) return;
    animate(ref.current, {
      scale: 1,
      duration: 150,
      ease: 'outBack(1.7)',
    });
  };

  return (
    <div
      ref={ref}
      className={className}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </div>
  );
}
