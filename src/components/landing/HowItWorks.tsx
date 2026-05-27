const steps = [
  {
    number: "01",
    title: "Upload",
    description: "Drag an image — PNG, JPG, or even a sketch. Our engine analyzes luminance and edge data to build a height map.",
  },
  {
    number: "02",
    title: "Customize",
    description: "Adjust depth, grid layout, joining style, and surface detail. Live 3D preview updates in real time.",
  },
  {
    number: "03",
    title: "Export",
    description: "Download print-ready STL files, sliced and optimized. Batch ZIP for multi-tile walls. Ready for your slicer.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 md:py-32 border-t border-line">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16">
          <p className="text-xs font-mono uppercase tracking-[0.2em] text-accent2 mb-4">
            Process
          </p>
          <h2 className="font-heading text-3xl md:text-5xl text-ink tracking-tight">
            How It Works
          </h2>
          <p className="mt-4 text-dim font-mono text-sm max-w-xl mx-auto">
            Three steps from photo to finished panel.
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
          {steps.map((step) => (
            <div key={step.number} className="relative">
              {/* Step number */}
              <div className="font-heading text-6xl md:text-7xl text-line/60 mb-4">
                {step.number}
              </div>
              {/* Connector line (hidden on last item and mobile) */}
              {step.number !== "03" && (
                <div className="hidden md:block absolute top-10 left-[calc(50%+3rem)] right-[-3rem] h-px bg-gradient-to-r from-line to-transparent" />
              )}
              <h3 className="font-heading text-xl text-ink mb-3">
                {step.title}
              </h3>
              <p className="text-sm text-dim leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
