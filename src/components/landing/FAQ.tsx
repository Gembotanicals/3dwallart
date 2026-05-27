"use client";

import { useState } from "react";

const faqs = [
  {
    question: "What is a relief panel?",
    answer:
      "A relief panel is a 3D surface where image brightness maps to physical height — creating textured wall art you can touch. Think of it as a topographic map made from your photo, optimized for 3D printing.",
  },
  {
    question: "What 3D printer do I need?",
    answer:
      "Any FDM printer works — Bambu Lab, Prusa, Ender, Voron. Panels are typically 0.2mm layer height in PLA or PETG. For larger walls, we recommend a 256mm+ build plate, but our grid tiling lets you use any size.",
  },
  {
    question: "Can I sell panels I make?",
    answer:
      "Yes! On Pro and Team plans, you own full commercial rights to any panel you design. Many of our users sell custom relief art on Etsy, at craft fairs, or as commissioned wall installations.",
  },
  {
    question: "What is tongue-and-groove?",
    answer:
      "Our auto-generated interlocking tabs snap adjacent tiles together at bed level — no glue, no clamps, no sanding. Each tile gets a male tongue on one edge and a female groove on the opposite, so a 3×3 wall assembles like puzzle pieces.",
  },
  {
    question: "How big can I make a panel?",
    answer:
      "Single tiles are limited by your printer's build plate (typically 220–300mm). With grid tiling, you can create walls of any size — an 8×8 grid of 250mm tiles gives you a 2m × 2m installation.",
  },
  {
    question: "Is there an API?",
    answer:
      "Yes, available on Team plans. Our REST API lets you programmatically generate reliefs, manage projects, and export files. Perfect for integrating relief generation into your own products or workflows.",
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="py-20 md:py-32 border-t border-line">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16">
          <p className="text-xs font-mono uppercase tracking-[0.2em] text-accent2 mb-4">
            FAQ
          </p>
          <h2 className="font-heading text-3xl md:text-5xl text-ink tracking-tight">
            Common Questions
          </h2>
        </div>

        {/* Accordion */}
        <div className="space-y-2">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="border border-line rounded-sm overflow-hidden transition-colors hover:border-line/80"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex items-center justify-between p-5 text-left"
              >
                <span className="text-sm font-mono text-ink pr-4">
                  {faq.question}
                </span>
                <svg
                  className={`w-5 h-5 text-dim flex-shrink-0 transition-transform duration-200 ${
                    openIndex === index ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {openIndex === index && (
                <div className="px-5 pb-5 pt-0">
                  <p className="text-sm text-dim leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
