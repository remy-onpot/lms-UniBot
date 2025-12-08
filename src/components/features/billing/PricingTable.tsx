'use client';
import * as React from "react";
import { Button } from "@/components/ui/Button"; // Using your existing button
import { cn } from "@/lib/utils";
import { Check, ArrowRight, Loader2 } from "lucide-react";
import { BUSINESS_LOGIC, PlanType } from "@/lib/constants";

export function PricingTable({ currentPlan, onUpgrade, processing }: { 
  currentPlan: string, 
  onUpgrade: (plan: string) => void,
  processing: string | null 
}) {
  const [isYearly, setIsYearly] = React.useState(false);

  // Transform your BUSINESS_LOGIC into the array format the UI expects
  const plans = Object.entries(BUSINESS_LOGIC.PLANS).map(([key, plan]) => ({
    key: key as PlanType,
    name: plan.label,
    price: {
      monthly: plan.price,
      yearly: Math.round(plan.price * 12 * 0.8) // Simulated 20% discount
    },
    features: plan.features,
    popular: key === 'pro'
  }));

  // Feature Comparison List (Derived from your logic)
  const allFeatures = [
    { name: "Active Classes", starter: "1", pro: "3", elite: "Unlimited" },
    { name: "Students per Class", starter: "50", pro: "500", elite: "2000" },
    { name: "AI Grading Credits", starter: "50/mo", pro: "300/mo", elite: "Unlimited" },
    { name: "TA / Co-Lecturer", starter: false, pro: false, elite: true },
    { name: "Priority Support", starter: false, pro: true, elite: true },
  ];

  return (
    <section className="bg-slate-50 py-12">
      <div className="max-w-7xl mx-auto px-4">
        
        {/* Toggle */}
        <div className="flex justify-center mb-10">
          <div className="bg-white p-1 rounded-xl border border-slate-200 inline-flex shadow-sm">
            <button
              onClick={() => setIsYearly(false)}
              className={cn(
                "px-6 py-2.5 rounded-lg text-sm font-bold transition-all",
                !isYearly ? "bg-slate-900 text-white shadow-md" : "text-slate-500 hover:bg-slate-50"
              )}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsYearly(true)}
              className={cn(
                "px-6 py-2.5 rounded-lg text-sm font-bold transition-all",
                isYearly ? "bg-slate-900 text-white shadow-md" : "text-slate-500 hover:bg-slate-50"
              )}
            >
              Yearly <span className="ml-1 text-[10px] text-green-600 bg-green-100 px-1.5 py-0.5 rounded font-extrabold">-20%</span>
            </button>
          </div>
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {plans.map((plan) => {
            const isCurrent = currentPlan === plan.key;
            return (
              <div 
                key={plan.key}
                className={cn(
                  "flex flex-col p-8 rounded-3xl transition-all duration-300 relative",
                  plan.popular ? "bg-white border-2 border-indigo-500 shadow-xl scale-105 z-10" : "bg-white border border-slate-200 shadow-sm opacity-90 hover:opacity-100 hover:scale-[1.02]"
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-linear-to-r from-indigo-600 to-purple-600 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg">
                    Most Popular
                  </div>
                )}

                <h3 className="text-xl font-bold text-slate-900 mb-2">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-black text-slate-900">
                    ₵{isYearly ? (plan.price.yearly / 12).toFixed(0) : plan.price.monthly}
                  </span>
                  <span className="text-slate-500 font-medium">/mo</span>
                </div>
                {isYearly && <p className="text-xs text-slate-400 -mt-4 mb-4 font-medium">Billed ₵{plan.price.yearly} yearly</p>}

                <Button
                  onClick={() => onUpgrade(plan.key)}
                  disabled={isCurrent || !!processing}
                  variant={plan.popular ? 'primary' : 'outline'}
                  className={cn("w-full py-6 rounded-xl font-bold mb-8", isCurrent && "bg-slate-100 text-slate-400 border-none cursor-default")}
                >
                  {processing === plan.key ? <Loader2 className="w-5 h-5 animate-spin" /> : 
                   isCurrent ? "Current Plan" : 
                   plan.key === 'starter' ? "Downgrade" : "Upgrade"}
                </Button>

                <ul className="space-y-4 text-sm text-slate-600">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex gap-3">
                      <Check className="w-5 h-5 text-green-500 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Comparison Table */}
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-6 bg-slate-50 border-b border-slate-200">
            <h3 className="text-lg font-bold text-slate-900">Feature Comparison</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="p-4 pl-6 font-medium">Features</th>
                  <th className="p-4 text-center font-bold text-slate-900">Starter</th>
                  <th className="p-4 text-center font-bold text-indigo-600">Pro</th>
                  <th className="p-4 text-center font-bold text-purple-600">Elite</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allFeatures.map((feat, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition">
                    <td className="p-4 pl-6 font-medium text-slate-900">{feat.name}</td>
                    <td className="p-4 text-center">{renderValue(feat.starter)}</td>
                    <td className="p-4 text-center">{renderValue(feat.pro)}</td>
                    <td className="p-4 text-center">{renderValue(feat.elite)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </section>
  );
}

function renderValue(val: string | boolean) {
  if (typeof val === 'boolean') {
    return val ? <Check className="w-5 h-5 text-green-500 mx-auto" /> : <span className="text-slate-300">-</span>;
  }
  return <span className="font-bold">{val}</span>;
}