'use client';

interface ProgressBarProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'gradient' | 'striped';
  showLabel?: boolean;
  label?: string;
  className?: string;
}

export function ProgressBar({
  value,
  max = 100,
  size = 'md',
  variant = 'default',
  showLabel = false,
  label,
  className = '',
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  const sizes = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  const variants = {
    default: 'bg-forensic-highlight',
    gradient: 'bg-gradient-to-r from-forensic-highlight via-pink-500 to-purple-500',
    striped: `bg-forensic-highlight bg-[length:1rem_1rem] bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)] animate-[progress-stripes_1s_linear_infinite]`,
  };

  return (
    <div className={className}>
      {(showLabel || label) && (
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">{label || 'Progress'}</span>
          <span className="text-sm font-mono text-forensic-highlight">{Math.round(percentage)}%</span>
        </div>
      )}
      <div className={`w-full bg-forensic-dark rounded-full overflow-hidden ${sizes[size]}`}>
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${variants[variant]}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

interface CircularProgressProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  showValue?: boolean;
  label?: string;
  color?: string;
  className?: string;
}

export function CircularProgress({
  value,
  max = 100,
  size = 120,
  strokeWidth = 8,
  showValue = true,
  label,
  color,
  className = '',
}: CircularProgressProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const getColor = () => {
    if (color) return color;
    if (percentage < 25) return '#00d26a';
    if (percentage < 50) return '#ffc107';
    if (percentage < 75) return '#ff9800';
    return '#e94560';
  };

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-forensic-dark"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={getColor()}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-700 ease-out"
          style={{
            filter: `drop-shadow(0 0 6px ${getColor()}40)`,
          }}
        />
      </svg>
      {showValue && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-white">{Math.round(value)}</span>
          {label && <span className="text-xs text-gray-400">{label}</span>}
        </div>
      )}
    </div>
  );
}

interface StepProgressProps {
  steps: string[];
  currentStep: number;
  className?: string;
}

export function StepProgress({ steps, currentStep, className = '' }: StepProgressProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      {steps.map((step, index) => {
        const isComplete = index < currentStep;
        const isCurrent = index === currentStep;
        const isPending = index > currentStep;

        return (
          <div key={step} className="flex items-center gap-3">
            <div
              className={`
                flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium
                transition-all duration-300
                ${isComplete ? 'bg-green-500 text-white' : ''}
                ${isCurrent ? 'bg-forensic-highlight text-white ring-4 ring-forensic-highlight/30 animate-pulse' : ''}
                ${isPending ? 'bg-forensic-dark text-gray-500 border border-gray-600' : ''}
              `}
            >
              {isComplete ? (
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                index + 1
              )}
            </div>
            <span
              className={`
                text-sm transition-colors duration-300
                ${isComplete ? 'text-green-400' : ''}
                ${isCurrent ? 'text-white font-medium' : ''}
                ${isPending ? 'text-gray-500' : ''}
              `}
            >
              {step}
            </span>
          </div>
        );
      })}
    </div>
  );
}
