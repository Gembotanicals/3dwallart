'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function WelcomePage() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  const completeOnboarding = () => {
    localStorage.setItem('onboarding_complete', 'true');
    router.push('/dashboard');
    router.refresh();
  };

  const nextStep = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      completeOnboarding();
    }
  };

  const skipOnboarding = () => {
    completeOnboarding();
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full">
        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-2 w-2 rounded-full transition-all ${
                s === step
                  ? 'bg-accent w-8'
                  : s < step
                  ? 'bg-accent/50'
                  : 'bg-panel2'
              }`}
            />
          ))}
        </div>

        {/* Step content */}
        <div className="bg-panel border border-line rounded-lg p-8 shadow-xl">
          {step === 1 && (
            <div className="text-center">
              <div className="mb-6">
                <div className="inline-block">
                  <div className="w-20 h-20 bg-gradient-to-br from-accent to-accent2 rounded-lg flex items-center justify-center mb-4 mx-auto">
                    <span className="text-4xl">🎨</span>
                  </div>
                </div>
              </div>
              <h1 className="font-heading text-3xl text-ink mb-3">
                Welcome to ReliefForge
              </h1>
              <p className="font-sans text-ink/80 mb-6 leading-relaxed">
                Transform your images into stunning 3D relief panels ready for
                printing. Create beautiful wall art, decorative tiles, and
                custom molds with ease.
              </p>
              <div className="grid grid-cols-3 gap-4 text-center mb-8">
                <div className="p-3">
                  <div className="text-2xl mb-2">📸</div>
                  <p className="text-xs text-dim font-mono">Upload Images</p>
                </div>
                <div className="p-3">
                  <div className="text-2xl mb-2">🎛️</div>
                  <p className="text-xs text-dim font-mono">Adjust Settings</p>
                </div>
                <div className="p-3">
                  <div className="text-2xl mb-2">📦</div>
                  <p className="text-xs text-dim font-mono">Export STL</p>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="text-center">
              <div className="mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-accent2 to-accent rounded-lg flex items-center justify-center mb-4 mx-auto">
                  <span className="text-4xl">🖼️</span>
                </div>
              </div>
              <h2 className="font-heading text-2xl text-ink mb-3">
                Upload your first image
              </h2>
              <p className="font-sans text-ink/80 mb-6 leading-relaxed">
                Start by uploading an image to your library. Any photo or
                graphic will work — ReliefForge will convert it to a 3D relief
                based on brightness.
              </p>
              <div className="flex flex-col gap-3">
                <Link
                  href="/library"
                  onClick={(e) => {
                    e.preventDefault();
                    localStorage.setItem('onboarding_complete', 'true');
                    router.push('/library');
                  }}
                  className="bg-accent hover:bg-accent/90 text-white font-sans font-medium px-6 py-3 rounded transition-colors"
                >
                  Go to Image Library
                </Link>
                <button
                  onClick={nextStep}
                  className="text-dim hover:text-ink text-sm font-mono transition-colors"
                >
                  I&apos;ll do this later →
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="text-center">
              <div className="mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-accent to-accent2 rounded-lg flex items-center justify-center mb-4 mx-auto">
                  <span className="text-4xl">🚀</span>
                </div>
              </div>
              <h2 className="font-heading text-2xl text-ink mb-3">
                Create your first panel
              </h2>
              <p className="font-sans text-ink/80 mb-6 leading-relaxed">
                Ready to start? Create a new project and select an image from
                your library. Adjust the relief settings and preview your 3D
                panel before exporting.
              </p>
              <div className="flex flex-col gap-3">
                <Link
                  href="/dashboard"
                  onClick={(e) => {
                    e.preventDefault();
                    localStorage.setItem('onboarding_complete', 'true');
                    router.push('/dashboard');
                  }}
                  className="bg-accent hover:bg-accent/90 text-white font-sans font-medium px-6 py-3 rounded transition-colors"
                >
                  Go to Dashboard
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={skipOnboarding}
            className="text-dim hover:text-ink text-sm font-mono transition-colors"
          >
            Skip for now
          </button>
          {step < 3 && (
            <button
              onClick={nextStep}
              className="bg-panel border border-line hover:border-accent/50 text-ink font-sans font-medium text-sm px-6 py-2 rounded transition-colors"
            >
              Next →
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
