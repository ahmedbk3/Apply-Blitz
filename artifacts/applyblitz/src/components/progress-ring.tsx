import { useEffect, useState } from "react";

interface ProgressRingProps {
  progress: number;
  target: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  animate?: boolean;
}

export function ProgressRing({
  progress,
  target,
  size = 120,
  strokeWidth = 10,
  color = "hsl(var(--primary))",
  animate = true,
}: ProgressRingProps) {
  const [currentProgress, setCurrentProgress] = useState(0);
  
  useEffect(() => {
    if (animate) {
      setCurrentProgress(progress);
    } else {
      setCurrentProgress(progress);
    }
  }, [progress, animate]);

  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const safeProgress = Math.min(Math.max(currentProgress, 0), target);
  const percent = target > 0 ? safeProgress / target : 0;
  const offset = circumference - percent * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="none"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-xl font-bold font-mono text-foreground">{safeProgress}</span>
        <span className="text-xs text-muted-foreground font-mono">/ {target}</span>
      </div>
    </div>
  );
}
