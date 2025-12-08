'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { 
  ChevronLeft, Check, Crown, CreditCard, ShieldCheck, 
  Zap, HelpCircle, GraduationCap, Users, Sparkles, ChevronDown 
} from 'lucide-react';
import { BUSINESS_LOGIC } from '@/lib/constants';

// --- FAQ DATA ---
const FAQS = [
  { q: "Can I cancel my subscription anytime?", a: "Yes. There are no long-term contracts. You can downgrade to the Free plan whenever you like." },
  { q: "What happens to my data if I downgrade?", a: "Your classes will be archived. You will need to choose which ones to keep active to match your new limit." },
  { q: "Is the AI Grading accurate?", a: "UniBot uses advanced LLMs (Gemini 2.5) to grade based on your specific rubric. You always have the final say to override grades." },
  { q: "Do students pay for this?", a: "No. If you have a Lecturer Subscription (Pro/Elite), your students join your classes for free." },
];

export default function BillingPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/login');
      const { data } = await supabase.from('users').select('*').eq('id', user.id).single();
      setProfile(data);
      setLoading(false);
    };
    init();
  }, [router]);

  const handleUpgrade = async (plan: string) => {
    setProcessing(plan);
    try {
      const res = await fetch('/api/payment/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, type: 'subscription' })
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

  if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>;

  const currentPlan = profile?.plan_tier || 'starter';

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-indigo-100">
      
      {/* --- HERO SECTION (Dark Mode) --- */}
      <div className="bg-slate-900 pb-32 pt-10 relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-indigo-600/20 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-[800px] h-[400px] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <button 
            onClick={() => router.back()} 
            className="flex items-center gap-2 text-slate-400 font-bold mb-10 hover:text-white transition w-fit group"
          >
            <div className="p-1 rounded-lg bg-white/5 border border-white/10 group-hover:bg-white/10 transition">
              <ChevronLeft className="w-4 h-4" />
            </div>
            Back to Console
          </button>

          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-6">
              <Sparkles className="w-3 h-3" /> Upgrade your teaching
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight mb-6 leading-tight">
              Simple pricing for <span className="text-transparent bg-clip-text bg-linear-to-r from-indigo-400 to-purple-400">modern educators.</span>
            </h1>
            <p className="text-slate-400 text-lg md:text-xl mb-10 leading-relaxed">
              Automate grading, manage unlimited cohorts, and give your students a personalized AI tutor. Cancel anytime.
            </p>

            {/* Toggle */}
            <div className="inline-flex bg-slate-800/50 p-1 rounded-xl border border-slate-700/50 backdrop-blur-sm">
              <button 
                onClick={() => setBillingCycle('monthly')}
                className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${billingCycle === 'monthly' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
              >
                Monthly
              </button>
              <button 
                onClick={() => setBillingCycle('yearly')}
                className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${billingCycle === 'yearly' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
              >
                Yearly <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full border border-green-500/30">-20%</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* --- PRICING CARDS --- */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 relative z-20 pb-20">
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          
          {/* STARTER */}
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl flex flex-col relative overflow-hidden">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-slate-900">Starter</h3>
              <p className="text-slate-500 text-sm mt-1">For testing the waters.</p>
            </div>
            <div className="mb-6">
              <span className="text-4xl font-black text-slate-900">Free</span>
            </div>
            <button 
              disabled 
              className="w-full py-3 bg-slate-100 text-slate-500 font-bold rounded-xl mb-8 cursor-not-allowed border border-slate-200"
            >
              Current Plan
            </button>
            <ul className="space-y-4 flex-1">
              <li className="flex gap-3 text-sm text-slate-600"><Check className="w-5 h-5 text-slate-400 shrink-0"/> 1 Active Class</li>
              <li className="flex gap-3 text-sm text-slate-600"><Check className="w-5 h-5 text-slate-400 shrink-0"/> 50 Students Max</li>
              <li className="flex gap-3 text-sm text-slate-600"><Check className="w-5 h-5 text-slate-400 shrink-0"/> Basic AI Chat</li>
            </ul>
          </div>

          {/* PRO (Highlighted) */}
          <div className="bg-slate-900 p-8 rounded-3xl border border-indigo-500 shadow-2xl shadow-indigo-500/20 flex flex-col relative scale-105 z-10">
            <div className="absolute top-0 inset-x-0 h-1 bg-linear-to-r from-indigo-500 to-purple-500"></div>
            <div className="mb-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-white">Pro</h3>
                  <p className="text-indigo-200 text-sm mt-1">For serious educators.</p>
                </div>
                <span className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide">Popular</span>
              </div>
            </div>
            <div className="mb-6 flex items-baseline gap-1">
              <span className="text-5xl font-black text-white">₵{billingCycle === 'monthly' ? '300' : '240'}</span>
              <span className="text-slate-400 font-medium">/mo</span>
            </div>
            <button 
              onClick={() => handleUpgrade('pro')}
              disabled={currentPlan === 'pro' || !!processing}
              className={`w-full py-4 font-bold rounded-xl mb-8 transition-all shadow-lg hover:shadow-indigo-500/25 ${
                currentPlan === 'pro' 
                ? 'bg-slate-800 text-slate-500 cursor-default' 
                : 'bg-linear-to-r from-indigo-600 to-purple-600 text-white hover:scale-[1.02]'
              }`}
            >
              {processing === 'pro' ? 'Processing...' : currentPlan === 'pro' ? 'Current Plan' : 'Upgrade to Pro'}
            </button>
            <ul className="space-y-4 flex-1">
              <li className="flex gap-3 text-sm text-white font-medium"><Check className="w-5 h-5 text-indigo-400 shrink-0"/> 3 Active Classes</li>
              <li className="flex gap-3 text-sm text-white font-medium"><Check className="w-5 h-5 text-indigo-400 shrink-0"/> 500 Students</li>
              <li className="flex gap-3 text-sm text-white font-medium"><Check className="w-5 h-5 text-indigo-400 shrink-0"/> Advanced AI Grading</li>
              <li className="flex gap-3 text-sm text-white font-medium"><Check className="w-5 h-5 text-indigo-400 shrink-0"/> Priority Email Support</li>
            </ul>
          </div>

          {/* ELITE */}
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl flex flex-col relative overflow-hidden">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-slate-900">Elite</h3>
              <p className="text-slate-500 text-sm mt-1">For departments & power users.</p>
            </div>
            <div className="mb-6 flex items-baseline gap-1">
              <span className="text-4xl font-black text-slate-900">₵{billingCycle === 'monthly' ? '600' : '480'}</span>
              <span className="text-slate-500 font-medium">/mo</span>
            </div>
            <button 
              onClick={() => handleUpgrade('elite')}
              disabled={currentPlan === 'elite' || !!processing}
              className={`w-full py-3 font-bold rounded-xl mb-8 transition-all border-2 ${
                currentPlan === 'elite'
                ? 'bg-slate-100 text-slate-400 border-transparent cursor-default'
                : 'bg-white border-slate-900 text-slate-900 hover:bg-slate-50'
              }`}
            >
              {processing === 'elite' ? 'Processing...' : currentPlan === 'elite' ? 'Current Plan' : 'Upgrade to Elite'}
            </button>
            <ul className="space-y-4 flex-1">
              <li className="flex gap-3 text-sm text-slate-600"><Check className="w-5 h-5 text-yellow-500 shrink-0"/> Unlimited Classes</li>
              <li className="flex gap-3 text-sm text-slate-600"><Check className="w-5 h-5 text-yellow-500 shrink-0"/> 2,000 Students</li>
              <li className="flex gap-3 text-sm text-slate-600"><Check className="w-5 h-5 text-yellow-500 shrink-0"/> Add Teaching Assistants</li>
              <li className="flex gap-3 text-sm text-slate-600"><Check className="w-5 h-5 text-yellow-500 shrink-0"/> Dedicated Support Agent</li>
            </ul>
          </div>

        </div>

        {/* --- TRUST & FAQ SECTION --- */}
        <div className="mt-20 grid md:grid-cols-2 gap-16">
          <div>
            <h2 className="text-2xl font-black text-slate-900 mb-6">Why upgrade?</h2>
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
                  <Zap className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">Save 10+ Hours / Week</h4>
                  <p className="text-sm text-slate-500 mt-1">Our AI grading engine handles 80% of your marking workload, letting you focus on teaching.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-green-600 shrink-0">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">Enterprise Security</h4>
                  <p className="text-sm text-slate-500 mt-1">Your data is encrypted. Payments are processed securely via Paystack. Cancel anytime.</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-black text-slate-900 mb-6">Frequently Asked Questions</h2>
            <div className="space-y-3">
              {FAQS.map((faq, i) => (
                <div 
                  key={i} 
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="border border-slate-200 rounded-xl p-4 cursor-pointer hover:border-indigo-300 transition bg-white"
                >
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-slate-700 text-sm">{faq.q}</h4>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                  </div>
                  {openFaq === i && (
                    <p className="text-sm text-slate-500 mt-2 leading-relaxed animate-in fade-in slide-in-from-top-1">
                      {faq.a}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}