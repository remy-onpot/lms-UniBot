'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { 
  ChevronLeft, Lock, Unlock, Sparkles, 
  CheckCircle, ShieldCheck, Loader2, Zap 
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { getAppConfigAction, calculatePriceAction } from '@/app/actions';

interface CourseItem {
  id: string;
  title: string;
  isUnlocked: boolean;
  unlockReason: 'bundle' | 'single' | null;
  price: number;
}

interface ClassGroup {
  id: string;
  name: string;
  code: string;
  courses: CourseItem[];
  bundlePrice: number;
  totalSinglePrice: number;
  isFullyUnlocked: boolean; 
  expiresAt?: string;
}

export default function StudentBillingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [processing, setProcessing] = useState<string | null>(null);
  const [flashSale, setFlashSale] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // 1. Fetch Dynamic Config & User
      const [config, { data: { user } }] = await Promise.all([
        getAppConfigAction(),
        supabase.auth.getUser()
      ]);

      if (!user) return router.push('/login');
      setFlashSale(!!config.PRICING.FLASH_SALE_ACTIVE);

      // 2. Get Data
      const { data: enrollments } = await supabase
        .from('class_enrollments')
        .select('class:classes(id, name, access_code)')
        .eq('student_id', user.id);
        
      if (!enrollments) {
          setLoading(false);
          return;
      }

      const now = new Date().toISOString();
      const { data: access } = await supabase
        .from('student_course_access')
        .select('course_id, class_id, expires_at')
        .eq('student_id', user.id)
        .gt('expires_at', now); 

      const unlockedCourseIds = new Set(access?.map(a => a.course_id).filter(Boolean));
      const unlockedClassIds = new Set(access?.map(a => a.class_id).filter(Boolean));
      const expiryMap = new Map<string, string>();
      access?.forEach(a => a.class_id && expiryMap.set(a.class_id, a.expires_at));

      const groups: ClassGroup[] = [];

      for (const enr of enrollments) {
        const classData = Array.isArray(enr.class) ? enr.class[0] : enr.class;
        if (!classData) continue;

        const { data: courses } = await supabase
            .from('courses')
            .select('id, title')
            .eq('class_id', classData.id)
            .eq('status', 'active');

        if (!courses || courses.length === 0) continue;

        const isBundleActive = unlockedClassIds.has(classData.id);
        
        // Calculate Dynamic Prices
        const singlePrice = config.PRICING.SINGLE_COURSE;
        const totalSingle = singlePrice * courses.length;
        
        // Use Server Action to get exact bundle price (handles discounts/sales)
        const bundlePrice = await calculatePriceAction('bundle', courses.map(c => c.id));

        const courseItems: CourseItem[] = courses.map(c => {
            const isSingleActive = unlockedCourseIds.has(c.id);
            return {
                id: c.id,
                title: c.title,
                isUnlocked: isBundleActive || isSingleActive,
                unlockReason: isBundleActive ? 'bundle' : isSingleActive ? 'single' : null,
                price: singlePrice
            };
        });

        groups.push({
          id: classData.id,
          name: classData.name,
          code: classData.access_code,
          courses: courseItems,
          bundlePrice,
          totalSinglePrice: totalSingle,
          isFullyUnlocked: courseItems.every(c => c.isUnlocked), 
          expiresAt: expiryMap.get(classData.id)
        });
      }

      setClasses(groups);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load billing info");
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async (targetId: string, type: 'single' | 'bundle') => {
    setProcessing(targetId);
    try {
      const res = await fetch('/api/payment/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'class_unlock',
          plan: targetId, 
          accessType: type
        })
      });

      const data = await res.json();
      
      if (data.bypass) {
        toast.success("Access Verified! Updating...");
        await fetchData(); 
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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24">
      {/* 🇬🇭 Flash Sale Banner */}
      {flashSale && (
        <div className="bg-yellow-400 py-2 px-4 text-center font-black text-slate-900 text-xs md:text-sm shadow-sm animate-pulse">
           ⚡ FLASH SALE ACTIVE: PRICES SLASHED FOR EXAM WEEK! ⚡
        </div>
      )}

      <div className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-full transition">
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>
          <h1 className="text-lg font-black text-slate-900">My Course Access</h1>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {classes.length === 0 && (
          <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
             <p className="text-slate-400 font-medium">No classes found.</p>
             <button onClick={() => router.push('/dashboard')} className="text-indigo-600 font-bold text-sm mt-2 hover:underline">
                Go to Dashboard
             </button>
          </div>
        )}

        {classes.map((cls) => (
          <div key={cls.id} className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
             
             <div className="bg-slate-900 p-6 md:p-8 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full blur-3xl -mr-20 -mt-20 opacity-20"></div>
                
                <div className="relative z-10">
                   <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-2xl font-black tracking-tight">{cls.name}</h3>
                      {cls.isFullyUnlocked && (
                         <span className="bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                            <CheckCircle className="w-3 h-3" /> FULLY UNLOCKED
                         </span>
                      )}
                   </div>
                   <p className="text-slate-400 text-sm font-mono">{cls.code}</p>
                   {cls.expiresAt && (
                       <p className="text-xs text-indigo-300 mt-2 font-medium">
                           Access Valid Until: {new Date(cls.expiresAt).toLocaleDateString()}
                       </p>
                   )}
                </div>
                
                {!cls.isFullyUnlocked && (
                  <div className="relative z-10 flex flex-col items-end w-full md:w-auto bg-white/5 p-4 rounded-2xl backdrop-blur-sm border border-white/10">
                     <div className="flex items-center gap-2 mb-3">
                        <span className="text-slate-400 line-through text-sm">₵{cls.totalSinglePrice}</span>
                        <span className="text-3xl font-black text-yellow-400">₵{cls.bundlePrice}</span>
                     </div>
                     <Button 
                       onClick={() => handlePayment(cls.id, 'bundle')} 
                       disabled={!!processing} 
                       className="w-full md:w-auto bg-linear-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white border-0 shadow-lg shadow-indigo-500/30 font-bold"
                     >
                        {processing === cls.id ? <Loader2 className="w-4 h-4 animate-spin"/> : <Sparkles className="w-4 h-4 mr-2"/>} 
                        Unlock Semester Bundle
                     </Button>
                     {flashSale ? (
                         <p className="text-[10px] text-yellow-300 mt-2 font-bold text-center w-full animate-pulse">🔥 FLASH SALE APPLIED</p>
                     ) : (
                         <p className="text-[10px] text-green-400 mt-2 font-bold text-center w-full">Save ~25% instantly</p>
                     )}
                  </div>
                )}
             </div>

             <div className="p-6 md:p-8 grid md:grid-cols-2 gap-4 bg-slate-50/50">
                {cls.courses.map(course => (
                  <div 
                    key={course.id} 
                    className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                       course.isUnlocked 
                         ? 'border-green-200 bg-green-50/40' 
                         : 'border-white bg-white shadow-sm hover:border-indigo-100'
                    }`}
                  >
                     <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl ${course.isUnlocked ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                           {course.isUnlocked ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                        </div>
                        <div>
                           <p className={`font-bold text-sm ${course.isUnlocked ? 'text-green-900' : 'text-slate-700'}`}>{course.title}</p>
                           {course.isUnlocked ? (
                               <p className="text-[10px] font-medium text-green-600">Active</p>
                           ) : (
                               <p className="text-[10px] font-medium text-slate-500">Trial Active</p>
                           )}
                        </div>
                     </div>

                     {!course.isUnlocked && (
                        <button 
                          onClick={() => handlePayment(course.id, 'single')} 
                          disabled={!!processing} 
                          className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 hover:border-slate-300 transition shadow-sm"
                        >
                           {processing === course.id ? '...' : `Unlock ₵${course.price}`}
                        </button>
                     )}
                  </div>
                ))}
             </div>
          </div>
        ))}

        <div className="text-center pt-8 border-t border-slate-200">
           <div className="inline-flex items-center gap-2 text-slate-400 text-sm bg-white px-4 py-2 rounded-full border border-slate-100 shadow-sm">
              <ShieldCheck className="w-4 h-4" /> Secure payments via Paystack
           </div>
        </div>

      </div>
    </div>
  );
}