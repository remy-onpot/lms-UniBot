'use client';
import { useState, useEffect } from 'react';
import { X, Lock, CheckCircle, Sparkles, Layers, Loader2, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { getAppConfigAction, calculatePriceAction } from '@/app/actions';

interface CoursePaywallModalProps {
  courseName: string;
  courseId: string;
  classId: string; 
  onClose: () => void;
}

export function CoursePaywallModal({ courseName, courseId, classId, onClose }: CoursePaywallModalProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [bundlePrice, setBundlePrice] = useState(0);
  const [singlePrice, setSinglePrice] = useState(0);
  const [flashSale, setFlashSale] = useState(false);

  useEffect(() => {
    const initPrices = async () => {
      // 1. Get Config
      const config = await getAppConfigAction();
      setFlashSale(!!config.PRICING.FLASH_SALE_ACTIVE);
      setSinglePrice(config.PRICING.SINGLE_COURSE);

      // 2. Calculate Bundle
      const { data: courses } = await supabase
        .from('courses')
        .select('id')
        .eq('class_id', classId)
        .eq('status', 'active');
        
      if (courses) {
        const price = await calculatePriceAction('bundle', courses.map(c => c.id));
        setBundlePrice(price);
      }
    };
    initPrices();
  }, [classId]);

  const handlePayment = async (type: 'single' | 'bundle') => {
    setLoading(type);
    try {
      const res = await fetch('/api/payment/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'class_unlock',
          plan: type === 'single' ? courseId : classId,
          accessType: type 
        })
      });

      const data = await res.json();

      if (data.bypass) {
        toast.success("Access Granted! Reloading...");
        window.location.reload();
      } else if (data.authorization_url) {
        window.location.href = data.authorization_url;
      } else {
        toast.error("Payment initialization failed");
      }
    } catch (e) {
      toast.error("Network error");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl p-0 w-full max-w-lg shadow-2xl relative overflow-hidden">
        
        {/* Header */}
        <div className="bg-slate-900 p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500 rounded-full blur-[50px] opacity-20"></div>
          <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white transition"><X /></button>
          
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm border border-white/10">
            <Lock className="w-8 h-8 text-indigo-300" />
          </div>
          <h2 className="text-2xl font-black text-white">Unlock {courseName}</h2>
          <p className="text-slate-400 mt-2 text-sm">
             Your free trial has ended. Unlock this course to continue learning.
          </p>
        </div>

        {/* Body */}
        <div className="p-8 space-y-6">
          
          {/* Flash Sale Banner */}
          {flashSale && (
             <div className="bg-yellow-50 text-yellow-800 text-xs font-bold p-2 text-center rounded-lg flex items-center justify-center gap-2">
                <Zap className="w-3 h-3 text-yellow-600" fill="currentColor"/>
                Flash Sale Active! Prices reduced for limited time.
             </div>
          )}

          {/* Option 1: Single Course */}
          <div className="p-5 border-2 border-slate-100 rounded-2xl hover:border-indigo-100 transition-all relative group">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 rounded-lg text-slate-600"><Layers className="w-5 h-5"/></div>
                <div>
                  <h3 className="font-bold text-slate-900">Single Course</h3>
                  <p className="text-xs text-slate-500">Access to {courseName} only</p>
                </div>
              </div>
              <span className="text-xl font-black text-slate-900">₵{singlePrice}</span>
            </div>
            <Button 
              onClick={() => handlePayment('single')}
              disabled={!!loading}
              className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition"
            >
              {loading === 'single' ? <Loader2 className="w-4 h-4 animate-spin"/> : 'Unlock This Course'}
            </Button>
          </div>

          {/* Option 2: Bundle (Upsell) */}
          <div className="p-1 rounded-2xl bg-linear-to-r from-indigo-500 to-purple-600 relative shadow-lg transform hover:scale-[1.02] transition-transform">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-400 text-slate-900 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
              Best Value • Save Big
            </div>
            <div className="bg-white rounded-xl p-5">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600"><Sparkles className="w-5 h-5"/></div>
                  <div>
                    <h3 className="font-bold text-slate-900">Semester Bundle</h3>
                    <p className="text-xs text-slate-500">Unlock ALL courses in this class</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xl font-black text-indigo-600">₵{bundlePrice}</span>
                </div>
              </div>
              <ul className="space-y-2 mb-4">
                <li className="flex gap-2 text-xs text-slate-600 font-medium"><CheckCircle className="w-4 h-4 text-green-500"/> Unlimited AI Quiz Attempts</li>
                <li className="flex gap-2 text-xs text-slate-600 font-medium"><CheckCircle className="w-4 h-4 text-green-500"/> AI Past Question Solver (Premium)</li>
              </ul>
              <Button 
                onClick={() => handlePayment('bundle')}
                disabled={!!loading}
                className="w-full bg-linear-to-r from-indigo-600 to-purple-600 text-white font-bold py-3 rounded-xl shadow-md hover:shadow-lg transition"
              >
                {loading === 'bundle' ? <Loader2 className="w-4 h-4 animate-spin"/> : 'Get The Bundle'}
              </Button>
            </div>
          </div>

        </div>
        
        <div className="bg-slate-50 p-4 text-center text-xs text-slate-400 border-t border-slate-100">
          Secured by Paystack. One-time payment, no subscription.
        </div>
      </div>
    </div>
  );
}