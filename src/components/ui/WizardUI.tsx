'use client';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

// 1. 🌌 The Floating Glass Canvas
export const GlassCanvas = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn(
    "relative bg-slate-950/40 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden",
    "before:absolute before:inset-0 before:bg-linear-to-br before:from-white/5 before:to-transparent before:pointer-events-none",
    className
  )}>
    {/* Neural Aura Background Animation */}
    <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[100px] animate-pulse" />
    <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] bg-cyan-600/10 rounded-full blur-[80px]" />
    
    <div className="relative z-10 h-full">{children}</div>
  </div>
);

// 2. ⌨️ Neumorphic Input
export const NeoInput = ({ className, ...props }: any) => (
  <input
    className={cn(
      "w-full h-14 px-4 bg-slate-900/50 rounded-xl border-none outline-none",
      "text-white placeholder:text-slate-500 font-mono text-sm",
      "shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)] focus:shadow-[inset_0_2px_4px_rgba(0,0,0,0.5),0_0_0_1px_rgba(99,102,241,0.5)] transition-all",
      className
    )}
    {...props}
  />
);

// 3. 🧲 Magnetic Button
export const MagButton = ({ children, onClick, disabled, variant = 'primary', className }: any) => {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative h-12 px-8 rounded-xl font-bold uppercase tracking-wider text-xs transition-all overflow-hidden flex items-center justify-center gap-2",
        variant === 'primary' 
          ? "bg-indigo-600 text-white shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:bg-indigo-500" 
          : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white",
        disabled && "opacity-50 cursor-not-allowed grayscale",
        className
      )}
    >
      <span className="relative z-10 flex items-center justify-center gap-2">{children}</span>
    </motion.button>
  );
};

// 4. 🎭 Staggered Animation Container
export const StaggerContainer = ({ children, delay = 0 }: { children: ReactNode; delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    transition={{ type: "spring", stiffness: 260, damping: 20, delay }}
  >
    {children}
  </motion.div>
);