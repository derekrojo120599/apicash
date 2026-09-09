'use client';

import { useEffect, useRef, useState } from 'react';
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
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const animatedObject = { value: 0 };

    const animation = animate(animatedObject, {
      value,
      duration,
      delay,
      ease: 'outExpo',
      modifier: (v: number) => Math.round(v * 100) / 100,
      onUpdate: () => {
        setDisplayValue(animatedObject.value);
      },
    });

    return () => { animation.pause(); };
  }, [value, duration, delay]);

  return (
    <span ref={ref} className={className}>
      {formatter(displayValue)}
    </span>
  );
}
