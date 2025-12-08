'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { 
  ChevronLeft, GraduationCap, Sparkles, Hash, 
  BookOpen, Info, Lock, ShieldAlert
} from 'lucide-react';
import { getPlanLimits } from '@/lib/constants'; // ✅ Import Central Logic

export default function CreateClassPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Logic State
  const [userRole, setUserRole] = useState<'lecturer' | 'student'>('student');
  const [isRep, setIsRep] = useState(false);
  const [canCreate, setCanCreate] = useState(false);
  const [limitDetails, setLimitDetails] = useState({ max: 0, current: 0 });

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    access_code: generateAccessCode()
  });

  useEffect(() => {
    const checkPermissions = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/login');
      
      // 1. Get Profile
      const { data: profile } = await supabase.from('users').select('role, plan_tier, is_course_rep').eq('id', user.id).single();
      
      if (!profile) {
        toast.error("Profile error");
        return router.push('/dashboard');
      }

      setUserRole(profile.role);
      setIsRep(profile.is_course_rep);

      // 2. Security: Only Lecturers or Course Reps allowed
      if (profile.role !== 'lecturer' && !profile.is_course_rep) {
        toast.error("Unauthorized Access");
        return router.push('/dashboard');
      }

      // 3. 🛡️ CRITICAL: Check Active Class Count vs Limits
      const limits = getPlanLimits(profile.role, profile.plan_tier, profile.is_course_rep);
      
      const { count } = await supabase
        .from('classes')
        .select('id', { count: 'exact', head: true })
        .eq('lecturer_id', user.id)
        .eq('status', 'active'); // Only count active classes

      const currentCount = count || 0;

      setLimitDetails({ max: limits.max_classes, current: currentCount });

      if (currentCount >= limits.max_classes) {
        setCanCreate(false); // 🔒 Lock it down
      } else {
        setCanCreate(true);
      }
      
      setLoading(false);
    };

    checkPermissions();
  }, [router]);

  function generateAccessCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Double Check at submission time
    if (!canCreate) {
      toast.error("Limit reached. Please archive a class or upgrade.");
      return;
    }
    if (!formData.name) return toast.error("Class name is required");

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Determine Type: Reps make 'cohort' classes, Lecturers make 'standard'
      const classType = isRep ? 'cohort' : 'standard';

      const { data, error } = await supabase
        .from('classes')
        .insert([{
          name: formData.name,
          lecturer_id: user.id,
          access_code: formData.access_code,
          type: classType,
          status: 'active'
        }])
        .select()
        .single();

      if (error) throw error;

      toast.success("Class created successfully!");
      
      if (userRole === 'lecturer') {
        router.push('/dashboard/lecturer-profile');
      } else {
        router.push(`/dashboard/class/${data.id}`);
      }

    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  // 🔒 PAYWALL SCREEN (If they accessed URL directly but are over limit)
  if (!canCreate) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full border border-slate-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 rounded-bl-full -mr-10 -mt-10"></div>
          
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm relative z-10">
            <Lock className="w-10 h-10 text-red-600" />
          </div>
          
          <h1 className="text-3xl font-black text-slate-900 mb-2 relative z-10">Limit Reached</h1>
          <p className="text-slate-600 mb-6 relative z-10">
            You have used <b>{limitDetails.current} / {limitDetails.max}</b> active class slots.
            <br/><br/>
            Please archive an existing class or upgrade your plan to continue creating content.
          </p>
          
          <div className="flex flex-col gap-3 relative z-10">
            {userRole === 'lecturer' && (
              <Button onClick={() => router.push('/dashboard/lecturer-profile')} className="w-full bg-linear-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all">
                Manage Classes & Upgrade
              </Button>
            )}
            <Button onClick={() => router.back()} variant="secondary" className="w-full">
              Go Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <button 
          onClick={() => router.back()} 
          className="flex items-center gap-1 text-slate-500 hover:text-slate-900 transition mb-6 font-bold text-sm"
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        
        <div className="mx-auto h-16 w-16 bg-linear-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
          <GraduationCap className="h-8 w-8 text-white" />
        </div>
        
        <h2 className="mt-6 text-center text-3xl font-black text-slate-900 tracking-tight">
          Create a New Class
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Set up a space for your students and curriculum.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl shadow-slate-200 border border-slate-100 sm:rounded-3xl sm:px-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-full -mr-10 -mt-10 opacity-50"></div>

          <form className="space-y-6 relative" onSubmit={handleSubmit}>
            
            <div>
              <label htmlFor="name" className="block text-sm font-bold text-slate-700 mb-1">
                Class Name <span className="text-red-500">*</span>
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <BookOpen className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  name="name"
                  id="name"
                  required
                  className="block w-full rounded-xl border-0 py-3 pl-10 text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 font-medium bg-slate-50 focus:bg-white transition-all"
                  placeholder="e.g. Introduction to Psychology"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="code" className="block text-sm font-bold text-slate-700">Access Code</label>
                <button 
                  type="button" 
                  onClick={() => setFormData({ ...formData, access_code: generateAccessCode() })}
                  className="text-xs text-indigo-600 font-bold hover:underline flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" /> Regenerate
                </button>
              </div>
              <div className="relative rounded-xl shadow-sm group">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Hash className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  name="code"
                  id="code"
                  required
                  readOnly 
                  className="block w-full rounded-xl border-0 py-3 pl-10 text-slate-900 ring-1 ring-inset ring-slate-300 bg-slate-100 sm:text-sm sm:leading-6 font-mono font-bold tracking-widest cursor-copy"
                  value={formData.access_code}
                />
              </div>
              <p className="mt-2 text-xs text-slate-500 flex items-center gap-1">
                <Info className="w-3 h-3" /> Students will use this code to join your class.
              </p>
            </div>

            <div>
              <label htmlFor="desc" className="block text-sm font-bold text-slate-700 mb-1">Description (Optional)</label>
              <textarea
                id="desc"
                rows={3}
                className="block w-full rounded-xl border-0 py-3 px-3 text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 bg-slate-50 focus:bg-white transition-all resize-none"
                placeholder="Briefly describe the cohort..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div>
              <Button
                type="submit"
                disabled={submitting}
                className="w-full flex justify-center py-4 rounded-xl text-sm font-bold text-white shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition-all bg-linear-to-r from-indigo-600 to-purple-600 hover:scale-[1.02]"
              >
                {submitting ? 'Creating Classroom...' : 'Create Class'}
              </Button>
            </div>

          </form>
        </div>
        
        <div className="mt-6 text-center">
           <p className="text-xs text-slate-400">
             By creating a class, you agree to our Terms of Service.
           </p>
        </div>
      </div>
    </div>
  );
}