'use client';

import { useEffect, useRef, useState } from 'react';
import { animate } from 'animejs';
import { ApicashLogo } from './ApicashLogo';

export function SplashScreen() {
  const [show, setShow] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check if splash has already been shown in this browser session
    const hasShown = sessionStorage.getItem('apicash_splash_shown');
    if (hasShown) {
      setShow(false);
      return;
    }

    // Entrance animation timeline
    const logoAnim = animate(logoRef.current!, {
      scale: [0.75, 1],
      opacity: [0, 1],
      duration: 650,
      ease: 'outExpo',
    });

    const ringAnim = animate(ringRef.current!, {
      scale: [0.6, 1.25],
      opacity: [0, 0.45, 0.1],
      duration: 900,
      ease: 'outQuad',
    });

    const textAnim = animate(textRef.current!, {
      translateY: [16, 0],
      opacity: [0, 1],
      duration: 550,
      delay: 150,
      ease: 'outCubic',
    });

    const progressAnim = animate(progressRef.current!, {
      width: ['0%', '100%'],
      duration: 950,
      ease: 'inOutQuad',
    });

    // Exit animation after splash completes
    const timer = setTimeout(() => {
      if (containerRef.current) {
        animate(containerRef.current, {
          opacity: [1, 0],
          scale: [1, 1.03],
          duration: 400,
          ease: 'inOutCubic',
          onComplete: () => {
            sessionStorage.setItem('apicash_splash_shown', 'true');
            setShow(false);
          },
        });
      } else {
        sessionStorage.setItem('apicash_splash_shown', 'true');
        setShow(false);
      }
    }, 1100);

    return () => {
      clearTimeout(timer);
      logoAnim?.pause();
      ringAnim?.pause();
      textAnim?.pause();
      progressAnim?.pause();
    };
  }, []);

  if (!show) return null;

  return (
    <div
      id="apicash-splash"
      ref={containerRef}
      className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-slate-950 text-white select-none overflow-hidden"
    >
      {/* Ambient background glows */}
      <div className="absolute w-96 h-96 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none -top-12 -left-12 animate-pulse" />
      <div className="absolute w-96 h-96 rounded-full bg-emerald-600/20 blur-3xl pointer-events-none -bottom-12 -right-12" />

      {/* Main logo with glowing halo */}
      <div className="relative flex items-center justify-center mb-8">
        {/* Glowing expanding pulse ring */}
        <div
          ref={ringRef}
          className="opacity-0 scale-60 absolute w-44 h-44 rounded-3xl border border-emerald-400/40 bg-emerald-500/10 shadow-[0_0_50px_rgba(16,185,129,0.3)] pointer-events-none"
        />

        {/* Logo Card */}
        <div
          ref={logoRef}
          className="opacity-0 scale-75 relative w-28 h-28 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-950 border border-emerald-500/30 shadow-[0_10px_35px_rgba(0,0,0,0.6)] flex items-center justify-center p-5 backdrop-blur-md"
        >
          <ApicashLogo className="w-full h-full text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.5)]" />
        </div>
      </div>

      {/* Brand title and slogan */}
      <div ref={textRef} className="opacity-0 translate-y-4 text-center space-y-2 z-10 px-4">
        <h1 className="text-3xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-200 to-emerald-400 uppercase">
          Apicash
        </h1>
        <p className="text-xs font-medium tracking-wider text-slate-400 uppercase">
          Tus finanzas en USD & VES
        </p>
      </div>

      {/* Sleek bottom progress bar */}
      <div className="absolute bottom-12 w-40 h-1 bg-slate-800/80 rounded-full overflow-hidden">
        <div
          ref={progressRef}
          style={{ width: '0%' }}
          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.7)]"
        />
      </div>
    </div>
  );
}
