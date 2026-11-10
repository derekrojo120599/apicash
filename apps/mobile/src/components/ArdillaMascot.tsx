import React from 'react';
import Svg, { Path, Circle, Ellipse, G, Rect } from 'react-native-svg';

export type ArdillaMood = 'saving' | 'searching' | 'zen' | 'goals';

interface ArdillaMascotProps {
  mood?: ArdillaMood;
  size?: number;
}

/**
 * Mascota Oficial de Apicash: "Cashy" la Ardilla Financiera.
 * Simboliza previsión, ahorro constante y recolección inteligente de recursos.
 */
export function ArdillaMascot({ mood = 'saving', size = 80 }: ArdillaMascotProps) {
  const scale = size / 100;

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {/* COLA ESPONJOSA DE LA ARDILLA */}
      <Path
        d="M 68 76 C 88 74, 98 48, 88 32 C 78 16, 60 12, 54 22 C 50 28, 54 36, 62 36 C 72 36, 80 44, 76 58 C 72 70, 64 74, 58 76 Z"
        fill="#b45309"
      />
      <Path
        d="M 66 70 C 80 66, 86 46, 80 34 C 74 24, 64 22, 60 28 C 58 32, 62 36, 68 38 C 74 40, 76 52, 70 62 Z"
        fill="#d97706"
      />

      {/* CUERPO PRINCIPAL */}
      <Ellipse cx="44" cy="62" rx="18" ry="20" fill="#d97706" />
      {/* PECHO / PANCITA SUAVE */}
      <Ellipse cx="40" cy="64" rx="11" ry="14" fill="#fef3c7" />

      {/* PATITAS TRASERAS */}
      <Ellipse cx="30" cy="78" rx="8" ry="5" fill="#b45309" />
      <Ellipse cx="52" cy="78" rx="8" ry="5" fill="#b45309" />

      {/* CABEZA */}
      <Circle cx="42" cy="38" r="15" fill="#d97706" />
      <Ellipse cx="38" cy="42" rx="8" ry="6" fill="#fef3c7" />

      {/* OREJAS */}
      <Path d="M 32 30 C 30 18, 38 18, 40 26 Z" fill="#b45309" />
      <Path d="M 34 28 C 33 22, 37 22, 38 27 Z" fill="#fef3c7" />

      <Path d="M 46 28 C 48 16, 56 16, 54 24 Z" fill="#b45309" />
      <Path d="M 48 26 C 49 20, 53 20, 52 25 Z" fill="#fef3c7" />

      {/* OJOS */}
      {mood === 'zen' ? (
        // Ojos cerrados sonrientes
        <G>
          <Path d="M 34 38 Q 37 42 40 38" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" fill="none" />
          <Path d="M 44 38 Q 47 42 50 38" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" fill="none" />
        </G>
      ) : (
        // Ojos abiertos tiernos con brillo
        <G>
          <Circle cx="37" cy="37" r="3" fill="#1e293b" />
          <Circle cx="36" cy="36" r="1" fill="#ffffff" />

          <Circle cx="47" cy="37" r="3" fill="#1e293b" />
          <Circle cx="46" cy="36" r="1" fill="#ffffff" />
        </G>
      )}

      {/* NARICITA Y MEJILLAS */}
      <Ellipse cx="41" cy="42" rx="2" ry="1.5" fill="#1e293b" />
      <Circle cx="33" cy="42" r="2.5" fill="#fca5a5" opacity={0.6} />
      <Circle cx="49" cy="42" r="2.5" fill="#fca5a5" opacity={0.6} />

      {/* HOCICO / SONRISA */}
      <Path d="M 39 44 Q 41 47 43 44" stroke="#1e293b" strokeWidth="1.2" strokeLinecap="round" fill="none" />

      {/* =================================================================== */}
      {/* MANOS Y OBJETO SEGÚN EL MOOD                                        */}
      {/* =================================================================== */}
      {mood === 'saving' && (
        // Ardilla abrazando una bellota dorada con hoja esmeralda de Apicash
        <G>
          {/* Cúpula de la bellota */}
          <Path d="M 34 56 C 34 52, 48 52, 48 56 Z" fill="#78350f" />
          <Rect x="40" y="50" width="2" height="4" rx="1" fill="#78350f" />
          {/* Hoja verde esmeralda Apicash */}
          <Path d="M 41 52 Q 47 50 45 46 Q 39 48 41 52 Z" fill="#10b981" />
          {/* Cuerpo dorado de la bellota */}
          <Path d="M 34 56 C 34 68, 48 68, 48 56 Z" fill="#f59e0b" />
          {/* Brillo en la bellota */}
          <Circle cx="38" cy="59" r="1.5" fill="#fef08a" />
          {/* Patitas delanteras abrazando */}
          <Circle cx="32" cy="58" r="3.5" fill="#b45309" />
          <Circle cx="49" cy="58" r="3.5" fill="#b45309" />
        </G>
      )}

      {mood === 'searching' && (
        // Ardilla sosteniendo una lupa esmeralda buscando bellotas
        <G>
          <Circle cx="33" cy="56" r="3" fill="#b45309" />
          <Circle cx="48" cy="58" r="3" fill="#b45309" />
          {/* Mango de lupa */}
          <Path d="M 50 62 L 58 72" stroke="#78350f" strokeWidth="2.5" strokeLinecap="round" />
          {/* Aro de lupa esmeralda */}
          <Circle cx="47" cy="58" r="7" stroke="#10b981" strokeWidth="2" fill="none" />
          <Circle cx="47" cy="58" r="5" fill="#10b981" opacity={0.2} />
        </G>
      )}

      {mood === 'zen' && (
        // Ardilla meditando con patitas juntas
        <G>
          <Circle cx="36" cy="58" r="3.5" fill="#b45309" />
          <Circle cx="46" cy="58" r="3.5" fill="#b45309" />
          <Circle cx="41" cy="52" r="2.5" fill="#10b981" />
        </G>
      )}

      {mood === 'goals' && (
        // Ardilla con bandera de meta esmeralda
        <G>
          <Path d="M 48 40 L 48 76" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
          <Path d="M 49 42 L 64 48 L 49 54 Z" fill="#10b981" />
          <Circle cx="34" cy="62" r="3" fill="#b45309" />
          <Circle cx="47" cy="60" r="3.5" fill="#b45309" />
        </G>
      )}
    </Svg>
  );
}
