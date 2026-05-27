'use client';

import { useState, useEffect, useCallback } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
}

// Global toast state using simple module-level pattern
type ToastListener = (toasts: ToastMessage[]) => void;

let toasts: ToastMessage[] = [];
const listeners: Set<ToastListener> = new Set();

function notify() {
  listeners.forEach((fn) => fn([...toasts]));
}

let toastIdCounter = 0;

export function addToast(
  type: ToastType,
  title: string,
  description?: string
) {
  const id = `toast-${++toastIdCounter}`;
  const toast: ToastMessage = { id, type, title, description };
  toasts = [...toasts, toast];
  notify();

  // Auto-dismiss after 5 seconds
  setTimeout(() => {
    dismissToast(id);
  }, 5000);

  return id;
}

export function dismissToast(id: string) {
  toasts = toasts.filter((t) => t.id !== id);
  notify();
}

export function useToastStore() {
  const [state, setState] = useState<ToastMessage[]>(toasts);

  useEffect(() => {
    listeners.add(setState);
    return () => {
      listeners.delete(setState);
    };
  }, []);

  return state;
}

// Convenience functions
export const toast = {
  success: (title: string, description?: string) =>
    addToast('success', title, description),
  error: (title: string, description?: string) =>
    addToast('error', title, description),
  info: (title: string, description?: string) =>
    addToast('info', title, description),
  warning: (title: string, description?: string) =>
    addToast('warning', title, description),
};

// Type icon and color mappings
const typeConfig: Record<
  ToastType,
  { icon: string; borderColor: string; bgColor: string; iconColor: string }
> = {
  success: {
    icon: '✓',
    borderColor: 'border-green-500/30',
    bgColor: 'bg-green-500/10',
    iconColor: 'text-green-400',
  },
  error: {
    icon: '✕',
    borderColor: 'border-red-500/30',
    bgColor: 'bg-red-500/10',
    iconColor: 'text-red-400',
  },
  info: {
    icon: 'ℹ',
    borderColor: 'border-[#36e0c0]/30',
    bgColor: 'bg-[#36e0c0]/10',
    iconColor: 'text-[#36e0c0]',
  },
  warning: {
    icon: '⚠',
    borderColor: 'border-yellow-500/30',
    bgColor: 'bg-yellow-500/10',
    iconColor: 'text-yellow-400',
  },
};

function ToastItem({ toast: t }: { toast: ToastMessage }) {
  const config = typeConfig[t.type];
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
  }, []);

  return (
    <div
      className={`flex items-start gap-3 rounded-lg border ${config.borderColor} ${config.bgColor} bg-panel px-4 py-3 shadow-xl transition-all duration-300 min-w-[280px] max-w-[380px] ${
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
    >
      <span className={`${config.iconColor} font-bold text-lg mt-0.5 shrink-0`}>
        {config.icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-ink">{t.title}</p>
        {t.description && (
          <p className="text-xs text-dim mt-0.5">{t.description}</p>
        )}
      </div>
      <button
        onClick={() => dismissToast(t.id)}
        className="text-dim hover:text-ink text-sm shrink-0 mt-0.5 transition-colors"
      >
        ✕
      </button>
    </div>
  );
}

export function ToastContainer() {
  const toastsList = useToastStore();

  if (toastsList.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9998] flex flex-col-reverse gap-2">
      {toastsList.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
}

// Simple export for backward compatibility
export function Toast({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="fixed bottom-4 right-4 z-50 rounded border border-line bg-panel px-4 py-3 text-sm text-ink shadow-lg">
      {message}
    </div>
  );
}
