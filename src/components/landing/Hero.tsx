export default function Hero() {
  return (
    <section className="relative pt-32 pb-20 md:pt-44 md:pb-32 overflow-hidden">
      {/* Decorative 3D panel element */}
      <div className="absolute right-[-80px] top-24 md:right-8 md:top-32 lg:right-16 hidden md:block opacity-60">
        <div className="relative w-64 h-64 lg:w-80 lg:h-80">
          {/* Grid overlay */}
          <div className="absolute inset-0 rounded-sm border border-line"
            style={{
              backgroundImage: `linear-gradient(rgba(44,53,59,0.6) 1px, transparent 1px),
                               linear-gradient(90deg, rgba(44,53,59,0.6) 1px, transparent 1px)`,
              backgroundSize: '26px 26px',
            }}
          />
          {/* Gradient fill suggesting depth */}
          <div className="absolute inset-2 rounded-sm bg-gradient-to-br from-panel2 via-panel to-accent/10 border border-line/50" />
          {/* Highlight edge */}
          <div className="absolute top-2 left-2 right-8 h-px bg-gradient-to-r from-accent2/40 to-transparent" />
          <div className="absolute top-2 left-2 bottom-8 w-px bg-gradient-to-b from-accent2/40 to-transparent" />
          {/* Inner shape suggesting relief */}
          <div className="absolute inset-8 bg-gradient-to-tr from-accent/5 via-panel2 to-accent2/5 border border-line/30 rounded-sm" />
          <div className="absolute inset-12 bg-gradient-to-bl from-panel via-panel2 to-accent/10 border border-line/20 rounded-sm" />
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-3xl">
          {/* Mono label */}
          <p className="text-xs font-mono uppercase tracking-[0.2em] text-accent2 mb-6">
            Image → Relief → Print
          </p>

          {/* Headline */}
          <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-ink leading-[1.05] tracking-tight">
            Turn Any Image Into a{" "}
            <span className="text-accent">3D Relief Panel</span>
          </h1>

          {/* Sub-headline */}
          <p className="mt-6 text-lg md:text-xl text-dim font-mono leading-relaxed max-w-2xl">
            Design multi-tile relief wall art from photos. Auto-generate
            tongue-and-groove joins. Export print-ready STLs in seconds.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col sm:flex-row gap-4">
            <a href="/signup" className="px-8 py-4 text-sm font-mono uppercase tracking-wider text-white bg-accent rounded-sm hover:bg-accent/90 hover:scale-[1.02] transition-all shadow-lg shadow-accent/20 text-center">
              Start Free — No Card Required
            </a>
            <a href="#how-it-works" className="px-8 py-4 text-sm font-mono uppercase tracking-wider text-ink border border-line rounded-sm hover:border-accent2 hover:text-accent2 transition-all text-center">
              See How It Works ↓
            </a>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-3 gap-6 max-w-lg">
            <div>
              <p className="font-heading text-2xl md:text-3xl text-ink">10K+</p>
              <p className="text-xs font-mono uppercase tracking-wider text-dim mt-1">Panels Made</p>
            </div>
            <div>
              <p className="font-heading text-2xl md:text-3xl text-ink">30s</p>
              <p className="text-xs font-mono uppercase tracking-wider text-dim mt-1">Workflow</p>
            </div>
            <div>
              <p className="font-heading text-2xl md:text-3xl text-ink">$0</p>
              <p className="text-xs font-mono uppercase tracking-wider text-dim mt-1">To Start</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
