const plans = [
  {
    name: "Free",
    price: "$0",
    period: "/mo",
    description: "For hobbyists exploring relief art.",
    features: [
      "3 projects",
      "100 MB storage",
      "220px max resolution",
      "STL export",
      "Watermarked panels",
    ],
    cta: "Get Started",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$12",
    period: "/mo",
    description: "For makers and artists who ship.",
    features: [
      "Unlimited projects",
      "10 GB storage",
      "2000px max resolution",
      "Batch export & ZIP",
      "Mold Mode Pro",
      "Color Studio",
      "No watermark",
    ],
    cta: "Start Pro Trial",
    highlighted: true,
  },
  {
    name: "Team",
    price: "$39",
    period: "/mo",
    description: "For studios and small-batch shops.",
    features: [
      "Everything in Pro",
      "5 team members",
      "Client portal",
      "API access",
      "Shared storage (50 GB)",
      "Priority support",
    ],
    cta: "Contact Sales",
    highlighted: false,
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="py-20 md:py-32 border-t border-line">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16">
          <p className="text-xs font-mono uppercase tracking-[0.2em] text-accent2 mb-4">
            Pricing
          </p>
          <h2 className="font-heading text-3xl md:text-5xl text-ink tracking-tight">
            Simple, Transparent Plans
          </h2>
          <p className="mt-4 text-dim font-mono text-sm max-w-xl mx-auto">
            Start free. Upgrade when your panels start selling.
          </p>
        </div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative p-8 rounded-sm border transition-all duration-300 hover:scale-[1.02] ${
                plan.highlighted
                  ? "bg-panel2 border-accent shadow-lg shadow-accent/10"
                  : "bg-panel border-line hover:border-accent/40"
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-accent text-white text-xs font-mono uppercase tracking-wider rounded-sm">
                  Most Popular
                </div>
              )}
              <div className="mb-6">
                <h3 className="font-heading text-lg text-ink mb-1">{plan.name}</h3>
                <p className="text-xs text-dim font-mono">{plan.description}</p>
              </div>
              <div className="mb-6">
                <span className="font-heading text-4xl text-ink">{plan.price}</span>
                <span className="text-dim text-sm font-mono">{plan.period}</span>
              </div>
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-dim">
                    <svg className="w-4 h-4 mt-0.5 text-accent2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
              <button
                className={`w-full py-3 text-sm font-mono uppercase tracking-wider rounded-sm transition-colors ${
                  plan.highlighted
                    ? "bg-accent text-white hover:bg-accent/90"
                    : "border border-line text-ink hover:border-accent hover:text-accent"
                }`}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
