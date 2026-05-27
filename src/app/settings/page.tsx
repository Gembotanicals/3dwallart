"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";

export default function SettingsPage() {
  const { isLoaded, isSignedIn } = useUser();
  const [userData, setUserData] = useState<{
    name: string | null;
    email: string;
    plan: string;
  } | null>(null);

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch("/api/user");
        if (res.ok) {
          const data = await res.json();
          setUserData(data);
        }
      } catch {
        // silent
      }
    }
    if (isSignedIn) fetchUser();
  }, [isSignedIn]);

  const userPlan = userData?.plan || "FREE";

  if (!isLoaded) {
    return (
      <main className="min-h-screen p-8 max-w-3xl mx-auto">
        <div className="animate-pulse text-dim font-mono text-sm">Loading...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8 max-w-3xl mx-auto">
      <h1 className="font-heading text-3xl text-ink">Settings</h1>
      <p className="mt-2 text-dim font-mono text-sm">
        Account and preferences
      </p>

      {/* Account Section */}
      <section className="mt-8 p-6 rounded border border-line bg-panel">
        <h2 className="font-heading text-lg text-ink mb-4">Account</h2>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-dim">Name</span>
            <span className="text-ink">
              {userData?.name || "Not set"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-dim">Email</span>
            <span className="text-ink">{userData?.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-dim">Plan</span>
            <span
              className={`inline-block px-2 py-0.5 rounded text-xs font-mono uppercase ${
                userPlan === "PRO"
                  ? "bg-accent/10 text-accent"
                  : userPlan === "TEAM"
                  ? "bg-accent2/10 text-accent2"
                  : "text-dim"
              }`}
            >
              {userPlan}
            </span>
          </div>
        </div>
      </section>

      {/* Billing Section */}
      <section className="mt-6 p-6 rounded border border-line bg-panel">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-heading text-lg text-ink">Billing</h2>
            <p className="text-xs text-dim font-mono mt-1">
              Manage your subscription, view usage, and update payment methods
            </p>
          </div>
          <Link
            href="/settings/billing"
            className="px-4 py-2 text-sm font-mono border border-line rounded hover:border-accent hover:text-accent text-ink transition-colors"
          >
            Manage →
          </Link>
        </div>

        <div className="mt-4 pt-4 border-t border-line/50">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-heading text-ink">
                {userPlan === "FREE" ? "3" : userPlan === "PRO" ? "50" : "200"}
              </p>
              <p className="text-xs font-mono text-dim mt-1">
                Project Limit
              </p>
            </div>
            <div>
              <p className="text-2xl font-heading text-ink">
                {userPlan === "FREE"
                  ? "100MB"
                  : userPlan === "PRO"
                  ? "5GB"
                  : "25GB"}
              </p>
              <p className="text-xs font-mono text-dim mt-1">
                Storage Limit
              </p>
            </div>
            <div>
              <p className="text-2xl font-heading text-ink">
                {userPlan === "FREE"
                  ? "150px"
                  : userPlan === "PRO"
                  ? "400px"
                  : "600px"}
              </p>
              <p className="text-xs font-mono text-dim mt-1">
                Max Resolution
              </p>
            </div>
          </div>
        </div>

        {userPlan === "FREE" && (
          <div className="mt-4 pt-4 border-t border-line/50">
            <Link
              href="/settings/billing"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-mono bg-accent text-white rounded hover:bg-accent/90 transition-colors"
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
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              Upgrade to Pro — $12/mo
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
