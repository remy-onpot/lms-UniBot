'use client';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

// 1. 🧊 Ethereal Glass Panel (Concave Depth + Source Lighting)
export const GlassPanel = ({ children, className, active = false }: { children: ReactNode; className?: string; active?: boolean }) => (
  <motion.div
    layout
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ type: "spring", stiffness: 150, damping: 20 }}
    className={cn(
      "relative overflow-hidden rounded-3xl border backdrop-blur-2xl transition-all duration-500",
      // Lighting & Depth
      active 
        ? "border-indigo-500/50 bg-gradient-to-br from-indigo-900/40 to-slate-950/80 shadow-[inset_0_0_40px_-10px_rgba(99,102,241,0.2)]" 
        : "border-white/10 bg-gradient-to-br from-white/5 to-slate-950/40 hover:border-white/20",
      // Active Glow
      active && "shadow-[0_0_40px_-10px_rgba(99,102,241,0.4)]",
      className
    )}
  >
    {/* Source-Point Light Reflection (Top Left) */}
    <div className="absolute -top-20 -left-20 w-40 h-40 bg-white/5 rounded-full blur-[50px] pointer-events-none" />
    
    <div className="relative z-10">{children}</div>
  </motion.div>
);

// 2. ⚡ Neon Button
export const NeonButton = ({ children, onClick, disabled, variant = 'outline', className }: any) => {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative h-14 w-full rounded-xl font-bold uppercase tracking-widest text-xs transition-all overflow-hidden",
        // Primary (Neon Glow)
        variant === 'primary' && "bg-indigo-600 text-white shadow-[0_0_20px_-5px_#6366f1] hover:bg-indigo-500 hover:shadow-[0_0_30px_-5px_#6366f1]",
        // Outline (Glass)
        variant === 'outline' && "border border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white",
        // Disabled
        disabled && "opacity-50 cursor-not-allowed grayscale shadow-none",
        className
      )}
    >
      {children}
    </motion.button>
  );
};

// 3. 🏷️ Tech Badge (System Metadata)
export const TechBadge = ({ children }: { children: ReactNode }) => (
  <div className="inline-flex items-center px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-[10px] font-mono uppercase tracking-wider shadow-[0_0_10px_-3px_#6366f1]">
    {children}
  </div>
);

// 4. 📝 Data Row (Table)
export const DataRow = ({ label, children, highlight = false }: any) => (
  <div className={cn(
    "flex items-center justify-between py-4 border-b border-white/5 transition-colors",
    highlight && "bg-white/[0.02]"
  )}>
    <span className="font-mono text-xs text-slate-500 uppercase tracking-wider">{label}</span>
    <div className="text-sm font-medium text-slate-300">{children}</div>
  </div>
);