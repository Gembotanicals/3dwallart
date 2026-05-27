'use client';

import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

interface UpgradePromptProps {
  open: boolean;
  onClose: () => void;
}

export default function UpgradePrompt({ open, onClose }: UpgradePromptProps) {
  if (!open) return null;

  return (
    <Modal>
      <div className="w-[440px] max-w-[90vw]">
        <h2 className="font-heading text-xl text-ink mb-2">
          Upgrade to Pro
        </h2>
        <p className="font-mono text-sm text-dim mb-5">
          You&apos;ve reached the free tier project limit. Upgrade to unlock more.
        </p>

        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-3 text-sm">
            <span className="text-accent font-bold">✓</span>
            <span className="text-ink">50 projects (vs 3 free)</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-accent font-bold">✓</span>
            <span className="text-ink">5 GB storage (vs 100 MB free)</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-accent font-bold">✓</span>
            <span className="text-ink">Export STL, OBJ, 3MF formats</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-accent font-bold">✓</span>
            <span className="text-ink">Share links &amp; mold generation</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-accent font-bold">✓</span>
            <span className="text-ink">Up to 400 resolution</span>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={onClose}>
            Maybe later
          </Button>
          <a
            href="/settings"
            className="inline-flex items-center rounded font-sans font-medium bg-accent text-white hover:bg-accent/90 px-4 py-2 text-sm transition-colors"
          >
            Upgrade to Pro — $12/month
          </a>
        </div>
      </div>
    </Modal>
  );
}
