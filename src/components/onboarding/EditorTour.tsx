'use client';

import { useState, useEffect, useCallback } from 'react';

interface TourStep {
  id: string;
  target: string;
  title: string;
  description: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'dropzone',
    target: '[data-tour="dropzone"]',
    title: 'Upload an Image',
    description: 'Start by dropping an image here. Any photo or graphic works — ReliefForge converts brightness into depth.',
    position: 'right',
  },
  {
    id: 'controls',
    target: '[data-tour="controls"]',
    title: 'Relief Controls',
    description: 'Adjust depth, contrast, and smoothing to fine-tune your 3D relief appearance.',
    position: 'left',
  },
  {
    id: 'tiling',
    target: '[data-tour="tiling"]',
    title: 'Grid Tiling',
    description: 'Split your image across multiple tiles for larger installations. Adjust columns and rows.',
    position: 'left',
  },
  {
    id: 'viewport',
    target: '[data-tour="viewport"]',
    title: '3D Preview',
    description: 'Orbit the preview by dragging, zoom with scroll wheel. See your relief in real-time.',
    position: 'left',
  },
  {
    id: 'export',
    target: '[data-tour="export"]',
    title: 'Export',
    description: 'Download your STL file when ready. Export individual tiles or all at once.',
    position: 'top',
  },
];

interface TooltipPosition {
  top: number;
  left: number;
}

function getTooltipPosition(
  targetEl: HTMLElement,
  position: TourStep['position']
): TooltipPosition {
  const rect = targetEl.getBoundingClientRect();
  const offset = 16;

  switch (position) {
    case 'top':
      return {
        top: rect.top - offset,
        left: rect.left + rect.width / 2,
      };
    case 'bottom':
      return {
        top: rect.bottom + offset,
        left: rect.left + rect.width / 2,
      };
    case 'left':
      return {
        top: rect.top + rect.height / 2,
        left: rect.left - offset,
      };
    case 'right':
      return {
        top: rect.top + rect.height / 2,
        left: rect.right + offset,
      };
  }
}

export default function EditorTour() {
  const [active, setActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [tooltipPos, setTooltipPos] = useState<TooltipPosition>({ top: 0, left: 0 });

  const step = TOUR_STEPS[currentStep];

  const updateTarget = useCallback(() => {
    if (!active) return;
    const el = document.querySelector(step?.target) as HTMLElement | null;
    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
      setTooltipPos(getTooltipPosition(el, step.position));
    } else {
      // Target not found, skip to next step
      if (currentStep < TOUR_STEPS.length - 1) {
        setCurrentStep((s) => s + 1);
      } else {
        dismiss();
      }
    }
  }, [active, step, currentStep]);

  const dismiss = () => {
    setActive(false);
    localStorage.setItem('editor_tour_seen', 'true');
  };

  const nextStep = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      dismiss();
    }
  };

  useEffect(() => {
    const seen = localStorage.getItem('editor_tour_seen');
    if (!seen) {
      // Delay to let the page render
      const timer = setTimeout(() => setActive(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    updateTarget();
    window.addEventListener('resize', updateTarget);
    window.addEventListener('scroll', updateTarget);
    return () => {
      window.removeEventListener('resize', updateTarget);
      window.removeEventListener('scroll', updateTarget);
    };
  }, [updateTarget, currentStep]);

  if (!active || !targetRect) return null;

  const getTransform = (): string => {
    switch (step.position) {
      case 'top':
        return 'translate(-50%, -100%)';
      case 'bottom':
        return 'translate(-50%, 0)';
      case 'left':
        return 'translate(-100%, -50%)';
      case 'right':
        return 'translate(0, -50%)';
    }
  };

  return (
    <div className="fixed inset-0 z-[9999]">
      {/* Overlay with cutout */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `rgba(0, 0, 0, 0.6)`,
          boxShadow: `0 0 0 9999px rgba(0, 0, 0, 0.6)`,
        }}
      />
      {/* Highlight cutout */}
      <div
        className="absolute rounded-lg border-2 border-accent transition-all duration-300"
        style={{
          top: targetRect.top - 4,
          left: targetRect.left - 4,
          width: targetRect.width + 8,
          height: targetRect.height + 8,
          boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6), inset 0 0 20px rgba(255, 92, 43, 0.1)',
        }}
      />

      {/* Tooltip */}
      <div
        className="absolute w-72 bg-panel border border-line rounded-lg shadow-2xl p-4 pointer-events-auto transition-all duration-300"
        style={{
          top: tooltipPos.top,
          left: tooltipPos.left,
          transform: getTransform(),
        }}
      >
        {/* Step indicator */}
        <div className="flex items-center gap-1.5 mb-3">
          {TOUR_STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === currentStep
                  ? 'bg-accent w-4'
                  : i < currentStep
                  ? 'bg-accent/40 w-1.5'
                  : 'bg-panel2 w-1.5'
              }`}
            />
          ))}
        </div>

        <h3 className="font-heading text-base text-ink mb-1.5">
          {step.title}
        </h3>
        <p className="font-sans text-sm text-dim leading-relaxed mb-4">
          {step.description}
        </p>

        <div className="flex items-center justify-between">
          <button
            onClick={dismiss}
            className="text-xs text-dim hover:text-ink font-mono transition-colors"
          >
            Skip tour
          </button>
          <button
            onClick={nextStep}
            className="bg-accent hover:bg-accent/90 text-white text-xs font-bold px-4 py-1.5 rounded transition-colors"
          >
            {currentStep < TOUR_STEPS.length - 1 ? 'Next →' : 'Done'}
          </button>
        </div>
      </div>
    </div>
  );
}
