'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser, useClerk } from '@clerk/nextjs';

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/library', label: 'Library' },
  { href: '/settings', label: 'Settings' },
];

export default function AppHeader() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { signOut } = useClerk();
  const pathname = usePathname();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const userName = user?.fullName || user?.primaryEmailAddress?.emailAddress || 'User';
  const userEmail = user?.primaryEmailAddress?.emailAddress || '';

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <header className="border-b border-line px-4 sm:px-6 py-3 flex items-center justify-between bg-bg/95 backdrop-blur-sm sticky top-0 z-50">
      {/* Logo */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard"
          className="font-heading text-lg sm:text-xl tracking-[-0.5px] uppercase text-ink hover:text-accent transition-colors"
        >
          RELIEF<span className="text-accent">·</span>FORGE
        </Link>

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`font-mono text-xs px-3 py-1.5 rounded transition-colors ${
                isActive(link.href)
                  ? 'text-accent bg-accent/10'
                  : 'text-dim hover:text-ink hover:bg-panel'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* User menu */}
        {isLoaded && isSignedIn && (
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-panel transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center">
                <span className="text-xs font-bold text-accent">
                  {(userName || 'U').charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="hidden sm:inline font-mono text-xs text-dim max-w-[100px] truncate">
                {userName}
              </span>
              <svg
                className="w-3 h-3 text-dim"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown */}
            {showUserMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowUserMenu(false)}
                />
                <div className="absolute right-0 top-full mt-1 w-56 bg-panel border border-line rounded-lg shadow-xl z-50 py-1">
                  {/* User info */}
                  <div className="px-4 py-3 border-b border-line">
                    {user?.fullName && (
                      <p className="font-sans text-sm text-ink font-medium truncate">
                        {user.fullName}
                      </p>
                    )}
                    <p className="font-mono text-xs text-dim truncate">
                      {userEmail}
                    </p>
                  </div>

                  {/* Menu items */}
                  <Link
                    href="/settings"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-ink hover:bg-panel2 transition-colors"
                  >
                    Settings
                  </Link>
                  <Link
                    href="/settings/billing"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-ink hover:bg-panel2 transition-colors"
                  >
                    Billing
                  </Link>

                  <div className="border-t border-line my-1" />

                  <button
                    onClick={() => { signOut(); window.location.href = '/login'; }}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-dim hover:text-red-400 hover:bg-panel2 w-full transition-colors"
                  >
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Mobile hamburger */}
        <button
          onClick={() => setShowMobileMenu(!showMobileMenu)}
          className="sm:hidden p-1.5 rounded hover:bg-panel text-dim hover:text-ink transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {showMobileMenu ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu dropdown */}
      {showMobileMenu && (
        <div className="absolute top-full left-0 right-0 bg-panel border-b border-line sm:hidden z-40">
          <nav className="flex flex-col py-2">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setShowMobileMenu(false)}
                className={`font-mono text-sm px-6 py-3 transition-colors ${
                  isActive(link.href)
                    ? 'text-accent bg-accent/5'
                    : 'text-dim hover:text-ink hover:bg-panel2'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
