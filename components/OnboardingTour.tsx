
import React, { useState, useEffect, useRef } from 'react';

interface TourStep {
  targetId: string;
  title: string;
  content: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

interface OnboardingTourProps {
  onComplete: () => void;
}

const OnboardingTour: React.FC<OnboardingTourProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const steps: TourStep[] = [
    {
      targetId: 'tour-welcome-msg',
      title: 'Welcome to your Dashboard',
      content: 'This is your central hub for tracking work hours, leave balances, and company updates.',
      position: 'bottom'
    },
    {
      targetId: 'tour-attendance-widget',
      title: 'Quick Clock-In',
      content: 'Start and end your workday with a single click. We track your location and shift times automatically.',
      position: 'bottom'
    },
    {
      targetId: 'tour-attendance-link',
      title: 'Attendance Logs',
      content: 'View your detailed history, working hours, and punctuality status here.',
      position: 'right'
    },
    {
      targetId: 'tour-leave-link',
      title: 'Manage Time Off',
      content: 'Apply for leaves, track your request status, and view your remaining balance in this section.',
      position: 'right'
    }
  ];

  const updateTargetRect = () => {
    const el = document.getElementById(steps[currentStep].targetId);
    if (el) {
      setTargetRect(el.getBoundingClientRect());
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  useEffect(() => {
    updateTargetRect();
    window.addEventListener('resize', updateTargetRect);
    return () => window.removeEventListener('resize', updateTargetRect);
  }, [currentStep]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  if (!targetRect) return null;

  const tooltipStyles: React.CSSProperties = {
    position: 'fixed',
    zIndex: 100,
    transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
  };

  const step = steps[currentStep];

  if (step.position === 'bottom') {
    tooltipStyles.top = targetRect.bottom + 20;
    tooltipStyles.left = targetRect.left + (targetRect.width / 2) - 160;
  } else if (step.position === 'right') {
    tooltipStyles.top = targetRect.top;
    tooltipStyles.left = targetRect.right + 20;
  }

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {/* Background Overlay with Highlight Hole */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px] transition-all duration-500"
        style={{
          clipPath: `polygon(
            0% 0%, 0% 100%, 
            ${targetRect.left - 8}px 100%, 
            ${targetRect.left - 8}px ${targetRect.top - 8}px, 
            ${targetRect.right + 8}px ${targetRect.top - 8}px, 
            ${targetRect.right + 8}px ${targetRect.bottom + 8}px, 
            ${targetRect.left - 8}px ${targetRect.bottom + 8}px, 
            ${targetRect.left - 8}px 100%, 
            100% 100%, 100% 0%
          )`
        }}
      />

      {/* Pulsing Highlight Ring */}
      <div 
        className="absolute border-2 border-primary-400 rounded-2xl animate-pulse pointer-events-none transition-all duration-500"
        style={{
          top: targetRect.top - 8,
          left: targetRect.left - 8,
          width: targetRect.width + 16,
          height: targetRect.height + 16,
        }}
      />

      {/* Tooltip Card */}
      <div 
        style={tooltipStyles}
        className="w-80 bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 pointer-events-auto animate-in fade-in slide-in-from-top-4 duration-300"
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-black uppercase tracking-widest text-primary-600 bg-primary-50 px-2 py-0.5 rounded">
            Step {currentStep + 1} of {steps.length}
          </span>
          <button onClick={handleSkip} className="text-slate-400 hover:text-slate-600 text-xs font-bold">Skip</button>
        </div>
        <h4 className="text-lg font-bold text-slate-900 mb-2">{step.title}</h4>
        <p className="text-sm text-slate-600 leading-relaxed mb-6">
          {step.content}
        </p>
        <div className="flex items-center gap-3">
          {currentStep > 0 && (
            <button 
              onClick={() => setCurrentStep(currentStep - 1)}
              className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-50 transition-colors"
            >
              Back
            </button>
          )}
          <button 
            onClick={handleNext}
            className="flex-1 px-4 py-2 bg-primary-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-primary-100 hover:bg-primary-700 transition-all"
          >
            {currentStep === steps.length - 1 ? 'Finish Tour' : 'Next Tip'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingTour;