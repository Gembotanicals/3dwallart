"use client";

import { useState, useEffect, Suspense } from "react";
import { useUser } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { PLAN_LIMITS } from "@/types";
import { formatBytes } from "@/lib/utils";

const plans = [
  {
    name: "Free",
    key: "FREE",
    monthlyPrice: "$0",
    yearlyPrice: "$0",
    period: "/mo",
  },
  {
    name: "Pro",
    key: "PRO",
    monthlyPrice: "$12",
    yearlyPrice: "$10",
    period: "/mo",
  },
  {
    name: "Team",
    key: "TEAM",
    monthlyPrice: "$39",
    yearlyPrice: "$33",
    period: "/mo",
  },
];

const featureRows = [
  { label: "Projects", free: "3", pro: "50", team: "200" },
  { label: "Storage", free: "100 MB", pro: "5 GB", team: "25 GB" },
  { label: "Max Resolution", free: "150 px", pro: "400 px", team: "600 px" },
  { label: "Batch Export", free: false, pro: true, team: true },
  { label: "Mold Generation", free: false, pro: true, team: true },
  { label: "Share Links", free: false, pro: true, team: true },
  { label: "Password Protection", free: false, pro: false, team: true },
  { label: "API Access", free: false, pro: false, team: true },
];

function BillingContent() {
  const { isLoaded, isSignedIn } = useUser();
  const searchParams = useSearchParams();
  const [yearly, setYearly] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [usage, setUsage] = useState<{ projects: number; storage: number; plan: string }>({
    projects: 0,
    storage: 0,
    plan: "FREE",
  });

  const userPlan = usage.plan;

  const success = searchParams.get("success");
  const canceled = searchParams.get("canceled");

  useEffect(() => {
    async function fetchUsage() {
      try {
        const res = await fetch("/api/user");
        if (res.ok) {
          const data = await res.json();
          setUsage({
            projects: data.projectCount ?? 0,
            storage: data.storageUsed ?? 0,
            plan: data.plan ?? "FREE",
          });
        }
      } catch {
        // silent
      }
    }
    if (isSignedIn) fetchUsage();
  }, [isSignedIn]);

  const handleCheckout = async (priceId: string, plan: "PRO" | "TEAM") => {
    setLoading(plan);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId, plan }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Checkout error:", err);
    } finally {
      setLoading(null);
    }
  };

  const handlePortal = async () => {
    setLoading("portal");
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Portal error:", err);
    } finally {
      setLoading(null);
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-dim font-mono text-sm">
          Loading...
        </div>
      </div>
    );
  }

  const limits = PLAN_LIMITS[userPlan] || PLAN_LIMITS.FREE;

  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto">
      {/* Status messages */}
      {success && (
        <div className="mb-6 p-4 rounded border border-accent2/30 bg-accent2/5">
          <p className="text-accent2 font-mono text-sm">
            ✓ Payment successful! Your plan has been upgraded.
          </p>
        </div>
      )}
      {canceled && (
        <div className="mb-6 p-4 rounded border border-line bg-panel">
          <p className="text-dim font-mono text-sm">
            Checkout canceled. You can try again anytime.
          </p>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="font-heading text-3xl text-ink">Billing</h1>
        <p className="mt-2 text-dim font-mono text-sm">
          Manage your subscription and usage
        </p>
      </div>

      {/* Current Plan Badge */}
      <div className="mb-8 p-6 rounded border border-line bg-panel">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-dim mb-1">
              Current Plan
            </p>
            <div className="flex items-center gap-3">
              <span
                className={`inline-block px-3 py-1 rounded text-xs font-mono uppercase tracking-wider ${
                  userPlan === "PRO"
                    ? "bg-accent/10 text-accent border border-accent/30"
                    : userPlan === "TEAM"
                    ? "bg-accent2/10 text-accent2 border border-accent2/30"
                    : "bg-panel2 text-dim border border-line"
                }`}
              >
                {userPlan}
              </span>
            </div>
          </div>
          {(userPlan === "PRO" || userPlan === "TEAM") && (
            <button
              onClick={handlePortal}
              disabled={loading === "portal"}
              className="px-4 py-2 text-sm font-mono border border-line rounded hover:border-accent/50 text-ink hover:text-accent transition-colors disabled:opacity-50"
            >
              {loading === "portal" ? "Loading..." : "Manage Billing"}
            </button>
          )}
        </div>

        {/* Usage Stats */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="flex justify-between text-xs font-mono text-dim mb-1">
              <span>Projects</span>
              <span>
                {usage.projects} / {limits.maxProjects === -1 ? "∞" : limits.maxProjects}
              </span>
            </div>
            <div className="h-2 bg-panel2 rounded overflow-hidden">
              <div
                className="h-full bg-accent rounded transition-all"
                style={{
                  width: `${Math.min(
                    100,
                    limits.maxProjects > 0
                      ? (usage.projects / limits.maxProjects) * 100
                      : 0
                  )}%`,
                }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs font-mono text-dim mb-1">
              <span>Storage</span>
              <span>
                {formatBytes(usage.storage)} /{" "}
                {limits.maxStorageBytes === -1
                  ? "∞"
                  : formatBytes(limits.maxStorageBytes)}
              </span>
            </div>
            <div className="h-2 bg-panel2 rounded overflow-hidden">
              <div
                className="h-full bg-accent2 rounded transition-all"
                style={{
                  width: `${Math.min(
                    100,
                    limits.maxStorageBytes > 0
                      ? (usage.storage / limits.maxStorageBytes) * 100
                      : 0
                  )}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Billing Toggle */}
      <div className="flex items-center justify-center gap-3 mb-8">
        <span
          className={`text-sm font-mono ${!yearly ? "text-ink" : "text-dim"}`}
        >
          Monthly
        </span>
        <button
          onClick={() => setYearly(!yearly)}
          className={`relative w-12 h-6 rounded-full transition-colors ${
            yearly ? "bg-accent" : "bg-panel2 border border-line"
          }`}
        >
          <div
            className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
              yearly ? "translate-x-7" : "translate-x-1"
            }`}
          />
        </button>
        <span
          className={`text-sm font-mono ${yearly ? "text-ink" : "text-dim"}`}
        >
          Yearly{" "}
          <span className="text-accent2 text-xs">(save 17%)</span>
        </span>
      </div>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {plans.map((plan) => {
          const isCurrentPlan = plan.key === userPlan;
          const price = yearly ? plan.yearlyPrice : plan.monthlyPrice;
          const priceId =
            plan.key === "PRO"
              ? yearly
                ? process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_YEARLY
                : process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY
              : plan.key === "TEAM"
              ? yearly
                ? process.env.NEXT_PUBLIC_STRIPE_PRICE_TEAM_YEARLY
                : process.env.NEXT_PUBLIC_STRIPE_PRICE_TEAM_MONTHLY
              : null;

          return (
            <div
              key={plan.key}
              className={`p-6 rounded border transition-all ${
                isCurrentPlan
                  ? "border-accent bg-accent/5"
                  : "border-line bg-panel hover:border-accent/40"
              }`}
            >
              <h3 className="font-heading text-lg text-ink mb-1">
                {plan.name}
              </h3>
              <div className="mb-4">
                <span className="font-heading text-3xl text-ink">
                  {price}
                </span>
                <span className="text-dim text-sm font-mono">
                  {plan.period}
                  {yearly && plan.key !== "FREE" ? " (billed yearly)" : ""}
                </span>
              </div>

              {isCurrentPlan ? (
                <div className="w-full py-2.5 text-center text-sm font-mono uppercase tracking-wider text-accent border border-accent/30 rounded bg-accent/5">
                  Current Plan
                </div>
              ) : plan.key === "FREE" ? (
                <div className="w-full py-2.5 text-center text-sm font-mono text-dim border border-line rounded">
                  {userPlan !== "FREE" ? "Downgrade" : "Current"}
                </div>
              ) : (
                <button
                  onClick={() =>
                    priceId && handleCheckout(priceId, plan.key as "PRO" | "TEAM")
                  }
                  disabled={loading === plan.key || !priceId}
                  className="w-full py-2.5 text-sm font-mono uppercase tracking-wider rounded transition-colors bg-accent text-white hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading === plan.key
                    ? "Redirecting..."
                    : userPlan === "FREE"
                    ? "Upgrade"
                    : userPlan === "PRO" && plan.key === "TEAM"
                    ? "Upgrade"
                    : userPlan === "TEAM"
                    ? "Downgrade"
                    : "Switch"}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Feature Comparison Table */}
      <div className="mb-10">
        <h2 className="font-heading text-xl text-ink mb-4">
          Plan Comparison
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line">
                <th className="py-3 px-4 text-left text-dim font-mono text-xs uppercase tracking-wider">
                  Feature
                </th>
                <th className="py-3 px-4 text-center text-dim font-mono text-xs uppercase tracking-wider">
                  Free
                </th>
                <th className="py-3 px-4 text-center text-dim font-mono text-xs uppercase tracking-wider">
                  Pro
                </th>
                <th className="py-3 px-4 text-center text-dim font-mono text-xs uppercase tracking-wider">
                  Team
                </th>
              </tr>
            </thead>
            <tbody>
              {featureRows.map((row) => (
                <tr
                  key={row.label}
                  className="border-b border-line/50 hover:bg-panel2/50"
                >
                  <td className="py-3 px-4 text-ink">{row.label}</td>
                  <td className="py-3 px-4 text-center">
                    <CellValue value={row.free} />
                  </td>
                  <td className="py-3 px-4 text-center">
                    <CellValue value={row.pro} />
                  </td>
                  <td className="py-3 px-4 text-center">
                    <CellValue value={row.team} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Back link */}
      <a
        href="/settings"
        className="text-sm text-dim hover:text-accent font-mono transition-colors"
      >
        ← Back to Settings
      </a>
    </main>
  );
}

function CellValue({ value }: { value: string | boolean }) {
  if (typeof value === "boolean") {
    return value ? (
      <span className="text-accent2">✓</span>
    ) : (
      <span className="text-dim/50">✗</span>
    );
  }
  return <span className="text-dim font-mono text-xs">{value}</span>;
}

export default function BillingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-pulse text-dim font-mono text-sm">
            Loading...
          </div>
        </div>
      }
    >
      <BillingContent />
    </Suspense>
  );
}
