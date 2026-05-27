"use client";

import { useState } from "react";
import Link from "next/link";

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  limitType: "projects" | "storage" | "resolution" | "export" | "share" | "mold" | "generic";
  currentPlan: string;
  message?: string;
}

const limitMessages: Record<string, string> = {
  projects:
    "You've reached the maximum number of projects for your plan.",
  storage: "You've used all available storage on your plan.",
  resolution:
    "This resolution exceeds your plan's maximum. Upgrade for higher quality exports.",
  export: "This export format requires a paid plan.",
  share: "Share links are available on Pro and Team plans.",
  mold: "Mold generation requires a Pro plan or higher.",
  generic: "This feature requires a paid plan.",
};

const proBenefits = [
  "50 projects (vs 3 on Free)",
  "5 GB storage (vs 100 MB on Free)",
  "400px max resolution",
  "Batch export & ZIP download",
  "Mold generation mode",
  "Share links for clients",
  "All export formats (STL, OBJ, 3MF)",
];

export default function UpgradeModal({
  open,
  onClose,
  limitType,
  currentPlan,
  message,
}: UpgradeModalProps) {
  if (!open) return null;

  const displayMessage = message || limitMessages[limitType];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-lg border border-line bg-panel p-6 shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="font-heading text-xl text-ink">
              Upgrade Your Plan
            </h2>
            <p className="text-xs font-mono text-dim mt-1">
              Current plan: {currentPlan}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-dim hover:text-ink transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Message */}
        <div className="mb-5 p-3 rounded border border-accent/20 bg-accent/5">
          <p className="text-sm text-ink">{displayMessage}</p>
        </div>

        {/* Pro Benefits */}
        <div className="mb-6">
          <p className="text-xs font-mono uppercase tracking-wider text-dim mb-3">
            Pro plan includes:
          </p>
          <ul className="space-y-2">
            {proBenefits.map((benefit) => (
              <li
                key={benefit}
                className="flex items-start gap-2 text-sm text-dim"
              >
                <svg
                  className="w-4 h-4 mt-0.5 text-accent2 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                {benefit}
              </li>
            ))}
          </ul>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Link
            href="/settings/billing"
            onClick={onClose}
            className="flex-1 py-2.5 text-center text-sm font-mono uppercase tracking-wider bg-accent text-white rounded hover:bg-accent/90 transition-colors"
          >
            Upgrade Now
          </Link>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 text-sm font-mono uppercase tracking-wider border border-line rounded text-dim hover:text-ink hover:border-accent/40 transition-colors"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
}
