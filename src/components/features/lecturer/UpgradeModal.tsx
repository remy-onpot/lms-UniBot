'use client';
import { useState } from 'react';
import { X, Crown, Check, Loader2, Tag } from 'lucide-react';
import { toast } from 'sonner';

interface UpgradeModalProps {
  plan: string;
  onClose: () => void;
}

export function UpgradeModal({ plan, onClose }: UpgradeModalProps) {
  const [loading, setLoading] = useState(false);
  const [coupon, setCoupon] = useState('');

  const handleUpgrade = async (targetPlan: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/payment/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            plan: targetPlan, 
            type: 'subscription',
            coupon: coupon // Send the coupon
        })
      });

      const data = await res.json();

      if (data.bypass) {
          toast.success("Testing Coupon Applied! Plan Upgraded.");
          window.location.reload(); // Refresh to see changes
      } else if (data.authorization_url) {
          window.location.href = data.authorization_url; // Redirect to Paystack
      } else {
          toast.error(data.error || "Payment failed");
      }
    } catch (e) {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative overflow-hidden">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X /></button>
        
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Crown className="w-8 h-8 text-yellow-600" />
          </div>
          <h2 className="text-2xl font-black text-slate-900">Upgrade Plan</h2>
          <p className="text-slate-500 mt-2">Unlock unlimited classes and AI grading.</p>
        </div>

        {/* Features List */}
        <div className="space-y-3 mb-6 bg-slate-50 p-4 rounded-xl">
          <div className="flex gap-3 text-sm text-slate-700">
            <Check className="w-5 h-5 text-green-600 shrink-0" />
            <span>Create <b>3+ Active Classes</b></span>
          </div>
          <div className="flex gap-3 text-sm text-slate-700">
            <Check className="w-5 h-5 text-green-600 shrink-0" />
            <span><b>300+</b> AI Graded Papers/mo</span>
          </div>
        </div>

        {/* Coupon Input */}
        <div className="mb-6 relative">
            <Tag className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
            <input 
                value={coupon}
                onChange={(e) => setCoupon(e.target.value)}
                placeholder="Have a coupon code?" 
                className="w-full pl-10 pr-4 py-2 bg-white border-2 border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500 uppercase"
            />
        </div>

        <div className="grid grid-cols-2 gap-3">
            <button 
                onClick={() => handleUpgrade('pro')}
                disabled={loading}
                className="py-3 bg-white border-2 border-indigo-600 text-indigo-700 font-bold rounded-xl hover:bg-indigo-50 transition"
            >
                Pro (₵300)
            </button>
            <button 
                onClick={() => handleUpgrade('elite')}
                disabled={loading}
                className="py-3 bg-linear-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition"
            >
                {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Elite (₵600)'}
            </button>
        </div>
      </div>
    </div>
  );
}