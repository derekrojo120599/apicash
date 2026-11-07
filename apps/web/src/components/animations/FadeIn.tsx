'use client';

import { useEffect, useRef, type ElementType } from 'react';
import { animate } from 'animejs';

interface FadeInProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  distance?: number;
  className?: string;
  as?: ElementType;
}

export function FadeIn({
  children,
  delay = 0,
  duration = 600,
  direction = 'up',
  distance = 24,
  className = '',
  as: Component = 'div',
}: FadeInProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    const initial: Record<string, number | string> = { opacity: 0 };
    const final: Record<string, number | string> = { opacity: 1 };

    if (direction === 'up') {
      initial.translateY = distance;
      final.translateY = 0;
    } else if (direction === 'down') {
      initial.translateY = -distance;
      final.translateY = 0;
    } else if (direction === 'left') {
      initial.translateX = distance;
      final.translateX = 0;
    } else if (direction === 'right') {
      initial.translateX = -distance;
      final.translateX = 0;
    }

    ref.current.style.opacity = String(initial.opacity);
    if (initial.translateX !== undefined) {
      ref.current.style.transform = `translateX(${initial.translateX}px)`;
    } else if (initial.translateY !== undefined) {
      ref.current.style.transform = `translateY(${initial.translateY}px)`;
    }

    const animation = animate(ref.current, {
      ...final,
      duration,
      delay,
      ease: 'outCubic',
    });

    return () => { animation.pause(); };
  }, [delay, duration, direction, distance]);

  const Tag = Component as React.ElementType;
  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  );
}
