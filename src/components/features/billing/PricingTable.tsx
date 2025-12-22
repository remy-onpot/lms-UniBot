'use client';

import * as React from "react";
import { Check, Loader2, Cpu, Zap, X } from "lucide-react";
import { GlassPanel, NeonButton, TechBadge, DataRow } from "@/components/ui/PricingUI";
import { cn } from "@/lib/utils";

// Define the shape of our DB data
export interface SubscriptionPlan {
  id: string;
  label: string;
  price: number;
  description: string;
  features: string[];
  limits: {
    max_classes: number;
    max_students: number;
    ai_credits: number;
    has_ta: boolean;
  };
}

interface PricingTableProps {
  plans: SubscriptionPlan[]; // ✅ Dynamic Data from DB
  currentPlan: string;
  onUpgrade: (planId: string) => void;
  processing: string | null;
}

export function PricingTable({ plans, currentPlan, onUpgrade, processing }: PricingTableProps) {

  const formatPrice = (price: number) => price === 0 ? "Free" : `₵${price}`;

  return (
    <section className="bg-slate-950 py-20 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 relative z-10">
        
        {/* 🏷️ PRICING CARDS */}
        <div className="grid md:grid-cols-3 gap-8 mb-20">
          {plans.map((plan) => {
            const isCurrent = currentPlan === plan.id;
            const isPopular = plan.id === 'pro'; // or check plan.is_featured if you add that col
            const isLoading = processing === plan.id;

            return (
              <GlassPanel key={plan.id} active={isPopular} className="flex flex-col p-8">
                
                {/* Header */}
                <div className="flex justify-between items-start mb-6">
                  <div>
                     <h3 className={cn("text-2xl font-bold tracking-tighter mb-1", isPopular ? "text-white" : "text-slate-300")}>
                        {plan.label}
                     </h3>
                     <p className="font-mono text-xs text-slate-500 uppercase">
                        {plan.description}
                     </p>
                  </div>
                  {isPopular && <TechBadge>Recommended</TechBadge>}
                </div>

                {/* Price */}
                <div className="flex items-baseline gap-1 mb-8">
                  <span className={cn("text-5xl font-black tracking-tighter", isPopular ? "text-indigo-400" : "text-slate-200")}>
                    {formatPrice(plan.price)}
                  </span>
                  {plan.price > 0 && <span className="font-mono text-xs text-slate-600">/SEMESTER</span>}
                </div>

                {/* Features */}
                <ul className="space-y-4 mb-10 flex-1">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex gap-3 items-start">
                      <div className={cn(
                        "mt-0.5 rounded-full p-0.5 shadow-[0_0_10px_-2px_currentColor]",
                        isPopular ? "text-indigo-400 bg-indigo-400/10" : "text-slate-500 bg-slate-500/10"
                      )}>
                        <Check className="w-3 h-3" strokeWidth={3} />
                      </div>
                      <span className="text-sm text-slate-300 font-medium">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Action */}
                <NeonButton
                  onClick={() => onUpgrade(plan.id)}
                  disabled={isCurrent || !!processing}
                  variant={isPopular ? 'primary' : 'outline'}
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 
                   isCurrent ? "Current Active Node" : 
                   plan.price === 0 ? "Downgrade Protocol" : "Upgrade Access"}
                </NeonButton>
              </GlassPanel>
            );
          })}
        </div>

        {/* 📊 COMPARISON TABLE (Dynamic from DB Limits) */}
        <GlassPanel className="p-0">
          <div className="p-6 border-b border-white/5 bg-white/[0.02]">
            <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
               <Cpu className="w-5 h-5 text-indigo-500" /> System Specification Comparison
            </h3>
          </div>
          
          <div className="p-6 grid md:grid-cols-2 gap-12">
             {/* We manually map specific limits to rows for clarity */}
             <div className="space-y-2">
                <DataRow label="Active Classes">
                   <div className="grid grid-cols-3 gap-4 w-48 text-center">
                      {plans.map(p => <span key={p.id} className="text-slate-400 font-mono">{p.limits.max_classes}</span>)}
                   </div>
                </DataRow>
                <DataRow label="Student Capacity">
                   <div className="grid grid-cols-3 gap-4 w-48 text-center">
                      {plans.map(p => <span key={p.id} className="text-slate-400 font-mono">{p.limits.max_students}</span>)}
                   </div>
                </DataRow>
             </div>

             <div className="space-y-2">
                <DataRow label="AI Grading Power" highlight>
                   <div className="grid grid-cols-3 gap-4 w-48 text-center">
                      {plans.map(p => (
                         <span key={p.id} className={cn("text-xs font-mono flex items-center justify-center gap-1", 
                            p.limits.ai_credits > 500 ? "text-purple-400 font-bold" : "text-slate-500"
                         )}>
                            <Zap className="w-3 h-3"/> {p.limits.ai_credits}
                         </span>
                      ))}
                   </div>
                </DataRow>
                <DataRow label="Teaching Assistants">
                   <div className="grid grid-cols-3 gap-4 w-48 text-center">
                      {plans.map(p => (
                         p.limits.has_ta 
                         ? <Check key={p.id} className="w-4 h-4 text-purple-400 mx-auto" />
                         : <X key={p.id} className="w-4 h-4 text-slate-700 mx-auto" />
                      ))}
                   </div>
                </DataRow>
             </div>
          </div>
        </GlassPanel>

      </div>
    </section>
  );
}