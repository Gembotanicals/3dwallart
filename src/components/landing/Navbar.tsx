"use client";

import { useState } from "react";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-line bg-bg/90 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <a href="#" className="flex items-center gap-1 font-heading text-xl tracking-tight">
            RELIEF<span className="text-accent">·</span>FORGE
          </a>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-dim text-sm font-mono uppercase tracking-wider hover:text-ink transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="text-dim text-sm font-mono uppercase tracking-wider hover:text-ink transition-colors">
              How It Works
            </a>
            <a href="#pricing" className="text-dim text-sm font-mono uppercase tracking-wider hover:text-ink transition-colors">
              Pricing
            </a>
          </div>

          {/* Desktop buttons */}
          <div className="hidden md:flex items-center gap-3">
            <button className="px-4 py-2 text-sm font-mono uppercase tracking-wider text-dim border border-line rounded-sm hover:border-ink hover:text-ink transition-colors">
              Sign In
            </button>
            <button className="px-4 py-2 text-sm font-mono uppercase tracking-wider text-white bg-accent rounded-sm hover:bg-accent/90 transition-colors">
              Get Started Free
            </button>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden text-dim hover:text-ink"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-line py-4 space-y-3">
            <a href="#features" className="block text-dim text-sm font-mono uppercase tracking-wider hover:text-ink transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="block text-dim text-sm font-mono uppercase tracking-wider hover:text-ink transition-colors">
              How It Works
            </a>
            <a href="#pricing" className="block text-dim text-sm font-mono uppercase tracking-wider hover:text-ink transition-colors">
              Pricing
            </a>
            <div className="pt-3 space-y-2">
              <button className="w-full px-4 py-2 text-sm font-mono uppercase tracking-wider text-dim border border-line rounded-sm hover:border-ink hover:text-ink transition-colors">
                Sign In
              </button>
              <button className="w-full px-4 py-2 text-sm font-mono uppercase tracking-wider text-white bg-accent rounded-sm hover:bg-accent/90 transition-colors">
                Get Started Free
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
