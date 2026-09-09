'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { animate } from 'animejs';

interface AnimatedNavLinkProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  onClick?: () => void;
  className?: string;
}

export function AnimatedNavLink({
  href,
  icon,
  label,
  isActive = false,
  onClick,
  className = '',
}: AnimatedNavLinkProps) {
  const ref = useRef<HTMLAnchorElement>(null);

  const handleMouseEnter = () => {
    if (!ref.current || isActive) return;
    animate(ref.current, {
      translateX: 4,
      duration: 200,
      ease: 'outQuad',
    });
  };

  const handleMouseLeave = () => {
    if (!ref.current || isActive) return;
    animate(ref.current, {
      translateX: 0,
      duration: 200,
      ease: 'outQuad',
    });
  };

  const handleClick = () => {
    if (!ref.current) return;
    animate(ref.current, {
      scale: [1, 0.98, 1],
      duration: 200,
      ease: 'outBack(1.7)',
    });
    onClick?.();
  };

  return (
    <Link
      ref={ref}
      href={href}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={className}
    >
      {icon}
      {label}
    </Link>
  );
}
