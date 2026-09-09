'use client';

import { useEffect, useRef } from 'react';
import { animate, stagger } from 'animejs';

interface AnimatedLoaderProps {
  size?: number;
  color?: string;
  className?: string;
}

export function AnimatedLoader({
  size = 48,
  color = '#10b981',
  className = '',
}: AnimatedLoaderProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    const dots = ref.current.querySelectorAll('.anime-loader-dot');

    const animation = animate(dots, {
      translateY: [-6, 6],
      scale: [0.8, 1.2],
      opacity: [0.5, 1],
      duration: 600,
      delay: stagger(120),
      loop: true,
      alternate: true,
      ease: 'inOutSine',
    });

    return () => { animation.pause(); };
  }, []);

  return (
    <div ref={ref} className={`flex items-center justify-center gap-1 ${className}`}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="anime-loader-dot block rounded-full"
          style={{
            width: size / 3,
            height: size / 3,
            backgroundColor: color,
          }}
        />
      ))}
    </div>
  );
}
