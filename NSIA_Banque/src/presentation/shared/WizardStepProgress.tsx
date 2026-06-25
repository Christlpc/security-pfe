'use client';

/**
 * Presentation: Wizard Step Progress
 * Reusable progress indicator for the simulation wizard
 */

import { CheckCircle } from 'lucide-react';

interface WizardStep {
    step: number;
    label: string;
}

interface WizardStepProgressProps {
    currentStep: number;
    steps?: WizardStep[];
}

const DEFAULT_STEPS: WizardStep[] = [
    { step: 1, label: 'Client' },
    { step: 2, label: 'Produit' },
    { step: 3, label: 'Résultat' },
    { step: 4, label: 'Santé' },
    { step: 5, label: 'BIA' },
];

export function WizardStepProgress({
    currentStep,
    steps = DEFAULT_STEPS,
}: WizardStepProgressProps) {
    const totalSteps = steps.length;
    const progressWidth = ((currentStep - 1) / (totalSteps - 1)) * 100;

    return (
        <div className="mb-8 px-4">
            <div className="flex justify-between items-center relative">
                {/* Background track */}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-100 -z-10 rounded-full" />

                {/* Progress bar */}
                <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-blue-600 -z-10 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${progressWidth}%` }}
                />

                {/* Step indicators */}
                {steps.map((item) => {
                    const isActive = currentStep === item.step;
                    const isCompleted = currentStep > item.step;

                    return (
                        <div key={item.step} className="flex flex-col items-center group cursor-default">
                            <div
                                className={`
                  w-10 h-10 rounded-full flex items-center justify-center border-2 text-sm font-bold 
                  transition-all duration-300 bg-white
                  ${isActive
                                        ? 'border-blue-600 text-blue-600 shadow-md scale-110'
                                        : isCompleted
                                            ? 'border-blue-600 bg-blue-600 text-white'
                                            : 'border-gray-200 text-gray-400'
                                    }
                `}
                            >
                                {isCompleted ? <CheckCircle className="w-5 h-5" /> : item.step}
                            </div>
                            <span
                                className={`
                  text-xs mt-2 font-medium bg-white px-2 rounded-full transition-colors
                  ${isActive
                                        ? 'text-blue-700 font-bold'
                                        : isCompleted
                                            ? 'text-blue-600'
                                            : 'text-gray-400'
                                    }
                `}
                            >
                                {item.label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
