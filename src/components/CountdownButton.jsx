import React, { useState, useEffect, useRef } from "react";

export default function CountdownButton({ 
  onComplete, 
  label = "Hold to Confirm", 
  activeLabel = "Signing Transaction...", 
  completedLabel = "Confirmed",
  disabled = false, 
  colorClass = "bg-[#4F6EF7]" 
}) {
  const [progress, setProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);

  const HOLD_DURATION = 3000; // 3 seconds in milliseconds

  const startHold = (e) => {
    if (disabled || isCompleted) return;
    e.preventDefault();
    setIsHolding(true);
    setProgress(0);
    startTimeRef.current = Date.now();

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const calculatedProgress = Math.min((elapsed / HOLD_DURATION) * 100, 100);
      setProgress(calculatedProgress);

      if (elapsed >= HOLD_DURATION) {
        clearInterval(timerRef.current);
        setIsHolding(false);
        setIsCompleted(true);
        setProgress(100);
        if (onComplete) {
          onComplete();
        }
      }
    }, 30);
  };

  const endHold = () => {
    if (isCompleted) return;
    setIsHolding(false);
    clearInterval(timerRef.current);
    // Smoothly drain progress back to 0
    let currentProgress = progress;
    const drainTimer = setInterval(() => {
      currentProgress -= 8;
      if (currentProgress <= 0) {
        clearInterval(drainTimer);
        setProgress(0);
      } else {
        setProgress(currentProgress);
      }
    }, 15);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [progress]);

  // Reset completion state if labels or disabled changes
  useEffect(() => {
    if (disabled) {
      setIsCompleted(false);
      setProgress(0);
    }
  }, [disabled]);

  // SVG parameters for circular progress ring
  const size = 36;
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <button
      onMouseDown={startHold}
      onMouseUp={endHold}
      onMouseLeave={endHold}
      onTouchStart={startHold}
      onTouchEnd={endHold}
      disabled={disabled}
      className={`relative w-full py-4 px-6 border border-[#1E2640] rounded-lg overflow-hidden flex items-center justify-between font-body transition-all duration-200 cursor-pointer select-none no-shadow ${
        disabled 
          ? "opacity-40 cursor-not-allowed bg-[#0F1321]" 
          : isCompleted 
            ? "bg-[#00D48B]/10 border-[#00D48B] text-[#00D48B]" 
            : isHolding 
              ? "bg-[#0F1321] text-white" 
              : "bg-[#0F1321] hover:bg-[#1E2640]/50 text-white"
      }`}
    >
      {/* Background fill progress indicator */}
      <div 
        className={`absolute top-0 left-0 bottom-0 ${colorClass} opacity-10 transition-all duration-100 ease-out`}
        style={{ width: `${progress}%` }}
      />

      <div className="flex flex-col text-left z-10">
        <span className="font-headline font-bold text-sm tracking-wide">
          {isCompleted ? completedLabel : isHolding ? activeLabel : label}
        </span>
        <span className="text-[10px] text-[#94a3b8] font-body uppercase tracking-wider mt-0.5">
          {isCompleted ? "Success" : isHolding ? "Keep holding..." : "Hold for 3 seconds to stake"}
        </span>
      </div>

      {/* Circular Progress Ring */}
      <div className="relative flex items-center justify-center z-10 w-9 h-9">
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Track circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="#1E2640"
            strokeWidth={strokeWidth}
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={isCompleted ? "#00D48B" : "#4F6EF7"}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-100 ease-out"
          />
        </svg>
        {/* Inside circle number indicator */}
        <span className="absolute text-[10px] font-mono text-[#94a3b8]">
          {isCompleted ? "✓" : isHolding ? `${Math.ceil((100 - progress) / 33.3)}s` : "3s"}
        </span>
      </div>
    </button>
  );
}
