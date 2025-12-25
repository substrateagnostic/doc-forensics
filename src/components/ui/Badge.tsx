'use client';

import { ReactNode } from 'react';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'risk-low' | 'risk-medium' | 'risk-high' | 'risk-critical';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
  pulse?: boolean;
  className?: string;
}

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  pulse = false,
  className = '',
}: BadgeProps) {
  const baseStyles = 'inline-flex items-center gap-1.5 font-medium rounded-full border';

  const variants: Record<BadgeVariant, string> = {
    default: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
    success: 'bg-green-500/20 text-green-400 border-green-500/30',
    warning: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    danger: 'bg-red-500/20 text-red-400 border-red-500/30',
    info: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    'risk-low': 'bg-green-500/20 text-green-400 border-green-500/30',
    'risk-medium': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    'risk-high': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    'risk-critical': 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  const dotColors: Record<BadgeVariant, string> = {
    default: 'bg-gray-400',
    success: 'bg-green-400',
    warning: 'bg-yellow-400',
    danger: 'bg-red-400',
    info: 'bg-blue-400',
    'risk-low': 'bg-green-400',
    'risk-medium': 'bg-yellow-400',
    'risk-high': 'bg-orange-400',
    'risk-critical': 'bg-red-400',
  };

  const sizes = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  return (
    <span className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}>
      {dot && (
        <span className="relative flex h-2 w-2">
          {pulse && (
            <span
              className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${dotColors[variant]}`}
            />
          )}
          <span className={`relative inline-flex rounded-full h-2 w-2 ${dotColors[variant]}`} />
        </span>
      )}
      {children}
    </span>
  );
}

interface SeverityBadgeProps {
  severity: 'info' | 'warning' | 'suspicious' | 'critical';
  showIcon?: boolean;
  className?: string;
}

export function SeverityBadge({ severity, showIcon = true, className = '' }: SeverityBadgeProps) {
  const config = {
    info: { label: 'Info', variant: 'info' as BadgeVariant, icon: 'i' },
    warning: { label: 'Warning', variant: 'warning' as BadgeVariant, icon: '!' },
    suspicious: { label: 'Suspicious', variant: 'danger' as BadgeVariant, icon: '?' },
    critical: { label: 'Critical', variant: 'danger' as BadgeVariant, icon: '!!' },
  };

  const c = config[severity];

  return (
    <Badge variant={c.variant} size="sm" className={className}>
      {showIcon && <span className="font-mono text-xs">{c.icon}</span>}
      {c.label}
    </Badge>
  );
}

interface RiskBadgeProps {
  risk: 'low' | 'medium' | 'high' | 'critical';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function RiskBadge({ risk, size = 'md', showLabel = true, className = '' }: RiskBadgeProps) {
  const config = {
    low: { label: 'LOW RISK', variant: 'risk-low' as BadgeVariant },
    medium: { label: 'MEDIUM', variant: 'risk-medium' as BadgeVariant },
    high: { label: 'HIGH RISK', variant: 'risk-high' as BadgeVariant },
    critical: { label: 'CRITICAL', variant: 'risk-critical' as BadgeVariant },
  };

  const c = config[risk];

  return (
    <Badge variant={c.variant} size={size} dot pulse={risk === 'critical'} className={className}>
      {showLabel ? c.label : risk.toUpperCase()}
    </Badge>
  );
}
