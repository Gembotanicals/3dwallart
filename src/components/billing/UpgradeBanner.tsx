"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";

const DISMISS_KEY = "reliefforge-upgrade-banner-dismissed";

export default function UpgradeBanner() {
  const { isSignedIn } = useUser();
  const [dismissed, setDismissed] = useState(true);
  const [userPlan, setUserPlan] = useState("FREE");

  useEffect(() => {
    const isDismissed = localStorage.getItem(DISMISS_KEY);
    if (!isDismissed) {
      setDismissed(false);
    }
  }, []);

  useEffect(() => {
    async function fetchPlan() {
      try {
        const res = await fetch("/api/user");
        if (res.ok) {
          const data = await res.json();
          setUserPlan(data.plan || "FREE");
        }
      } catch {
        // silent
      }
    }
    if (isSignedIn) fetchPlan();
  }, [isSignedIn]);

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, "true");
    setDismissed(true);
  };

  // Only show for free users
  if (userPlan !== "FREE" || dismissed) {
    return null;
  }

  return (
    <div className="relative mb-4 p-4 rounded border border-accent/20 bg-accent/5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
            <svg
              className="w-4 h-4 text-accent"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm text-ink font-medium">
              Upgrade to Pro for unlimited projects and high-res exports
            </p>
            <p className="text-xs text-dim font-mono mt-0.5">
              50 projects, 5 GB storage, batch export, and more.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link
            href="/settings/billing"
            className="px-3 py-1.5 text-xs font-mono uppercase tracking-wider bg-accent text-white rounded hover:bg-accent/90 transition-colors"
          >
            Upgrade
          </Link>
          <button
            onClick={handleDismiss}
            className="p-1 text-dim hover:text-ink transition-colors"
            aria-label="Dismiss"
          >
            <svg
              className="w-4 h-4"
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
      </div>
    </div>
  );
}
