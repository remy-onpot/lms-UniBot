'use client';

export interface ExpressionProps {
  size?: number;
  className?: string;
}

/**
 * Eyes component with optional blink animation
 */
export const Eyes = ({ size = 80, className = '' }: ExpressionProps) => {
  const eyeSize = size * 0.15;
  const pupilSize = size * 0.06;
  const spacing = size * 0.3;

  return (
    <svg
      width={size}
      height={size * 0.5}
      viewBox={`0 0 ${size} ${size * 0.5}`}
      className={`${className}`}
    >
      {/* Left eye */}
      <circle cx={spacing} cy={size * 0.25} r={eyeSize} fill="white" stroke="currentColor" strokeWidth="2" />
      <circle
        cx={spacing}
        cy={size * 0.25}
        r={pupilSize}
        fill="currentColor"
        className="animate-pulse"
      />

      {/* Right eye */}
      <circle cx={size - spacing} cy={size * 0.25} r={eyeSize} fill="white" stroke="currentColor" strokeWidth="2" />
      <circle
        cx={size - spacing}
        cy={size * 0.25}
        r={pupilSize}
        fill="currentColor"
        className="animate-pulse"
      />
    </svg>
  );
};

/**
 * Mouth component with multiple expression states
 */
export const Mouth = ({ size = 80, expression = 'neutral', className = '' }: ExpressionProps & { expression?: 'happy' | 'sad' | 'neutral' | 'thinking' }) => {
  const mouthY = size * 0.6;
  const mouthWidth = size * 0.3;

  const pathConfigs: Record<string, { d: string; strokeWidth: number }> = {
    happy: {
      d: `M ${size * 0.35} ${mouthY} Q ${size * 0.5} ${mouthY + size * 0.15} ${size * 0.65} ${mouthY}`,
      strokeWidth: 2.5,
    },
    sad: {
      d: `M ${size * 0.35} ${mouthY + size * 0.1} Q ${size * 0.5} ${mouthY - size * 0.05} ${size * 0.65} ${mouthY + size * 0.1}`,
      strokeWidth: 2.5,
    },
    neutral: {
      d: `M ${size * 0.35} ${mouthY} L ${size * 0.65} ${mouthY}`,
      strokeWidth: 2,
    },
    thinking: {
      d: `M ${size * 0.5} ${mouthY - size * 0.1} A ${size * 0.1} ${size * 0.1} 0 0 0 ${size * 0.5} ${mouthY + size * 0.1}`,
      strokeWidth: 2,
    },
  };

  const config = pathConfigs[expression] || pathConfigs.neutral;

  return (
    <svg
      width={size}
      height={size * 0.4}
      viewBox={`0 0 ${size} ${size * 0.4}`}
      className={className}
    >
      <path
        d={config.d}
        stroke="currentColor"
        strokeWidth={config.strokeWidth}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

/**
 * Eyebrows component for extra expression
 */
export const Eyebrows = ({ size = 80, expression = 'neutral', className = '' }: ExpressionProps & { expression?: 'happy' | 'sad' | 'neutral' | 'thinking' }) => {
  const browY = size * 0.08;
  const browSpacing = size * 0.3;
  const browWidth = size * 0.2;

  const browConfigs: Record<string, { leftRotate: number; rightRotate: number }> = {
    happy: { leftRotate: -15, rightRotate: 15 },
    sad: { leftRotate: 15, rightRotate: -15 },
    neutral: { leftRotate: 0, rightRotate: 0 },
    thinking: { leftRotate: -20, rightRotate: -20 },
  };

  const config = browConfigs[expression] || browConfigs.neutral;

  return (
    <svg
      width={size}
      height={size * 0.25}
      viewBox={`0 0 ${size} ${size * 0.25}`}
      className={className}
    >
      {/* Left brow */}
      <line
        x1={browSpacing - browWidth / 2}
        y1={browY}
        x2={browSpacing + browWidth / 2}
        y2={browY - size * 0.05}
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        style={{
          transform: `rotate(${config.leftRotate}deg)`,
          transformOrigin: `${browSpacing}px ${browY}px`,
          transformBox: 'fill-box',
        }}
      />

      {/* Right brow */}
      <line
        x1={size - browSpacing - browWidth / 2}
        y1={browY}
        x2={size - browSpacing + browWidth / 2}
        y2={browY - size * 0.05}
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        style={{
          transform: `rotate(${config.rightRotate}deg)`,
          transformOrigin: `${size - browSpacing}px ${browY}px`,
          transformBox: 'fill-box',
        }}
      />
    </svg>
  );
};

/**
 * Blink animation keyframes injected into global CSS
 */
export const BlinkKeyframes = () => (
  <style>{`
    @keyframes blink-animation {
      0%, 90%, 100% { opacity: 1; }
      95% { opacity: 0; }
    }
    .animate-blink {
      animation: blink-animation 4s infinite;
    }
  `}</style>
);
