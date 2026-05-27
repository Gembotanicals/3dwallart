"use client";

import { formatBytes } from "@/lib/utils";
import { PLAN_LIMITS } from "@/types";

interface StorageBarProps {
  used: number;
  plan: string;
}

export function StorageBar({ used, plan }: StorageBarProps) {
  const limits = PLAN_LIMITS[plan];
  const maxBytes = limits?.maxStorageBytes || 0;
  const isUnlimited = maxBytes === -1;

  const percentage = isUnlimited ? 0 : Math.min((used / maxBytes) * 100, 100);
  const isWarning = percentage >= 80;
  const isFull = percentage >= 100;

  return (
    <div className="flex flex-col items-end gap-1">
      <span className="text-xs text-dim">
        {isUnlimited
          ? `${formatBytes(used)} used (unlimited)`
          : `${formatBytes(used)} / ${formatBytes(maxBytes)} used`}
      </span>
      {!isUnlimited && (
        <div className="w-40 h-1.5 bg-panel2 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              isFull
                ? "bg-warn"
                : isWarning
                ? "bg-warn"
                : "bg-accent"
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
      {isFull && (
        <span className="text-xs text-warn">
          Storage full —{" "}
          <a href="/settings" className="underline hover:text-accent">
            upgrade plan
          </a>
        </span>
      )}
    </div>
  );
}
