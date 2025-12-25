'use client';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export function Logo({ size = 'md', showText = true, className = '' }: LogoProps) {
  const sizes = {
    sm: { icon: 'w-6 h-6', text: 'text-lg' },
    md: { icon: 'w-8 h-8', text: 'text-xl' },
    lg: { icon: 'w-12 h-12', text: 'text-3xl' },
  };

  const s = sizes[size];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`${s.icon} relative`}>
        <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          {/* Shield shape */}
          <path
            d="M20 2L4 10V18C4 28.5 11 37 20 40C29 37 36 28.5 36 18V10L20 2Z"
            className="fill-forensic-highlight/20 stroke-forensic-highlight"
            strokeWidth="2"
          />
          {/* Fingerprint lines */}
          <path
            d="M20 12C15.5 12 12 15.5 12 20C12 24.5 15.5 28 20 28"
            className="stroke-forensic-highlight"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M20 15C17.2 15 15 17.2 15 20C15 22.8 17.2 25 20 25"
            className="stroke-forensic-highlight"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M20 18C18.9 18 18 18.9 18 20C18 21.1 18.9 22 20 22"
            className="stroke-forensic-highlight"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
          />
          {/* Magnifying glass */}
          <circle cx="26" cy="26" r="5" className="stroke-white/60" strokeWidth="1.5" fill="none" />
          <line x1="29.5" y1="29.5" x2="33" y2="33" className="stroke-white/60" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
      {showText && (
        <span className={`font-bold ${s.text}`}>
          <span className="text-white">Doc</span>
          <span className="text-forensic-highlight">Forensics</span>
        </span>
      )}
    </div>
  );
}
