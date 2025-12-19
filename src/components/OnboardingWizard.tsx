'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { PRICING, PLANS } from '@/lib/constants';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { UniBotMascot, MascotEmotion, MascotAction } from '@/components/ui/UniBotMascot';
import { Check, School, Hash, Crown, ChevronRight, Sparkles, Building2, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface WizardProps {
  userId: string;
  role: 'lecturer' | 'student';
  isCourseRep: boolean;
  onComplete: () => void;
}

const INTERESTS_LIST = [
  "Technology 💻", "Business 💼", "Art & Design 🎨", "History 📜",
  "Science 🧬", "Literature 📚", "Sports 🏀", "Music 🎵",
  "Psychology 🧠", "Economics 📈", "Coding 👨‍💻", "Current Events 🌍"
];

export default function OnboardingWizard({ userId, role, isCourseRep, onComplete }: WizardProps) {
  // --- STATE ---
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [universities, setUniversities] = useState<any[]>([]);
  
  // Mascot State
  const [emotion, setEmotion] = useState<MascotEmotion>('idle');
  const [action, setAction] = useState<MascotAction>('wave');

  // Form Data
  const [studentProfile, setStudentProfile] = useState({
    university_id: '',
    custom_university: '',
    student_id_code: '',
    isOtherUni: false
  });

  // ✅ UPDATED LECTURER DATA
  const [lecturerData, setLecturerData] = useState({
    type: '' as 'university' | 'private' | '', // New field
    classCount: '1',
    studentCount: '50',
    hasTAs: 'no',
    selectedTier: 'starter'
  });

  const [repData, setRepData] = useState({
    cohortName: '',
    courseCount: '6',
    approxStudents: '50'
  });

  const [studentInterests, setStudentInterests] = useState<string[]>([]);
  
  // Determine Total Steps based on Role
  // Lecturer now has 5 steps (Type -> Classes -> Students -> TAs -> Pricing)
  const totalSteps = role === 'lecturer' ? 5 : (isCourseRep ? 5 : 2);

  // --- INIT ---
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    
    const fetchUnis = async () => {
      const { data } = await supabase.from('universities').select('id, name, abbreviation').eq('is_active', true).order('name');
      if (data) setUniversities(data);
    };
    fetchUnis();
    
    setTimeout(() => { setEmotion('happy'); setAction('wave'); }, 500);

    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  // Update Mascot based on step/role
  useEffect(() => {
    if (step === 1) setEmotion('happy');
    // Student logic
    if (role === 'student' && step === 2) { setEmotion('thinking'); setAction('none'); }
    // Rep Logic
    if (isCourseRep) {
       if (step === 3) { setEmotion('cool'); setAction('none'); }
       if (step === 4) { setEmotion('surprised'); }
       if (step === 5) { setEmotion('happy'); setAction('dance'); }
    }
    // Lecturer Logic
    if (role === 'lecturer' && step === 5) { setEmotion('happy'); setAction('dance'); }
  }, [step, isCourseRep, role]);

  // --- LOGIC ---

  const saveProfileData = async (extraUpdates = {}) => {
    const updates: any = {
      onboarding_completed: true,
      interests: studentInterests,
      student_id_code: studentProfile.student_id_code,
      ...extraUpdates
    };

    if (studentProfile.isOtherUni) {
      updates.custom_university = studentProfile.custom_university;
      updates.university_id = null;
    } else {
      updates.university_id = studentProfile.university_id;
      updates.custom_university = null;
    }

    const { error } = await supabase.from('users').update(updates).eq('id', userId);
    if (error) throw error;
  };

  const handleStudentNext = async () => {
    if (step === 1) {
      if (!studentProfile.university_id && !studentProfile.custom_university) return toast.error("Please select your University.");
      if (!studentProfile.student_id_code) return toast.error("Student ID is required.");
      setStep(s => s + 1);
      return;
    }

    if (step === 2) {
      if (studentInterests.length < 3) return toast.error("Please pick at least 3 interests.");
      if (isCourseRep) {
        setStep(s => s + 1);
      } else {
        await handleFinalizeStudent();
      }
    }
  };

  const handleFinalizeStudent = async () => {
    setLoading(true);
    setEmotion('thinking');
    try {
      await saveProfileData();
      setEmotion('happy');
      setAction('backflip');
      setTimeout(onComplete, 1000);
    } catch (e: any) {
      toast.error(e.message);
      setLoading(false);
    }
  };

  const handleRepNext = () => {
    if (step === 3 && !repData.cohortName) return toast.error("Enter a cohort name.");
    setStep(s => s + 1);
  };

  const handleFinalizeRep = async () => {
    setLoading(true);
    try {
        await saveProfileData({ is_course_rep: true });
        await createCohortClass();
    } catch (e: any) {
        toast.error(e.message);
        setLoading(false);
    }
  };

  const createCohortClass = async () => {
    const prefix = repData.cohortName.substring(0, 3).toUpperCase();
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const accessCode = `${prefix}-${randomNum}`;
  
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('Not authenticated.');
  
      // Verify user is course rep
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('role, is_course_rep')
        .eq('id', userId)
        .single();
  
      if (profileError || !userProfile.is_course_rep) throw new Error('You must be a course rep.');
  
      const classData = {
        name: repData.cohortName,
        description: `Cohort for ${repData.approxStudents} students`,
        access_code: accessCode,
        owner_id: userId,
        course_count: parseInt(repData.courseCount),
        type: 'cohort', 
        status: 'active',
        access_price: Math.round(parseInt(repData.courseCount) * PRICING.SINGLE_COURSE * (1 - PRICING.BUNDLE_DISCOUNT))
      };
  
      const { error: classError } = await supabase.from('classes').insert([classData]);
      if (classError) throw classError;
  
      toast.success(`🎉 Cohort Created! Share code: ${accessCode}`);
      setEmotion('happy');
      setAction('backflip');
      setTimeout(onComplete, 1500);
  
    } catch (e: any) {
      toast.error(e.message || 'Failed to create cohort');
      throw e;
    }
  };

  // --- LECTURER FLOW LOGIC ---
  const handleLecturerNext = () => {
    // Step 1: Type is handled in the UI onClick
    // Step 2, 3: handled by button click in UI or direct setStep
    if (step === 4) {
      // Calculate Recommendation
      let recommended = 'starter';
      const count = parseInt(lecturerData.studentCount);
      
      // If Private lecturer with many students, recommend Pro/Elite
      if (lecturerData.type === 'private') {
          if (count > 500 || lecturerData.hasTAs === 'yes') recommended = 'elite';
          else if (count > 50) recommended = 'pro';
      } 
      // Note: If University, we might default to Starter or Enterprise, 
      // but logic here defaults to starter unless logic changes.
      
      setLecturerData({ ...lecturerData, selectedTier: recommended });
      setEmotion('cool');
    }
    setStep(s => s + 1);
  };

  // ✅ FINAL PAYMENT/ACTIVATION LOGIC
  const handleFinalizeLecturer = async () => {
    setLoading(true);

    try {
        // 1. Update Profile (Always do this first)
        const { error } = await supabase
        .from('users')
        .update({ 
            onboarding_completed: true, 
            plan_tier: lecturerData.selectedTier,
            // You might want to save the lecturer type in metadata or a column
            // raw_user_meta_data: { lecturer_type: lecturerData.type } 
        })
        .eq('id', userId);

        if (error) throw error;

        // 2. Decide: Finish or Pay?
        if (lecturerData.selectedTier === 'starter') {
            // FREE TIER -> Finish Immediately
            setEmotion('happy');
            setAction('backflip');
            toast.success("Profile Setup Complete!");
            setTimeout(onComplete, 1000);
        } else {
            // PAID TIER -> Redirect to Payment
            // Replace '/checkout' with your actual payment route
            toast.loading("Redirecting to secure payment...");
            
            // Wait a moment for UX then redirect
            setTimeout(() => {
                // Pass plan param so checkout knows what to charge
                window.location.href = `/checkout?plan=${lecturerData.selectedTier}`; 
            }, 1000);
        }
    } catch (e: any) {
        toast.error(e.message);
        setLoading(false);
    }
  };

  // --- UI HELPERS ---
  const tiers = {
    starter: { name: PLANS.starter.name, price: PLANS.starter.price },
    pro: { name: PLANS.pro.name, price: PLANS.pro.price },
    elite: { name: PLANS.elite.name, price: PLANS.elite.price }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-5xl grid lg:grid-cols-2 bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-4xl shadow-2xl overflow-hidden max-h-[90vh]">
        
        {/* 🎭 LEFT: MASCOT STAGE */}
        <div className="hidden lg:flex flex-col items-center justify-center bg-linear-to-br from-indigo-600 via-purple-600 to-slate-900 relative p-12 overflow-hidden text-white">
          <div className="absolute top-0 left-0 w-full h-full opacity-30">
             <div className="absolute top-10 right-10 w-64 h-64 bg-purple-500 rounded-full blur-3xl animate-pulse" />
             <div className="absolute bottom-10 left-10 w-64 h-64 bg-blue-500 rounded-full blur-3xl animate-pulse delay-1000" />
          </div>

          <div className="relative z-10 transform scale-125 transition-all duration-500 hover:scale-130">
            <UniBotMascot size={280} emotion={emotion} action={action} />
          </div>
          
          <div className="relative z-10 text-center mt-10 space-y-2">
            <h2 className="text-3xl font-black tracking-tight drop-shadow-lg">
              {role === 'lecturer' ? "Class Setup" : "Welcome aboard!"}
            </h2>
            <p className="text-indigo-100 font-medium text-lg max-w-xs mx-auto drop-shadow-md">
              {step <= 2 && role === 'student' ? "Let's personalize your learning experience." : 
               isCourseRep ? "Building your cohort's digital HQ." : 
               "Configuring your teaching environment."}
            </p>
          </div>
        </div>

        {/* 📝 RIGHT: FORM WIZARD */}
        <div className="flex flex-col h-full relative">
          
          {/* Header */}
          <div className="px-8 pt-8 pb-4 shrink-0 border-b border-white/5">
             <div className="flex items-center gap-2 mb-2">
                <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                   Step {step} of {totalSteps}
                </span>
                {isCourseRep && <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-3 py-1 rounded-full text-xs font-bold uppercase">Course Rep</span>}
             </div>
             <h1 className="text-3xl font-bold text-white">
               {step <= 2 && role === 'student' ? 'Student Profile' : 
                role === 'lecturer' ? 'Teaching Profile' : 
                'Cohort Setup'}
             </h1>
             <p className="text-slate-400 font-medium">
               {step === 1 && role === 'lecturer' ? 'Select your teaching category.' : 
                step === 1 ? 'Start by verifying your academic details.' : 
                'Please fill in the details below.'}
             </p>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-8 py-6 custom-scrollbar">
            
            {/* ========================================================= */}
            {/* STUDENT & COURSE REP FLOW                                 */}
            {/* ========================================================= */}
            {role === 'student' && (
              <div className="space-y-6 max-w-md mx-auto py-2">
                
                {/* STEP 1: Uni & ID */}
                {step === 1 && (
                  <div className="space-y-5 animate-in slide-in-from-right-8 fade-in">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-300 flex items-center gap-2">
                         <School className="w-4 h-4 text-indigo-400" /> Select University
                      </label>
                      <select 
                        className="flex h-12 w-full items-center justify-between rounded-xl border border-white/10 bg-slate-800 text-white px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={studentProfile.isOtherUni ? 'other' : studentProfile.university_id}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'other') setStudentProfile({ ...studentProfile, isOtherUni: true, university_id: '' });
                          else setStudentProfile({ ...studentProfile, isOtherUni: false, university_id: val, custom_university: '' });
                        }}
                      >
                        <option value="" disabled className="text-slate-500">-- Choose Institution --</option>
                        {universities.map(u => <option key={u.id} value={u.id} className="text-slate-900">{u.name}</option>)}
                        <option value="other" className="text-slate-900">Other (Not Listed)</option>
                      </select>
                    </div>

                    {studentProfile.isOtherUni && (
                       <Input 
                         placeholder="Type your university name..." 
                         value={studentProfile.custom_university}
                         onChange={(e) => setStudentProfile({...studentProfile, custom_university: e.target.value})}
                         className="h-12 text-base bg-slate-800 border-white/10 text-white placeholder:text-slate-500"
                       />
                    )}

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-300 flex items-center gap-2">
                         <Hash className="w-4 h-4 text-indigo-400" /> Student ID
                      </label>
                      <Input 
                        placeholder="e.g. 10293344"
                        value={studentProfile.student_id_code}
                        onChange={(e) => setStudentProfile({...studentProfile, student_id_code: e.target.value})}
                        className="h-12 font-mono text-lg tracking-wide bg-slate-800 border-white/10 text-white placeholder:text-slate-500 focus:bg-slate-700 transition-colors"
                      />
                    </div>

                    <Button onClick={handleStudentNext} className="w-full h-12 text-lg mt-4 bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-lg shadow-indigo-900/20">
                        Continue <ChevronRight className="w-5 h-5 ml-2" />
                    </Button>
                  </div>
                )}

                {/* STEP 2: Interests */}
                {step === 2 && (
                   <div className="space-y-6 animate-in slide-in-from-right-8 fade-in">
                      <div className="text-center">
                         <h3 className="font-bold text-xl text-white">Pick Your Interests</h3>
                         <p className="text-sm text-slate-400">Select at least 3 topics.</p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        {INTERESTS_LIST.map((interest) => (
                          <button
                            key={interest}
                            onClick={() => {
                               const isActive = studentInterests.includes(interest);
                               setStudentInterests(prev => isActive ? prev.filter(i => i !== interest) : [...prev, interest]);
                               if (!isActive) setEmotion('happy');
                            }}
                            className={cn(
                              "p-3 rounded-xl text-sm font-bold transition-all border text-left hover:scale-[1.02] active:scale-95",
                              studentInterests.includes(interest)
                                ? "border-indigo-500 bg-indigo-500/20 text-indigo-300 shadow-md"
                                : "border-white/10 bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-white"
                            )}
                          >
                            {interest}
                          </button>
                        ))}
                      </div>

                      <Button 
                        onClick={handleStudentNext} 
                        disabled={loading || studentInterests.length < 3}
                        className="w-full h-14 text-lg font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/20"
                      >
                        {loading ? 'Saving...' : isCourseRep ? 'Next: Cohort Setup' : `Complete Setup`}
                      </Button>
                      <button onClick={() => setStep(1)} className="w-full text-slate-500 text-sm hover:text-white font-medium transition-colors">Go Back</button>
                   </div>
                )}

                {/* STEPS 3, 4, 5 (Course Reps) */}
                {isCourseRep && step >= 3 && (
                   <div className="animate-in slide-in-from-right-8 fade-in">
                     {step === 3 && (
                        <div className="space-y-4">
                           <div className="space-y-2">
                              <label className="text-sm font-bold text-slate-300">Cohort Name</label>
                              <Input 
                                placeholder="e.g. Computer Science Level 200"
                                value={repData.cohortName}
                                onChange={e => { setRepData({...repData, cohortName: e.target.value}); setEmotion('thinking'); }}
                                className="h-14 text-lg font-bold bg-slate-800 border-white/10 text-white placeholder:text-slate-500"
                              />
                           </div>
                           <div className="space-y-2">
                              <label className="text-sm font-bold text-slate-300">Class Size (Approx)</label>
                              <div className="grid grid-cols-3 gap-2">
                                 {['50', '100', '200+'].map(size => (
                                    <button key={size} onClick={() => setRepData({...repData, approxStudents: size})}
                                       className={cn("py-3 rounded-xl border font-bold text-sm transition-all",
                                          repData.approxStudents === size 
                                             ? "border-indigo-500 bg-indigo-500/20 text-indigo-300" 
                                             : "border-white/10 bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-white"
                                       )}>{size}</button>
                                 ))}
                              </div>
                           </div>
                           <Button onClick={handleRepNext} className="w-full h-12 mt-4 bg-indigo-600 hover:bg-indigo-500 text-white">Next Step</Button>
                        </div>
                     )}

                     {step === 4 && (
                        <div className="text-center space-y-8">
                           <div className="p-6 bg-slate-800/50 rounded-3xl border border-white/10">
                              <h3 className="font-bold text-slate-200 mb-6">How many courses this semester?</h3>
                              <div className="flex justify-center items-center gap-8">
                                 <button onClick={() => setRepData(p => ({...p, courseCount: String(Math.max(1, +p.courseCount - 1))}))} 
                                         className="w-12 h-12 rounded-full bg-slate-700 border border-white/10 flex items-center justify-center text-xl font-bold text-white hover:bg-slate-600 transition-colors">-</button>
                                 <span className="text-5xl font-black text-indigo-400 w-16">{repData.courseCount}</span>
                                 <button onClick={() => setRepData(p => ({...p, courseCount: String(+p.courseCount + 1)}))}
                                         className="w-12 h-12 rounded-full bg-slate-700 border border-white/10 flex items-center justify-center text-xl font-bold text-white hover:bg-slate-600 transition-colors">+</button>
                              </div>
                           </div>
                           <Button onClick={handleRepNext} className="w-full h-12 bg-indigo-600 hover:bg-indigo-500 text-white">Calculate Pricing</Button>
                        </div>
                     )}

                     {step === 5 && (
                        <div className="space-y-6">
                           <div className="bg-linear-to-br from-emerald-900/50 to-teal-900/50 p-8 rounded-3xl border border-emerald-500/30 text-center relative overflow-hidden">
                              <div className="relative z-10">
                                 <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-2">Per Student / Semester</p>
                                 <div className="text-5xl font-black text-emerald-400 tracking-tight">
                                    ₵{Math.round(parseInt(repData.courseCount) * PRICING.SINGLE_COURSE * (1 - PRICING.BUNDLE_DISCOUNT))}
                                 </div>
                                 <p className="text-sm text-emerald-300/80 mt-2 font-medium">Includes all {repData.courseCount} courses + AI Tutor</p>
                              </div>
                              <Sparkles className="absolute top-4 right-4 w-12 h-12 text-emerald-500/20" />
                           </div>
                           <Button 
                              onClick={handleFinalizeRep} 
                              disabled={loading} 
                              className="w-full h-14 text-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20"
                           >
                              {loading ? 'Setting up Space...' : 'Launch Cohort Space 🚀'}
                           </Button>
                        </div>
                     )}
                   </div>
                )}
              </div>
            )}

            {/* ========================================================= */}
            {/* LECTURER FLOW (UPDATED)                                   */}
            {/* ========================================================= */}
            {role === 'lecturer' && (
               <div className="space-y-6 max-w-md mx-auto py-2 animate-in slide-in-from-right-8 fade-in">
                  
                  {/* STEP 1: TYPE SELECTION (New) */}
                  {step === 1 && (
                     <div className="space-y-6 text-center">
                        <h3 className="font-bold text-xl text-white">How do you teach?</h3>
                        <div className="grid gap-4">
                           <button onClick={() => { setLecturerData({...lecturerData, type: 'university'}); handleLecturerNext(); }}
                                   className="group p-6 rounded-3xl border border-white/10 bg-slate-800/50 hover:bg-indigo-600 hover:border-indigo-500 transition-all text-left flex items-start gap-4">
                               <div className="p-3 rounded-xl bg-slate-700 group-hover:bg-indigo-500/50 transition-colors">
                                  <Building2 className="w-6 h-6 text-white" />
                               </div>
                               <div>
                                  <h4 className="font-bold text-lg text-white">University Lecturer</h4>
                                  <p className="text-sm text-slate-400 group-hover:text-indigo-100">I teach at an accredited institution</p>
                               </div>
                           </button>

                           <button onClick={() => { setLecturerData({...lecturerData, type: 'private'}); handleLecturerNext(); }}
                                   className="group p-6 rounded-3xl border border-white/10 bg-slate-800/50 hover:bg-emerald-600 hover:border-emerald-500 transition-all text-left flex items-start gap-4">
                               <div className="p-3 rounded-xl bg-slate-700 group-hover:bg-emerald-500/50 transition-colors">
                                  <Briefcase className="w-6 h-6 text-white" />
                               </div>
                               <div>
                                  <h4 className="font-bold text-lg text-white">Private Instructor</h4>
                                  <p className="text-sm text-slate-400 group-hover:text-emerald-100">I teach courses, bootcamps, or tuition</p>
                               </div>
                           </button>
                        </div>
                     </div>
                  )}

                  {/* STEP 2: CLASS COUNT */}
                  {step === 2 && (
                     <div className="space-y-6">
                        <div className="space-y-3">
                           <label className="text-sm font-bold text-slate-300">How many classes do you teach?</label>
                           <div className="grid grid-cols-3 gap-3">
                              {['1','2-3','4+'].map(num => (
                                 <button key={num} onClick={() => setLecturerData({...lecturerData, classCount: num})} 
                                    className={cn("h-20 rounded-2xl border font-bold text-xl transition-all", 
                                       lecturerData.classCount === num 
                                       ? "border-indigo-500 bg-indigo-500/20 text-indigo-300" 
                                       : "border-white/10 text-slate-500 hover:bg-slate-800 hover:text-white"
                                    )}>{num}</button>
                              ))}
                           </div>
                        </div>
                        <Button onClick={handleLecturerNext} className="w-full h-12 bg-indigo-600 hover:bg-indigo-500 text-white">Next Step</Button>
                     </div>
                  )}

                  {/* STEP 3: STUDENT COUNT */}
                  {step === 3 && (
                     <div className="space-y-6">
                        <div className="space-y-3">
                           <label className="text-sm font-bold text-slate-300">Total number of students?</label>
                           <div className="space-y-2">
                              {['50', '200', '500', '1000'].map(num => (
                                 <button key={num} onClick={() => setLecturerData({...lecturerData, studentCount: num})} 
                                    className={cn("w-full p-4 rounded-xl border font-bold text-left transition-all flex justify-between items-center", 
                                       lecturerData.studentCount === num 
                                       ? "border-indigo-500 bg-indigo-500/20 text-indigo-300" 
                                       : "border-white/10 text-slate-500 hover:bg-slate-800 hover:text-white"
                                    )}>
                                       <span>{num === '50' ? 'Less than 50' : num === '1000' ? '500+' : `${num} Students`}</span>
                                       {lecturerData.studentCount === num && <Check className="w-5 h-5" />}
                                    </button>
                              ))}
                           </div>
                        </div>
                        <Button onClick={handleLecturerNext} className="w-full h-12 bg-indigo-600 hover:bg-indigo-500 text-white">Next Step</Button>
                     </div>
                  )}

                  {/* STEP 4: TAs */}
                  {step === 4 && (
                     <div className="space-y-6 text-center">
                        <h3 className="font-bold text-xl text-white">Do you have Teaching Assistants?</h3>
                        <div className="grid grid-cols-2 gap-4">
                           <button onClick={() => setLecturerData({...lecturerData, hasTAs: 'yes'})} 
                              className={cn("py-8 rounded-2xl border font-bold text-lg transition-all", 
                                 lecturerData.hasTAs === 'yes' ? "border-indigo-500 bg-indigo-500/20 text-indigo-300" : "border-white/10 text-slate-500 hover:bg-slate-800 hover:text-white")}>
                              Yes, I do
                           </button>
                           <button onClick={() => setLecturerData({...lecturerData, hasTAs: 'no'})} 
                              className={cn("py-8 rounded-2xl border font-bold text-lg transition-all", 
                                 lecturerData.hasTAs === 'no' ? "border-indigo-500 bg-indigo-500/20 text-indigo-300" : "border-white/10 text-slate-500 hover:bg-slate-800 hover:text-white")}>
                              No, just me
                           </button>
                        </div>
                        <Button onClick={handleLecturerNext} className="w-full h-12 bg-indigo-600 hover:bg-indigo-500 text-white">See Recommendation</Button>
                     </div>
                  )}

                  {/* STEP 5: PRICING (Updated) */}
                  {step === 5 && (
                     <div className="space-y-8 text-center pt-4">
                        <div className="relative">
                           <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-yellow-500 text-yellow-950 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1 shadow-lg shadow-yellow-900/20">
                              <Crown className="w-3 h-3" /> Recommended
                           </div>
                           <div className="border border-indigo-500/30 bg-indigo-900/20 p-8 rounded-3xl shadow-xl">
                              <p className="text-indigo-300 font-medium text-sm uppercase tracking-widest mb-2">Your Ideal Plan</p>
                              <h2 className="text-4xl font-black text-white mb-4">{tiers[lecturerData.selectedTier as keyof typeof tiers].name}</h2>
                              <div className="text-5xl font-black text-indigo-400 mb-1">
                                 ${tiers[lecturerData.selectedTier as keyof typeof tiers].price}<span className="text-lg text-slate-400 font-bold">/mo</span>
                              </div>
                           </div>
                        </div>
                        
                        {/* Change option if they want */}
                        {lecturerData.selectedTier !== 'starter' && (
                            <button 
                                onClick={() => setLecturerData({...lecturerData, selectedTier: 'starter'})}
                                className="text-sm text-slate-500 hover:text-white underline transition-colors"
                            >
                                No thanks, I'll start with the free plan
                            </button>
                        )}

                        <Button 
                           onClick={handleFinalizeLecturer} 
                           disabled={loading} 
                           className={cn("w-full h-14 text-lg font-bold text-white shadow-xl transition-all", 
                            lecturerData.selectedTier === 'starter' 
                                ? "bg-slate-700 hover:bg-slate-600" 
                                : "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-900/20"
                           )}
                        >
                           {loading ? 'Processing...' : 
                            lecturerData.selectedTier === 'starter' ? 'Get Started for Free 🚀' : 'Proceed to Payment 💳'}
                        </Button>
                     </div>
                  )}
               </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}