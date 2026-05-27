export default function CTASection() {
  return (
    <section className="py-20 md:py-32 border-t border-line">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="font-heading text-3xl md:text-5xl lg:text-6xl text-ink tracking-tight">
          Ready to Forge?
        </h2>
        <p className="mt-6 text-dim font-mono text-sm md:text-base max-w-xl mx-auto">
          Join thousands of makers turning photos into physical art. Free to start, no credit card required.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <button className="px-10 py-4 text-sm font-mono uppercase tracking-wider text-white bg-accent rounded-sm hover:bg-accent/90 hover:scale-[1.02] transition-all shadow-lg shadow-accent/20">
            Get Started Free
          </button>
          <button className="px-10 py-4 text-sm font-mono uppercase tracking-wider text-ink border border-line rounded-sm hover:border-accent2 hover:text-accent2 transition-all">
            View Pricing
          </button>
        </div>
      </div>
    </section>
  );
}
