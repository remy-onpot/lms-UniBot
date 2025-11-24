import React from 'react';

interface ProgressRingProps {
  radius: number;
  stroke: number;
  progress: number; // 0 to 100
  color: string;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({ radius, stroke, progress, color }) => {
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <svg
      height={radius * 2}
      width={radius * 2}
      className="transform -rotate-90"
    >
      {/* Background ring (Gray Circle) */}
      <circle
        stroke="currentColor"
        fill="transparent"
        strokeWidth={stroke}
        strokeDasharray={circumference + ' ' + circumference}
        style={{ strokeDashoffset: 0 }}
        r={normalizedRadius}
        cx={radius}
        cy={radius}
        className="text-gray-200"
      />
      
      {/* Foreground ring (Colored Progress) */}
      <circle
        stroke={color}
        fill="transparent"
        strokeWidth={stroke}
        strokeDasharray={circumference + ' ' + circumference}
        style={{ strokeDashoffset }}
        r={normalizedRadius}
        cx={radius}
        cy={radius}
        className="transition-all duration-1000 ease-in-out"
      />
      
      {/* Percentage Text in the middle */}
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={radius / 3}
        className="font-extrabold text-gray-800 transition-colors rotate-90" 
        // Note: rotate-90 compensates for the svg rotation
      >
        {progress}%
      </text>
    </svg>
  );
};