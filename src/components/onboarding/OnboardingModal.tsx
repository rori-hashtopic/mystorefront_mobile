import { ReactNode } from "react";
import { X, ArrowLeft, ArrowRight } from "lucide-react";

interface OnboardingModalProps {
  children: ReactNode;
  currentStep: number;
  totalSteps: number;
  onBack?: () => void;
  onNext?: () => void;
  onClose?: () => void;
  nextLabel?: string;
  backLabel?: string;
  isNextDisabled?: boolean;
  isLoading?: boolean;
  showClose?: boolean;
}

export function OnboardingModal({
  children,
  currentStep,
  totalSteps,
  onBack,
  onNext,
  onClose,
  nextLabel = "Next",
  backLabel = "Back",
  isNextDisabled = false,
  isLoading = false,
  showClose = true,
}: OnboardingModalProps) {
  return (
    <div className="modal-overlay animate-fade-in">
      <div className="bg-card max-w-xl w-full mx-4 max-h-[90vh] overflow-hidden animate-scale-in border border-border shadow-elegant">
        {/* Top rule + step indicator */}
        <div className="px-8 pt-6 pb-0 flex items-center justify-between">
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
            Step {currentStep + 1} of {totalSteps}
          </span>
          {showClose && onClose && (
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="w-full px-8 pt-3">
          <div className="h-px bg-border w-full" />
        </div>

        {/* Content */}
        <div className="px-8 py-6 overflow-y-auto max-h-[65vh]">{children}</div>

        {/* Footer */}
        <div className="px-8 py-4">
          <div className="h-px bg-border w-full mb-4" />
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Progress line */}
            <div className="flex items-center justify-center gap-2 sm:justify-start">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  className={`h-px transition-all duration-500 ${
                    i <= currentStep ? "bg-foreground w-6" : "bg-border w-3"
                  }`}
                />
              ))}
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-4 sm:gap-6">
              {currentStep > 0 && onBack && (
                <button
                  onClick={onBack}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
                >
                  <ArrowLeft className="h-3 w-3" />
                  {backLabel}
                </button>
              )}
              {onNext && (
                <button
                  onClick={onNext}
                  disabled={isNextDisabled || isLoading}
                  className="ml-auto sm:ml-0 text-sm font-medium bg-foreground text-background px-5 py-2.5 hover:bg-foreground/90 transition-colors flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Saving..." : nextLabel}
                  {!isLoading && <ArrowRight className="h-3 w-3" />}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
