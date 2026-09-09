'use client';

import { useEffect, useRef, type ElementType } from 'react';
import { animate, stagger } from 'animejs';

interface StaggerContainerProps {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
  duration?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  distance?: number;
  as?: ElementType;
}

export function StaggerContainer({
  children,
  className = '',
  staggerDelay = 100,
  duration = 600,
  direction = 'up',
  distance = 24,
  as: Component = 'div',
}: StaggerContainerProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    const items = ref.current.querySelectorAll('[data-anime]');
    if (items.length === 0) return;

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

    items.forEach((item) => {
      const el = item as HTMLElement;
      el.style.opacity = String(initial.opacity);
      if (initial.translateX !== undefined) {
        el.style.transform = `translateX(${initial.translateX}px)`;
      } else if (initial.translateY !== undefined) {
        el.style.transform = `translateY(${initial.translateY}px)`;
      }
    });

    const animation = animate(items, {
      ...final,
      duration,
      delay: stagger(staggerDelay),
      ease: 'outCubic',
    });

    return () => { animation.pause(); };
  }, [staggerDelay, duration, direction, distance]);

  const Tag = Component as React.ElementType;
  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  );
}
