import React from 'react';

export type ArdillaMood = 'saving' | 'searching' | 'zen' | 'goals';

interface ArdillaMascotProps {
  mood?: ArdillaMood;
  size?: number;
  className?: string;
}

export function ArdillaMascot({ mood = 'saving', size = 80, className = '' }: ArdillaMascotProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* COLA ESPONJOSA */}
      <path
        d="M 68 76 C 88 74, 98 48, 88 32 C 78 16, 60 12, 54 22 C 50 28, 54 36, 62 36 C 72 36, 80 44, 76 58 C 72 70, 64 74, 58 76 Z"
        fill="#b45309"
      />
      <path
        d="M 66 70 C 80 66, 86 46, 80 34 C 74 24, 64 22, 60 28 C 58 32, 62 36, 68 38 C 74 40, 76 52, 70 62 Z"
        fill="#d97706"
      />

      {/* CUERPO PRINCIPAL */}
      <ellipse cx="44" cy="62" rx="18" ry="20" fill="#d97706" />
      {/* PECHO / PANCITA */}
      <ellipse cx="40" cy="64" rx="11" ry="14" fill="#fef3c7" />

      {/* PATITAS TRASERAS */}
      <ellipse cx="30" cy="78" rx="8" ry="5" fill="#b45309" />
      <ellipse cx="52" cy="78" rx="8" ry="5" fill="#b45309" />

      {/* CABEZA */}
      <circle cx="42" cy="38" r="15" fill="#d97706" />
      <ellipse cx="38" cy="42" rx="8" ry="6" fill="#fef3c7" />

      {/* OREJAS */}
      <path d="M 32 30 C 30 18, 38 18, 40 26 Z" fill="#b45309" />
      <path d="M 34 28 C 33 22, 37 22, 38 27 Z" fill="#fef3c7" />
      <path d="M 46 28 C 48 16, 56 16, 54 24 Z" fill="#b45309" />
      <path d="M 48 26 C 49 20, 53 20, 52 25 Z" fill="#fef3c7" />

      {/* OJOS */}
      {mood === 'zen' ? (
        <g>
          <path d="M 34 38 Q 37 42 40 38" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
          <path d="M 44 38 Q 47 42 50 38" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
        </g>
      ) : (
        <g>
          <circle cx="37" cy="37" r="3" fill="#1e293b" />
          <circle cx="36" cy="36" r="1" fill="#ffffff" />
          <circle cx="47" cy="37" r="3" fill="#1e293b" />
          <circle cx="46" cy="36" r="1" fill="#ffffff" />
        </g>
      )}

      {/* NARIZ Y MEJILLAS */}
      <ellipse cx="41" cy="42" rx="2" ry="1.5" fill="#1e293b" />
      <circle cx="33" cy="42" r="2.5" fill="#fca5a5" opacity="0.6" />
      <circle cx="49" cy="42" r="2.5" fill="#fca5a5" opacity="0.6" />
      <path d="M 39 44 Q 41 47 43 44" stroke="#1e293b" strokeWidth="1.2" strokeLinecap="round" />

      {/* ACCESORIO SEGÚN MOOD */}
      {mood === 'saving' && (
        <g>
          <path d="M 34 56 C 34 52, 48 52, 48 56 Z" fill="#78350f" />
          <rect x="40" y="50" width="2" height="4" rx="1" fill="#78350f" />
          <path d="M 41 52 Q 47 50 45 46 Q 39 48 41 52 Z" fill="#10b981" />
          <path d="M 34 56 C 34 68, 48 68, 48 56 Z" fill="#f59e0b" />
          <circle cx="38" cy="59" r="1.5" fill="#fef08a" />
          <circle cx="32" cy="58" r="3.5" fill="#b45309" />
          <circle cx="49" cy="58" r="3.5" fill="#b45309" />
        </g>
      )}

      {mood === 'searching' && (
        <g>
          <circle cx="33" cy="56" r="3" fill="#b45309" />
          <circle cx="48" cy="58" r="3" fill="#b45309" />
          <path d="M 50 62 L 58 72" stroke="#78350f" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="47" cy="58" r="7" stroke="#10b981" strokeWidth="2" />
          <circle cx="47" cy="58" r="5" fill="#10b981" opacity="0.2" />
        </g>
      )}

      {mood === 'zen' && (
        <g>
          <circle cx="36" cy="58" r="3.5" fill="#b45309" />
          <circle cx="46" cy="58" r="3.5" fill="#b45309" />
          <circle cx="41" cy="52" r="2.5" fill="#10b981" />
        </g>
      )}

      {mood === 'goals' && (
        <g>
          <path d="M 48 40 L 48 76" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
          <path d="M 49 42 L 64 48 L 49 54 Z" fill="#10b981" />
          <circle cx="34" cy="62" r="3" fill="#b45309" />
          <circle cx="47" cy="60" r="3.5" fill="#b45309" />
        </g>
      )}
    </svg>
  );
}
