'use client';

import { useMemo } from 'react';

interface DonutChartProps {
  data: { label: string; value: number; color: string }[];
  size?: number;
  thickness?: number;
  showLegend?: boolean;
  className?: string;
}

export function DonutChart({
  data,
  size = 160,
  thickness = 24,
  showLegend = true,
  className = '',
}: DonutChartProps) {
  const total = useMemo(() => data.reduce((sum, item) => sum + item.value, 0), [data]);

  const segments = useMemo(() => {
    let currentAngle = 0;
    return data.map((item) => {
      const percentage = total > 0 ? (item.value / total) * 100 : 0;
      const angle = (percentage / 100) * 360;
      const startAngle = currentAngle;
      currentAngle += angle;
      return { ...item, percentage, startAngle, angle };
    });
  }, [data, total]);

  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className={`flex items-center gap-6 ${className}`}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {segments.map((segment, index) => {
            const strokeDasharray = (segment.angle / 360) * circumference;
            const strokeDashoffset = -((segment.startAngle / 360) * circumference);

            return (
              <circle
                key={segment.label}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={segment.color}
                strokeWidth={thickness}
                strokeDasharray={`${strokeDasharray} ${circumference}`}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-500"
                style={{
                  filter: `drop-shadow(0 0 4px ${segment.color}40)`,
                }}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-white">{total}</span>
          <span className="text-xs text-gray-400">Total</span>
        </div>
      </div>

      {showLegend && (
        <div className="space-y-2">
          {segments.map((segment) => (
            <div key={segment.label} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: segment.color }}
              />
              <span className="text-sm text-gray-300">{segment.label}</span>
              <span className="text-sm font-medium text-white ml-auto">{segment.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface BarChartProps {
  data: { label: string; value: number; color?: string }[];
  maxValue?: number;
  orientation?: 'horizontal' | 'vertical';
  showValues?: boolean;
  className?: string;
}

export function BarChart({
  data,
  maxValue,
  orientation = 'horizontal',
  showValues = true,
  className = '',
}: BarChartProps) {
  const max = maxValue || Math.max(...data.map((d) => d.value));

  if (orientation === 'vertical') {
    return (
      <div className={`flex items-end justify-around gap-2 h-40 ${className}`}>
        {data.map((item) => {
          const height = max > 0 ? (item.value / max) * 100 : 0;
          return (
            <div key={item.label} className="flex flex-col items-center gap-2 flex-1">
              <div className="relative w-full h-full flex items-end justify-center">
                <div
                  className="w-8 rounded-t-lg transition-all duration-500"
                  style={{
                    height: `${height}%`,
                    backgroundColor: item.color || '#e94560',
                    boxShadow: `0 0 10px ${item.color || '#e94560'}40`,
                  }}
                />
                {showValues && (
                  <span className="absolute bottom-full mb-1 text-xs font-medium text-white">
                    {item.value}
                  </span>
                )}
              </div>
              <span className="text-xs text-gray-400 truncate max-w-full">{item.label}</span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {data.map((item) => {
        const width = max > 0 ? (item.value / max) * 100 : 0;
        return (
          <div key={item.label}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-300">{item.label}</span>
              {showValues && <span className="text-sm font-medium text-white">{item.value}</span>}
            </div>
            <div className="h-2 bg-forensic-dark rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${width}%`,
                  backgroundColor: item.color || '#e94560',
                  boxShadow: `0 0 8px ${item.color || '#e94560'}40`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  change?: number;
  icon?: React.ReactNode;
  color?: string;
  className?: string;
}

export function StatCard({ label, value, change, icon, color = '#e94560', className = '' }: StatCardProps) {
  return (
    <div
      className={`bg-forensic-mid/50 border border-gray-700/50 rounded-xl p-4 ${className}`}
      style={{ borderLeftColor: color, borderLeftWidth: 3 }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-400 mb-1">{label}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
          {change !== undefined && (
            <p className={`text-xs mt-1 ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {change >= 0 ? '+' : ''}{change}% from last period
            </p>
          )}
        </div>
        {icon && (
          <div
            className="p-2 rounded-lg"
            style={{ backgroundColor: `${color}20` }}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
