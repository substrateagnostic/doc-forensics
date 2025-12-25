'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from './Logo';
import { Button } from './Button';

interface NavItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
}

const navItems: NavItem[] = [
  { label: 'Analyze', href: '/' },
  { label: 'Compare', href: '/compare' },
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'History', href: '/history' },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-gray-800/50 bg-forensic-dark/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex-shrink-0">
              <Logo size="md" />
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href ||
                  (item.href !== '/' && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`
                      px-4 py-2 rounded-lg text-sm font-medium transition-all
                      ${isActive
                        ? 'text-white bg-forensic-highlight/20 border border-forensic-highlight/30'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }
                    `}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/30">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
              </span>
              <span className="text-xs text-green-400 font-medium">All Systems Online</span>
            </div>

            <Link href="/settings">
              <Button variant="ghost" size="sm" className="hidden sm:flex">
                Settings
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile nav */}
      <nav className="md:hidden border-t border-gray-800/50 px-4 py-2 flex gap-2 overflow-x-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-all
                ${isActive
                  ? 'text-white bg-forensic-highlight/20'
                  : 'text-gray-400'
                }
              `}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
