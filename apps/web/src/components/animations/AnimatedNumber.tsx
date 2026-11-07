'use client';

import { useEffect, useRef } from 'react';
import { animate } from 'animejs';

interface AnimatedNumberProps {
  value: number;
  formatter?: (value: number) => string;
  duration?: number;
  delay?: number;
  className?: string;
}

export function AnimatedNumber({
  value,
  formatter = (v) => v.toString(),
  duration = 1200,
  delay = 0,
  className = '',
}: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const formatterRef = useRef(formatter);
  formatterRef.current = formatter;

  useEffect(() => {
    if (!ref.current) return;
    const animatedObject = { value: 0 };

    const animation = animate(animatedObject, {
      value,
      duration,
      delay,
      ease: 'outExpo',
      modifier: (v: number) => Math.round(v * 100) / 100,
      onUpdate: () => {
        if (ref.current) {
          ref.current.textContent = formatterRef.current(animatedObject.value);
        }
      },
    });

    return () => {
      animation.pause();
    };
  }, [value, duration, delay]);

  return (
    <span ref={ref} className={className}>
      {formatter(value)}
    </span>
  );
}
