'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { PRICING, PLANS } from '@/lib/constants';
import { Button } from '@/components/ui/Button'; // ✅ Import Button

interface WizardProps {
  userId: string;
  role: 'lecturer' | 'student';
  isCourseRep: boolean;
  onComplete: () => void;
}

export default function OnboardingWizard({ userId, role, isCourseRep, onComplete }: WizardProps) {
  const [step, setStep] = useState(1);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Focus handling
  useEffect(() => {
    if (step === 1 && inputRef.current) {
       setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [step]);
  
  // Lecturer Data
  const [lecturerData, setLecturerData] = useState({
    classCount: '1',
    studentCount: '50',
    hasTAs: 'no',
    selectedTier: 'starter'
  });

  // Course Rep Data
  const [repData, setRepData] = useState({
    cohortName: '',
    courseCount: '6', // Default semester load
    approxStudents: '50'
  });

  const [coupon, setCoupon] = useState('');
  const [loading, setLoading] = useState(false);

  const tiers = {
    starter: { name: PLANS.starter.name, price: PLANS.starter.price, limit: `${PLANS.starter.maxStudents} Students` },
    pro: { name: PLANS.pro.name, price: PLANS.pro.price, limit: `${PLANS.pro.maxStudents} Students` },
    elite: { name: PLANS.elite.name, price: PLANS.elite.price, limit: 'Unlimited' }
  };

  // --- DYNAMIC PRICING HELPERS ---
  const calculateBundlePrice = (count: number) => {
    const basePrice = count * PRICING.SINGLE_COURSE;
    const discounted = basePrice * (1 - PRICING.BUNDLE_DISCOUNT); 
    return Math.round(discounted); 
  };

  const calculateSavings = (count: number) => {
    const base = count * PRICING.SINGLE_COURSE;
    const bundle = calculateBundlePrice(count);
    return base - bundle;
  };

  // --- LOGIC HANDLERS ---

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
      alert("For this test, please use coupon: TEST-DRIVE");
      setLoading(false);
      return;
    }
    await saveProfile({ plan_tier: lecturerData.selectedTier });
  };

  const handleFinalizeRep = async () => {
    if (!repData.cohortName) return alert("Please enter a cohort name.");
    setLoading(true);
    
    // Save user profile first
    const { error } = await supabase
      .from('users')
      .update({ 
        onboarding_completed: true, 
        plan_tier: 'cohort_manager' 
      })
      .eq('id', userId);

    if (error) {
        alert(error.message);
        setLoading(false);
    } else {
        // Then create the class with the course count
        await createCohortClass();
    }
  };

  const saveProfile = async (updates: any) => {
    const { error } = await supabase
      .from('users')
      .update({ onboarding_completed: true, ...updates })
      .eq('id', userId);

    if (error) alert(error.message);
    else {
        alert(`Setup Complete! You are on the ${tiers[updates.plan_tier as keyof typeof tiers]?.name || 'Custom'} Plan.`);
        onComplete();
    }
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
        lecturer_id: userId, // Rep is the "Owner"
        course_count: parseInt(repData.courseCount) // <--- Saving course count here!
     }]).select().single();

     if (error) {
         alert("Error creating cohort: " + error.message);
     } else {
         // Add Rep as instructor so they can manage it
         await supabase.from('class_instructors').insert([{ lecturer_id: userId, class_id: cls.id }]);
         alert(`Cohort Created! Code: ${accessCode}`);
         onComplete();
     }
     setLoading(false);
  };

  // --- RENDER ---
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4" role="dialog" aria-modal="true" aria-labelledby="wizard-title">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-300">
        
        <div className="bg-blue-600 p-6 text-white text-center">
          <h2 id="wizard-title" className="text-2xl font-bold">
            {isCourseRep ? "Setup Class Cohort" : "Setup Classroom"}
          </h2>
          <p className="text-blue-100 text-sm">Step {step} of {isCourseRep ? 3 : 4}</p>
        </div>

        <div className="p-8">
          
          {/* === COURSE REP FLOW === */}
          {isCourseRep && (
            <>
              {step === 1 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-gray-900">What is your Cohort Name?</h3>
                  <label htmlFor="cohortName" className="sr-only">Cohort Name</label>
                  <input 
                    id="cohortName"
                    ref={inputRef}
                    className="w-full border p-3 rounded-xl text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Marketing Level 200"
                    value={repData.cohortName}
                    onChange={e => setRepData({...repData, cohortName: e.target.value})}
                  />
                   <h3 className="text-lg font-bold text-gray-900 mt-4">Approx. Class Size?</h3>
                   <label htmlFor="classSize" className="sr-only">Class Size</label>
                   <select id="classSize" className="w-full p-3 border rounded-xl text-gray-900 bg-white" value={repData.approxStudents} onChange={e => setRepData({...repData, approxStudents: e.target.value})}>
                    <option value="50">~50</option>
                    <option value="100">~100</option>
                    <option value="200">~200+</option>
                  </select>
                  <Button onClick={() => setStep(2)} className="w-full mt-4" size="lg">Next →</Button>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <div className="text-center">
                    <h3 className="text-lg font-bold text-gray-900">How many courses this semester?</h3>
                    <p className="text-sm text-gray-500">This helps calculate the bundle price for your classmates.</p>
                  </div>
                  
                  <div className="flex items-center justify-center gap-4">
                     <button onClick={() => setRepData({...repData, courseCount: Math.max(1, parseInt(repData.courseCount) - 1).toString()})} className="w-12 h-12 rounded-full bg-gray-100 hover:bg-gray-200 font-bold text-xl text-gray-600">-</button>
                     <span className="text-4xl font-bold text-blue-600">{repData.courseCount}</span>
                     <button onClick={() => setRepData({...repData, courseCount: (parseInt(repData.courseCount) + 1).toString()})} className="w-12 h-12 rounded-full bg-gray-100 hover:bg-gray-200 font-bold text-xl text-gray-600">+</button>
                  </div>

                  <Button onClick={() => setStep(3)} className="w-full mt-4" size="lg">
                    See Pricing Model →
                  </Button>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6">
                  <div className="bg-blue-50 p-5 rounded-xl border border-blue-100">
                    <h4 className="font-bold text-blue-900 mb-3 text-center">Student Pricing Model</h4>
                    
                    <div className="space-y-3 text-sm bg-white p-4 rounded-lg border border-blue-100 shadow-sm">
                        <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                            <span className="text-gray-600">Single Course Unlock</span>
                            <span className="font-bold text-gray-900">₵{PRICING.SINGLE_COURSE} / sem</span>
                        </div>
                        
                        <div className="flex justify-between items-center pt-2">
                            <span className="text-gray-600">Full Bundle ({repData.courseCount} Courses)</span>
                            <div className="text-right">
                                <span className="block text-xs text-gray-400 line-through">₵{parseInt(repData.courseCount) * PRICING.SINGLE_COURSE}</span>
                                <span className="font-bold text-green-600 text-lg">₵{calculateBundlePrice(parseInt(repData.courseCount))} / sem</span>
                            </div>
                        </div>
                        
                        <div className="mt-2 pt-2 border-t border-dashed border-green-200 text-center">
                           <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">
                             🔥 Students save {PRICING.BUNDLE_DISCOUNT * 100}% (₵{calculateSavings(parseInt(repData.courseCount))})
                           </span>
                        </div>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 text-center px-4 leading-relaxed">
                    You are creating this space for free. Lecturers join for free. Students pay individually based on these rates.
                  </div>

                  <Button 
                    onClick={handleFinalizeRep} 
                    disabled={loading} 
                    variant="gradient"
                    size="xl"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {loading ? 'Creating Space...' : 'Create Class Space'}
                  </Button>
                </div>
              )}
            </>
          )}

          {/* === LECTURER FLOW (Original) === */}
          {!isCourseRep && (
            <>
              {step === 1 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-gray-900">How many classes do you teach?</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {['1', '2-3', '4+'].map(opt => (
                        <button key={opt} onClick={() => setLecturerData({...lecturerData, classCount: opt})} className={`py-3 border rounded-xl font-bold ${lecturerData.classCount === opt ? 'bg-blue-50 border-blue-500 text-blue-700' : 'text-gray-600'}`}>{opt}</button>
                    ))}
                  </div>
                  <Button onClick={handleLecturerNext} className="w-full mt-4" size="lg">Next →</Button>
                </div>
              )}
              
              {step === 2 && (
                 <div className="space-y-4">
                   <h3 className="text-lg font-bold text-gray-900">Total Student Count?</h3>
                   <select className="w-full p-3 border rounded-xl text-gray-900" value={lecturerData.studentCount} onChange={e => setLecturerData({...lecturerData, studentCount: e.target.value})}>
                     <option value="50">Less than 50</option>
                     <option value="200">50 - 200</option>
                     <option value="500">200 - 500</option>
                     <option value="1000">500+</option>
                   </select>
                   <Button onClick={handleLecturerNext} className="w-full mt-4" size="lg">Next →</Button>
                 </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-gray-900">Do you have Teaching Assistants?</h3>
                  <div className="flex gap-4">
                    <button onClick={() => setLecturerData({...lecturerData, hasTAs: 'yes'})} className={`flex-1 py-4 border rounded-xl font-bold ${lecturerData.hasTAs === 'yes' ? 'bg-blue-50 border-blue-500 text-blue-700' : ''}`}>Yes</button>
                    <button onClick={() => setLecturerData({...lecturerData, hasTAs: 'no'})} className={`flex-1 py-4 border rounded-xl font-bold ${lecturerData.hasTAs === 'no' ? 'bg-blue-50 border-blue-500 text-blue-700' : ''}`}>No</button>
                  </div>
                  <Button onClick={handleLecturerNext} className="w-full mt-4" size="lg">Recommendation →</Button>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-6">
                  <div className="text-center">
                    <p className="text-gray-500 text-xs uppercase font-bold">We recommend</p>
                    <h3 className="text-3xl font-bold text-blue-600 mt-1">{tiers[lecturerData.selectedTier as keyof typeof tiers].name} Plan</h3>
                  </div>
                  {lecturerData.selectedTier !== 'starter' && (
                    <input value={coupon} onChange={e => setCoupon(e.target.value.toUpperCase())} placeholder="TEST-DRIVE" className="w-full p-3 border-2 border-dashed border-blue-200 rounded-xl text-center font-mono tracking-widest text-gray-900" />
                  )}
                  <Button onClick={handleFinalizeLecturer} disabled={loading} variant="primary" size="xl" className="bg-green-600 hover:bg-green-700">{loading ? 'Activating...' : 'Activate Plan'}</Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}