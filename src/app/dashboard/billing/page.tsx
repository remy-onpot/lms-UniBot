'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ChevronLeft, ChevronDown, Sparkles, HelpCircle } from 'lucide-react';

// ✅ Import the Logic Component
import { PricingTable, SubscriptionPlan } from '@/components/features/billing/PricingTable';

// ✅ Import the "Skin" Components (To make the Page look like the Table)
import { GlassPanel, TechBadge } from '@/components/ui/PricingUI'; 

const FAQS = [
  { q: "Can I cancel my subscription anytime?", a: "Yes. There are no long-term contracts. You can downgrade to the Free plan whenever you like." },
  { q: "What happens to my data if I downgrade?", a: "Your classes will be archived. You will need to choose which ones to keep active to match your new limit." },
  { q: "Is the AI Grading accurate?", a: "UniBot uses advanced LLMs (Gemini 2.5) to grade based on your specific rubric. You always have the final say to override grades." },
  { q: "Do students pay for this?", a: "No. If you have a Lecturer Subscription (Pro/Elite), your students join your classes for free." },
];

export default function BillingPage() {
  const router = useRouter();
  
  // State
  const [profile, setProfile] = useState<any>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Init Data Fetching
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/login');

      // 1. Fetch User Profile
      const { data: userProfile } = await supabase.from('users').select('*').eq('id', user.id).single();
      setProfile(userProfile);

      // 2. Fetch Plans from DB
      const { data: dbPlans } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (dbPlans) setPlans(dbPlans);
      
      setLoading(false);
    };
    init();
  }, [router]);

  // Handle Upgrade
  const handleUpgrade = async (planId: string) => {
    setProcessing(planId);
    try {
      // Logic mapping (Fixed -> Seat count)
      let seats = 0;
      if (planId === 'pro') seats = 30;
      if (planId === 'elite') seats = 100;

      const res = await fetch('/api/payment/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            plan: planId, 
            type: 'subscription',
            seats: seats
        })
      });
      
      const data = await res.json();
      
      if (data.bypass) {
        toast.success("Testing Coupon Applied! Plan Upgraded.");
        window.location.reload();
      } else if (data.authorization_url) {
        window.location.href = data.authorization_url;
      } else {
        toast.error(data.error || "Payment failed");
      }
    } catch (e) { 
      toast.error("Connection error"); 
    } finally { 
      setProcessing(null); 
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 font-sans selection:bg-indigo-500/30 overflow-x-hidden">
      
      {/* 🌌 Background Ambience (Global) */}
      <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-indigo-600/10 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-600/5 rounded-full blur-[100px]" />
      </div>

      {/* --- HERO SECTION --- */}
      <div className="pt-16 pb-10 relative z-10">
        <div className="max-w-7xl mx-auto px-4">
          <button 
            onClick={() => router.back()} 
            className="flex items-center gap-2 text-slate-500 font-bold mb-10 hover:text-white transition w-fit group"
          >
            <div className="p-1 rounded-lg bg-white/5 border border-white/10 group-hover:bg-white/10 transition">
              <ChevronLeft className="w-4 h-4" />
            </div>
            Back to Console
          </button>

          <div className="text-center max-w-3xl mx-auto">
            <div className="mb-6 flex justify-center">
               <TechBadge>
                  <Sparkles className="w-3 h-3 mr-2" /> Upgrade your teaching
               </TechBadge>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter mb-8 leading-[0.9]">
              Simple pricing for <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-400 animate-gradient-x">
                modern educators.
              </span>
            </h1>
            
            <p className="text-slate-400 text-lg md:text-xl mb-4 leading-relaxed max-w-2xl mx-auto">
              Automate grading, manage unlimited cohorts, and give your students a personalized AI tutor.
            </p>
          </div>
        </div>
      </div>

      {/* --- PRICING TABLE COMPONENT (The "Brain") --- */}
      <PricingTable 
        plans={plans} 
        currentPlan={profile?.plan_tier || 'starter'} 
        onUpgrade={handleUpgrade} 
        processing={processing}
      />

      {/* --- FAQ SECTION (Now using GlassPanel) --- */}
      <div className="max-w-3xl mx-auto px-4 pb-32 relative z-10">
        <div className="text-center mb-12">
            <h2 className="text-3xl font-black text-white tracking-tight flex items-center justify-center gap-3">
               <HelpCircle className="w-8 h-8 text-slate-600" /> Frequently Asked Questions
            </h2>
        </div>

        <div className="grid gap-4">
            {FAQS.map((faq, i) => (
                <GlassPanel 
                    key={i} 
                    className={`cursor-pointer transition-all duration-300 ${openFaq === i ? 'bg-indigo-900/20 border-indigo-500/30' : ''}`}
                >
                    <div 
                       className="p-6 flex justify-between items-center"
                       onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    >
                        <h4 className={`font-bold transition-colors ${openFaq === i ? 'text-indigo-300' : 'text-slate-300'}`}>
                           {faq.q}
                        </h4>
                        <ChevronDown className={`w-5 h-5 text-slate-500 transition-transform duration-300 ${openFaq === i ? 'rotate-180 text-indigo-400' : ''}`} />
                    </div>
                    
                    {/* Expandable Content */}
                    <div className={`overflow-hidden transition-all duration-300 ${openFaq === i ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
                        <div className="px-6 pb-6 text-slate-400 text-sm leading-relaxed border-t border-white/5 pt-4">
                           {faq.a}
                        </div>
                    </div>
                </GlassPanel>
            ))}
        </div>
      </div>

    </div>
  );
}