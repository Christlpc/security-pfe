"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepItem {
  step: number;
  label: string;
  icon?: React.ReactNode;
  description?: string;
}

interface SimulationStepperProps {
  steps: StepItem[];
  currentStep: number;
  className?: string;
}

export function SimulationStepper({ steps, currentStep, className }: SimulationStepperProps) {
  return (
    <div className={cn("w-full", className)}>
      <div className="relative flex items-start justify-between">
        {/* Progress line behind steps */}
        <div className="absolute top-5 left-0 right-0 h-px bg-gray-100 z-0">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-700 ease-in-out"
            style={{ width: `${Math.max(0, ((currentStep - 1) / (steps.length - 1)) * 100)}%` }}
          />
        </div>

        {steps.map((item) => {
          const isActive = currentStep === item.step;
          const isCompleted = currentStep > item.step;

          return (
            <div key={item.step} className="relative flex flex-col items-center z-10" style={{ flex: "1 0 0" }}>
              {/* Circle */}
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500",
                  "bg-white shadow-sm",
                  isCompleted && "border-blue-600 bg-blue-600",
                  isActive && "border-blue-600 bg-white ring-4 ring-blue-50 shadow-md",
                  !isActive && !isCompleted && "border-gray-200 bg-white"
                )}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4 text-white" strokeWidth={2.5} />
                ) : (
                  <span
                    className={cn(
                      "text-sm font-semibold",
                      isActive ? "text-blue-600" : "text-gray-400"
                    )}
                  >
                    {item.step}
                  </span>
                )}
              </div>

              {/* Label */}
              <div className="mt-2.5 text-center">
                <span
                  className={cn(
                    "text-xs font-medium block transition-colors duration-300",
                    isActive && "text-blue-700 font-semibold",
                    isCompleted && "text-blue-600",
                    !isActive && !isCompleted && "text-gray-400"
                  )}
                >
                  {item.label}
                </span>
                {item.description && (
                  <span className="text-[10px] text-gray-400 mt-0.5 block hidden sm:block">
                    {item.description}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Section header used in each step
interface StepSectionHeaderProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  accentColor?: string;
}

export function StepSectionHeader({ icon, title, subtitle, accentColor = "blue" }: StepSectionHeaderProps) {
  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    blue: { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-100" },
    violet: { bg: "bg-violet-50", text: "text-violet-600", border: "border-violet-100" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-100" },
    amber: { bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-100" },
    rose: { bg: "bg-rose-50", text: "text-rose-600", border: "border-rose-100" },
    slate: { bg: "bg-slate-50", text: "text-slate-600", border: "border-slate-100" },
  };
  const colors = colorMap[accentColor] || colorMap.blue;

  return (
    <div className={cn("flex items-start gap-3.5 px-6 py-4 border-b", colors.border, colors.bg)}>
      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5", colors.bg)}>
        <span className={colors.text}>{icon}</span>
      </div>
      <div>
        <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

// Card wrapper for each form section within a step
export function StepCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden",
        className
      )}
    >
      {children}
    </div>
  );
}

// Step container with slide animation
export function StepContainer({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "space-y-4 animate-in slide-in-from-right-4 duration-400 fade-in",
        className
      )}
    >
      {children}
    </div>
  );
}

// Step navigation footer
interface StepNavigationProps {
  onBack?: () => void;
  onNext?: () => void;
  onNextLabel?: string;
  isLoading?: boolean;
  isLastStep?: boolean;
  showBack?: boolean;
  nextDisabled?: boolean;
  type?: "submit" | "button";
}

export function StepNavigation({
  onBack,
  onNext,
  onNextLabel = "Continuer",
  isLoading = false,
  isLastStep = false,
  showBack = true,
  nextDisabled = false,
  type = "button",
}: StepNavigationProps) {
  return (
    <div className="flex items-center justify-between pt-2 mt-2">
      {showBack ? (
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors px-4 py-2 rounded-lg hover:bg-gray-50"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Précédent
        </button>
      ) : (
        <div />
      )}

      <button
        type={type}
        onClick={type === "button" ? onNext : undefined}
        disabled={isLoading || nextDisabled}
        className={cn(
          "flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold",
          "bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98]",
          "transition-all duration-200 shadow-sm hover:shadow-md",
          "disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none",
          isLastStep && "bg-emerald-600 hover:bg-emerald-700"
        )}
      >
        {isLoading ? (
          <>
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Traitement...
          </>
        ) : (
          <>
            {onNextLabel}
            {!isLastStep && (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            )}
            {isLastStep && (
              <Check className="w-4 h-4" />
            )}
          </>
        )}
      </button>
    </div>
  );
}
