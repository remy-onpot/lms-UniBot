'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { PRICING, PLANS } from '@/lib/constants';
import { Button } from '@/components/ui/Button';
import { Check, School, Hash, BookOpen } from 'lucide-react';

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
  const [step, setStep] = useState(1);
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [universities, setUniversities] = useState<any[]>([]);

  // --- STATE ---
  
  const [studentProfile, setStudentProfile] = useState({
    university_id: '',
    custom_university: '',
    student_id: '',
    isOtherUni: false
  });

  const [lecturerData, setLecturerData] = useState({
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
  const [coupon, setCoupon] = useState('');

  // --- INIT ---
  useEffect(() => {
    const fetchUnis = async () => {
      const { data } = await supabase.from('universities').select('id, name, abbreviation').eq('is_active', true).order('name');
      if (data) setUniversities(data);
    };
    fetchUnis();
  }, []);

  useEffect(() => {
    if (inputRef.current) setTimeout(() => inputRef.current?.focus(), 100);
  }, [step]);

  // --- HANDLERS ---

  const toggleInterest = (interest: string) => {
    setStudentInterests(prev => 
      prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
    );
  };

  const handleStudentNext = () => {
    // Validation for Step 1
    if (step === 1) {
      if (!studentProfile.university_id && !studentProfile.custom_university) {
        return alert("Please select your University.");
      }
      if (!studentProfile.student_id) {
        return alert("Please enter your Student ID Number (Required for grades).");
      }
    }
    setStep(step + 1);
  };

  const handleFinalizeStudent = async () => {
    if (studentInterests.length < 3) return alert("Please select at least 3 interests.");
    setLoading(true);
    
    const updates: any = {
      interests: studentInterests,
      student_id: studentProfile.student_id,
    };

    if (studentProfile.isOtherUni) {
      updates.custom_university = studentProfile.custom_university;
      updates.university_id = null;
    } else {
      updates.university_id = studentProfile.university_id;
      updates.custom_university = null;
    }

    await saveProfile(updates);
  };

  const handleLecturerNext = () => {
    if (step === 3) {
      let recommended = 'starter';
      const count = parseInt(lecturerData.studentCount);
      if (count > 500 || lecturerData.hasTAs === 'yes') recommended = 'elite';
      else if (count > 50) recommended = 'pro';
      setLecturerData({ ...lecturerData, selectedTier: recommended });
    }
    setStep(step + 1);
  };

  const handleFinalizeLecturer = async () => {
    setLoading(true);
    if (lecturerData.selectedTier !== 'starter' && coupon !== 'TEST-DRIVE') {
      alert("Use coupon: TEST-DRIVE");
      setLoading(false);
      return;
    }
    await saveProfile({ plan_tier: lecturerData.selectedTier });
  };

  const handleFinalizeRep = async () => {
    if (!repData.cohortName) return alert("Enter cohort name.");
    setLoading(true);
    
    // Save profile first
    const { error } = await supabase
      .from('users')
      .update({ onboarding_completed: true, plan_tier: 'cohort_manager' })
      .eq('id', userId);

    if (error) {
        alert(error.message);
        setLoading(false);
    } else {
        await createCohortClass();
    }
  };

  const saveProfile = async (updates: any) => {
    const { error } = await supabase
      .from('users')
      .update({ onboarding_completed: true, ...updates })
      .eq('id', userId);

    if (error) alert(error.message);
    else onComplete();
    
    setLoading(false);
  };

  const createCohortClass = async () => {
     const prefix = repData.cohortName.substring(0, 3).toUpperCase();
     const randomNum = Math.floor(1000 + Math.random() * 9000);
     const accessCode = `${prefix}-${randomNum}`;

     const { data: cls, error } = await supabase.from('classes').insert([{
        name: repData.cohortName,
        description: `Cohort for ${repData.approxStudents} students.`,
        access_code: accessCode,
        lecturer_id: userId,
        course_count: parseInt(repData.courseCount)
     }]).select().single();

     if (error) {
         alert("Error: " + error.message);
     } else {
         await supabase.from('class_instructors').insert([{ lecturer_id: userId, class_id: cls.id }]);
         alert(`Cohort Created! Code: ${accessCode}`);
         onComplete();
     }
     setLoading(false);
  };

  // --- RENDER ---
  
  const getTitle = () => {
    if (role === 'lecturer') return "Setup Classroom";
    if (isCourseRep) return "Setup Cohort";
    return "Complete Profile";
  };

  const tiers = {
    starter: { name: PLANS.starter.name, price: PLANS.starter.price },
    pro: { name: PLANS.pro.name, price: PLANS.pro.price },
    elite: { name: PLANS.elite.name, price: PLANS.elite.price }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in" role="dialog" aria-modal="true">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-indigo-600 p-6 text-white text-center shrink-0">
          <h2 className="text-2xl font-bold">{getTitle()}</h2>
          <p className="text-indigo-100 text-sm opacity-90">Step {step} of {role === 'lecturer' ? 4 : isCourseRep ? 3 : 2}</p>
        </div>

        <div className="p-8 overflow-y-auto">
          
          {/* === STUDENT FLOW === */}
          {role === 'student' && !isCourseRep && (
            <div className="space-y-6">
              
              {/* Step 1: Academic Profile */}
              {step === 1 && (
                <div className="space-y-5 animate-in slide-in-from-right-4">
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-bold text-slate-900">Academic Profile</h3>
                    <p className="text-slate-500 text-sm">We use this to format your official transcript.</p>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5 items-center gap-2">
                      <School className="w-4 h-4 text-slate-400" /> Select University
                    </label>
                    <select 
                      className="w-full p-3 border rounded-xl bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      value={studentProfile.isOtherUni ? 'other' : studentProfile.university_id}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'other') {
                          setStudentProfile({ ...studentProfile, isOtherUni: true, university_id: '' });
                        } else {
                          setStudentProfile({ ...studentProfile, isOtherUni: false, university_id: val, custom_university: '' });
                        }
                      }}
                    >
                      <option value="" disabled>-- Choose Institution --</option>
                      {universities.map(u => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                      <option value="other">Other (My school is not listed)</option>
                    </select>
                  </div>

                  {studentProfile.isOtherUni && (
                    <div className="animate-in fade-in slide-in-from-top-2">
                      <label className="block text-sm font-bold text-indigo-600 mb-1.5">School Name</label>
                      <input 
                        type="text"
                        placeholder="e.g. Wisconsin International Uni"
                        className="w-full p-3 border-2 border-indigo-100 rounded-xl focus:border-indigo-500 outline-none"
                        value={studentProfile.custom_university}
                        onChange={(e) => setStudentProfile({...studentProfile, custom_university: e.target.value})}
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5 items-center gap-2">
                      <Hash className="w-4 h-4 text-slate-400" /> Student ID Number <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text"
                      placeholder="e.g. 10293344"
                      className="w-full p-3 border rounded-xl bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none font-mono tracking-wide"
                      value={studentProfile.student_id}
                      onChange={(e) => setStudentProfile({...studentProfile, student_id: e.target.value})}
                    />
                    <p className="text-[11px] text-slate-400 mt-2 flex items-start gap-1.5 bg-slate-50 p-2 rounded-lg">
                      <Check className="w-3 h-3 text-green-500 mt-0.5 shrink-0" />
                      Required for Gradebook Export compatibility.
                    </p>
                  </div>

                  <Button onClick={handleStudentNext} className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700" size="lg">Next Step →</Button>
                </div>
              )}

              {/* Step 2: Interests */}
              {step === 2 && (
                <div className="animate-in slide-in-from-right-4">
                  <div className="text-center mb-4">
                    <h3 className="text-xl font-bold text-slate-900">Your Interests</h3>
                    <p className="text-slate-500 text-sm">Pick 3 topics for your daily AI quizzes.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto p-1 custom-scrollbar">
                    {INTERESTS_LIST.map((interest) => (
                      <button
                        key={interest}
                        onClick={() => toggleInterest(interest)}
                        className={`p-3 rounded-xl text-sm font-bold transition-all border-2 text-left ${
                          studentInterests.includes(interest)
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm'
                            : 'border-slate-100 bg-white text-slate-600 hover:border-slate-200'
                        }`}
                      >
                        {interest}
                      </button>
                    ))}
                  </div>

                  <div className="pt-4 mt-2 border-t border-slate-100">
                    <Button 
                      onClick={handleFinalizeStudent} 
                      disabled={loading || studentInterests.length < 3} 
                      size="lg"
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      {loading ? 'Saving Profile...' : `Finish Setup (${studentInterests.length}/3)`}
                    </Button>
                    <button onClick={() => setStep(1)} className="w-full mt-3 text-sm text-slate-400 hover:text-slate-600">Back</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* === COURSE REP FLOW (Simplified for logic consistency) === */}
          {role === 'student' && isCourseRep && (
            <div className="space-y-6 animate-in slide-in-from-right-4">
              {step === 1 && (
                <>
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-bold">Cohort Details</h3>
                    <p className="text-sm text-slate-500">Create a space for your class.</p>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cohort Name</label>
                      <input 
                        ref={inputRef}
                        className="w-full border p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g. Marketing Level 200"
                        value={repData.cohortName}
                        onChange={e => setRepData({...repData, cohortName: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Class Size</label>
                      <select className="w-full p-3 border rounded-xl bg-white" value={repData.approxStudents} onChange={e => setRepData({...repData, approxStudents: e.target.value})}>
                        <option value="50">~50 Students</option>
                        <option value="100">~100 Students</option>
                        <option value="200">~200+ Students</option>
                      </select>
                    </div>
                    <Button onClick={() => setStep(2)} className="w-full mt-2" size="lg">Next →</Button>
                  </div>
                </>
              )}

              {step === 2 && (
                 <div className="text-center space-y-6">
                    <BookOpen className="w-12 h-12 text-indigo-200 mx-auto" />
                    <div>
                      <h3 className="text-xl font-bold">How many courses?</h3>
                      <p className="text-sm text-slate-500">We use this to calculate bundle discounts.</p>
                    </div>
                    <div className="flex justify-center gap-6 items-center">
                       <button onClick={() => setRepData({...repData, courseCount: (parseInt(repData.courseCount)-1).toString()})} className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 font-bold">-</button>
                       <span className="text-4xl font-bold text-indigo-600">{repData.courseCount}</span>
                       <button onClick={() => setRepData({...repData, courseCount: (parseInt(repData.courseCount)+1).toString()})} className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 font-bold">+</button>
                    </div>
                    <Button onClick={() => setStep(3)} className="w-full mt-4">Review Pricing</Button>
                 </div>
              )}

              {step === 3 && (
                 <div className="space-y-6">
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-center">
                       <p className="text-sm text-slate-500 font-medium uppercase mb-2">Student Bundle Price</p>
                       <p className="text-4xl font-black text-green-600">₵{Math.round(parseInt(repData.courseCount) * PRICING.SINGLE_COURSE * (1 - PRICING.BUNDLE_DISCOUNT))}</p>
                       <p className="text-xs text-slate-400 mt-2">Per student / semester</p>
                    </div>
                    <div className="text-center">
                        <Button onClick={handleFinalizeRep} disabled={loading} size="lg" className="w-full bg-green-600 hover:bg-green-700 shadow-lg shadow-green-200">
                          {loading ? 'Creating Space...' : 'Launch Cohort Space 🚀'}
                        </Button>
                        <p className="text-[10px] text-slate-400 mt-3">By launching, you agree to become the admin for this cohort.</p>
                    </div>
                 </div>
              )}
            </div>
          )}

          {/* === LECTURER FLOW (Unchanged) === */}
          {role === 'lecturer' && (
            <div className="space-y-6 animate-in slide-in-from-right-4">
              {step === 1 && (
                 <div className="space-y-4">
                    <h3 className="font-bold text-lg">Teaching Load</h3>
                    <div className="grid grid-cols-3 gap-3">
                       {['1','2-3','4+'].map(o => (
                         <button key={o} onClick={() => setLecturerData({...lecturerData, classCount: o})} className={`py-4 border rounded-xl font-bold ${lecturerData.classCount===o?'bg-indigo-50 border-indigo-500 text-indigo-700':'text-slate-600'}`}>{o}</button>
                       ))}
                    </div>
                    <Button onClick={handleLecturerNext} className="w-full mt-4">Next</Button>
                 </div>
              )}
              {step === 2 && (
                 <div className="space-y-4">
                    <h3 className="font-bold text-lg">Total Students</h3>
                    <select className="w-full p-3 border rounded-xl bg-white" value={lecturerData.studentCount} onChange={e=>setLecturerData({...lecturerData, studentCount: e.target.value})}>
                       <option value="50">Less than 50</option>
                       <option value="200">50 - 200</option>
                       <option value="500">200 - 500</option>
                       <option value="1000">500+</option>
                    </select>
                    <Button onClick={handleLecturerNext} className="w-full mt-4">Next</Button>
                 </div>
              )}
              {step === 3 && (
                 <div className="space-y-4">
                    <h3 className="font-bold text-lg">Do you have TAs?</h3>
                    <div className="flex gap-4">
                       <button onClick={()=>setLecturerData({...lecturerData, hasTAs:'yes'})} className={`flex-1 py-4 border rounded-xl font-bold ${lecturerData.hasTAs==='yes'?'bg-indigo-50 border-indigo-500 text-indigo-700':''}`}>Yes</button>
                       <button onClick={()=>setLecturerData({...lecturerData, hasTAs:'no'})} className={`flex-1 py-4 border rounded-xl font-bold ${lecturerData.hasTAs==='no'?'bg-indigo-50 border-indigo-500 text-indigo-700':''}`}>No</button>
                    </div>
                    <Button onClick={handleLecturerNext} className="w-full mt-4">See Recommendation</Button>
                 </div>
              )}
              {step === 4 && (
                 <div className="space-y-6 text-center">
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase">Recommended Plan</p>
                      <h3 className="text-3xl font-black text-indigo-600 mt-2">{tiers[lecturerData.selectedTier as keyof typeof tiers].name}</h3>
                    </div>
                    
                    {lecturerData.selectedTier !== 'starter' && (
                      <input 
                        placeholder="Coupon: TEST-DRIVE" 
                        value={coupon} 
                        onChange={e=>setCoupon(e.target.value)} 
                        className="w-full p-3 border-2 border-dashed border-slate-300 rounded-xl text-center font-mono uppercase tracking-widest" 
                      />
                    )}
                    
                    <Button onClick={handleFinalizeLecturer} disabled={loading} size="lg" className="w-full bg-green-600 hover:bg-green-700 shadow-lg shadow-green-200">
                      Activate Plan
                    </Button>
                 </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
  
  function calculateBundlePrice(count: number) { 
    return Math.round(count * PRICING.SINGLE_COURSE * (1 - PRICING.BUNDLE_DISCOUNT)); 
  }
}