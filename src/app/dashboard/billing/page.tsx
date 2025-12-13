'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ChevronLeft, Check, Sparkles } from 'lucide-react';
import { UserProfile } from '@/types';

export default function BillingPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

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
    try {
      const res = await fetch('/api/payment/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            plan, 
            type: 'subscription',
            cycle: billingCycle 
        })
      });
      const data = await res.json();
      
      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      } else {
        toast.error("Failed to start payment");
      }
    } catch (e) { 
      toast.error("Connection error"); 
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <div className="bg-slate-900 pb-20 pt-10 px-6">
         {/* ... (Keep your Hero UI) ... */}
         <div className="flex justify-center gap-4 mb-10">
            <button onClick={() => setBillingCycle('monthly')} className={`text-white ${billingCycle === 'monthly' ? 'font-bold' : 'opacity-50'}`}>Monthly</button>
            <button onClick={() => setBillingCycle('yearly')} className={`text-white ${billingCycle === 'yearly' ? 'font-bold' : 'opacity-50'}`}>Yearly (-20%)</button>
         </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 -mt-10 grid md:grid-cols-3 gap-6">
          {/* Card Example: Pro */}
          <div className="bg-slate-900 p-8 rounded-3xl border border-indigo-500 shadow-2xl relative">
             <h3 className="text-xl font-bold text-white">Pro Plan</h3>
             <div className="my-4 text-4xl font-black text-white">
                ₵{billingCycle === 'monthly' ? '300' : '240'}<span className="text-lg text-slate-400">/mo</span>
             </div>
             <button 
                onClick={() => handleUpgrade('pro')}
                disabled={profile?.plan_tier === 'pro'}
                className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50"
             >
                {profile?.plan_tier === 'pro' ? 'Current Plan' : 'Upgrade'}
             </button>
          </div>
          {/* Repeat for other cards using PLANS constant values */}
      </div>
    </div>
  );
}