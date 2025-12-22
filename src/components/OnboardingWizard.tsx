'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { PLAN_LIMITS, calculateSaaSPrice, PRICING } from '@/lib/constants';
import { toast } from 'sonner';
import { ChevronRight, School, Hash, Building2, Briefcase, Crown, Sparkles } from 'lucide-react';
import { UniBotMascot, MascotEmotion, MascotAction } from '@/components/ui/UniBotMascot';
import { GlassCanvas, NeoInput, MagButton, StaggerContainer } from '@/components/ui/WizardUI';

// ==========================================
// 1. STUDENT FLOW COMPONENT
// ==========================================
const StudentFlow = ({ step, data, setData, onNext, interests, universities }: any) => (
  <div className="max-w-md mx-auto space-y-8">
    {step === 1 && (
      <StaggerContainer>
         <h2 className="text-2xl font-light text-white mb-6">Academic <span className="font-bold text-indigo-400">Identity</span></h2>
         
         <div className="space-y-4">
           <div>
             <label className="text-xs font-mono text-slate-400 mb-2 block">INSTITUTION</label>
             <div className="relative">
               <School className="absolute left-4 top-4 w-5 h-5 text-indigo-500" />
               <select 
                  className="w-full h-14 pl-12 bg-slate-900/50 rounded-xl border-none text-white outline-none appearance-none shadow-inner"
                  value={data.isOtherUni ? 'other' : data.university_id}
                  onChange={(e) => e.target.value === 'other' ? setData({...data, isOtherUni: true, university_id: ''}) : setData({...data, isOtherUni: false, university_id: e.target.value})}
               >
                  <option value="" disabled>Select University Database...</option>
                  {universities.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  <option value="other">Other / Not Listed</option>
               </select>
             </div>
           </div>
           
           {data.isOtherUni && (
             <NeoInput placeholder="Enter University Name manually..." value={data.custom_university} onChange={(e: any) => setData({...data, custom_university: e.target.value})} />
           )}

           <div>
             <label className="text-xs font-mono text-slate-400 mb-2 block">STUDENT ID</label>
             <div className="relative">
               <Hash className="absolute left-4 top-4 w-5 h-5 text-indigo-500" />
               <NeoInput className="pl-12 font-mono tracking-widest" placeholder="10229933" value={data.student_id_code} onChange={(e: any) => setData({...data, student_id_code: e.target.value})} />
             </div>
           </div>

           <MagButton onClick={onNext} className="w-full mt-4">Initialize Profile <ChevronRight className="w-4 h-4" /></MagButton>
         </div>
      </StaggerContainer>
    )}

    {step === 2 && (
      <StaggerContainer>
         <h2 className="text-2xl font-light text-white mb-2">Neural <span className="font-bold text-cyan-400">Calibration</span></h2>
         <p className="text-slate-400 text-sm mb-6">Select exactly 3 topics to tune your AI.</p>
         
         <div className="grid grid-cols-2 gap-3 mb-8">
            {interests.map((interest: any) => {
               const isSelected = data.selectedInterests.includes(interest.label);
               return (
                 <button
                   key={interest.id}
                   onClick={() => {
                      if (isSelected) {
                        setData({...data, selectedInterests: data.selectedInterests.filter((i: string) => i !== interest.label)});
                      } else {
                        if (data.selectedInterests.length < 3) setData({...data, selectedInterests: [...data.selectedInterests, interest.label]});
                      }
                   }}
                   className={`p-4 rounded-xl text-left border transition-all ${isSelected ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.3)]' : 'border-white/5 bg-white/5 text-slate-400 hover:bg-white/10'}`}
                 >
                   <span className="text-xl mb-1 block">{interest.emoji}</span>
                   <span className="text-xs font-bold uppercase tracking-wider">{interest.label}</span>
                 </button>
               )
            })}
         </div>
         
         <MagButton onClick={onNext} disabled={data.selectedInterests.length !== 3} className="w-full">
           {data.selectedInterests.length !== 3 ? `Select ${3 - data.selectedInterests.length} more` : 'Complete Calibration'}
         </MagButton>
      </StaggerContainer>
    )}
  </div>
);

// ==========================================
// 2. LECTURER FLOW COMPONENT
// ==========================================
const LecturerFlow = ({ step, data, setData, onNext }: any) => {
  const estimatedPrice = calculateSaaSPrice(parseInt(data.studentCount || '0'));
  
  return (
     <div className="max-w-md mx-auto space-y-8">
        {step === 1 && (
           <StaggerContainer>
              <h2 className="text-2xl font-light text-white mb-6">Teaching <span className="font-bold text-emerald-400">mode</span></h2>
              <div className="space-y-4">
                 {[
                   { id: 'university', label: 'University Lecturer', icon: Building2, desc: 'Accredited Institution' },
                   { id: 'private', label: 'Private Instructor', icon: Briefcase, desc: 'Courses & Tuition' }
                 ].map((type) => (
                   <button key={type.id} onClick={() => { setData({...data, type: type.id}); onNext(); }}
                     className="w-full p-6 rounded-2xl border border-white/5 bg-slate-900/40 hover:bg-slate-800 hover:border-white/20 transition-all group flex items-center gap-4 text-left">
                      <div className={`p-3 rounded-lg bg-slate-800 ${type.id === 'university' ? 'group-hover:bg-indigo-500' : 'group-hover:bg-emerald-500'} transition-colors`}>
                        <type.icon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white">{type.label}</h3>
                        <p className="text-xs text-slate-500">{type.desc}</p>
                      </div>
                   </button>
                 ))}
              </div>
           </StaggerContainer>
        )}

        {step === 2 && (
           <StaggerContainer>
              <h2 className="text-2xl font-light text-white mb-6">Cohort <span className="font-bold text-emerald-400">Size</span></h2>
              <div className="space-y-4">
                 <label className="text-sm text-slate-400">Approx. Students (Total across all classes)</label>
                 <div className="grid grid-cols-2 gap-4">
                    {['20', '50', '100', '300'].map(num => (
                       <button key={num} onClick={() => setData({...data, studentCount: num})}
                          className={`p-4 rounded-xl border font-bold text-lg transition-all ${data.studentCount === num ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300' : 'border-white/10 bg-slate-900/40'}`}>
                          {num}
                       </button>
                    ))}
                 </div>
                 <MagButton onClick={onNext} className="w-full mt-4">Next Step</MagButton>
              </div>
           </StaggerContainer>
        )}

        {step === 3 && (
           <StaggerContainer>
              <div className="text-center">
                 <div className="inline-flex items-center gap-2 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-6">
                    <Crown className="w-3 h-3" /> Recommended Protocol
                 </div>
                 
                 <div className="p-8 rounded-3xl border border-indigo-500/30 bg-indigo-900/10 mb-8 relative overflow-hidden">
                    <div className="absolute inset-0 bg-indigo-500/5 blur-xl"></div>
                    <h3 className="text-2xl font-black text-white relative z-10 mb-2">
                       {parseInt(data.studentCount) <= 10 ? 'Pilot Mode' : 'Pro License'}
                    </h3>
                    <div className="text-5xl font-mono font-light text-indigo-300 relative z-10">
                       ₵{estimatedPrice}
                       <span className="text-sm text-slate-500 font-sans ml-2">/semester</span>
                    </div>
                    <p className="text-xs text-indigo-200/50 mt-2">{data.studentCount} Student Seats</p>
                 </div>

                 <MagButton onClick={onNext} className="w-full h-14 text-sm">
                    {parseInt(data.studentCount) <= 10 ? 'Initialize Free Pilot' : 'Proceed to Payment Gateway'}
                 </MagButton>
              </div>
           </StaggerContainer>
        )}
     </div>
  )
}

// ==========================================
// 3. COURSE REP FLOW COMPONENT
// ==========================================
const CourseRepFlow = ({ step, data, setData, onNext }: any) => {
    // Calculate price for cohort bundle
    const cohortPrice = Math.round(parseInt(data.courseCount || '1') * PRICING.SINGLE_COURSE * (1 - PRICING.BUNDLE_DISCOUNT));
  
    return (
      <div className="max-w-md mx-auto space-y-8">
        {step === 3 && (
          <StaggerContainer>
            <h2 className="text-2xl font-light text-white mb-6">Cohort <span className="font-bold text-amber-400">Identity</span></h2>
            <div className="space-y-4">
               <div>
                  <label className="text-xs font-mono text-slate-400 mb-2 block">COHORT NAME</label>
                  <NeoInput 
                     placeholder="e.g. CS Level 200" 
                     value={data.cohortName} 
                     onChange={(e: any) => setData({...data, cohortName: e.target.value})} 
                  />
               </div>
               <div>
                  <label className="text-xs font-mono text-slate-400 mb-2 block">CLASS SIZE (APPROX)</label>
                  <div className="grid grid-cols-3 gap-2">
                     {['50', '100', '200+'].map(size => (
                        <button key={size} onClick={() => setData({...data, approxStudents: size})}
                           className={`py-3 rounded-xl border font-bold text-sm transition-all ${data.approxStudents === size ? 'border-amber-500 bg-amber-500/20 text-amber-300' : 'border-white/10 bg-slate-900/40'}`}>
                           {size}
                        </button>
                     ))}
                  </div>
               </div>
               <MagButton onClick={onNext} className="w-full mt-4">Next Step</MagButton>
            </div>
          </StaggerContainer>
        )}
  
        {step === 4 && (
           <StaggerContainer>
              <div className="text-center space-y-6">
                 <h3 className="text-xl text-white">How many courses this semester?</h3>
                 <div className="flex justify-center items-center gap-6">
                    <button onClick={() => setData({...data, courseCount: Math.max(1, parseInt(data.courseCount) - 1).toString()})} 
                       className="w-12 h-12 rounded-full bg-slate-800 border border-white/10 text-white font-bold hover:bg-slate-700">-</button>
                    <span className="text-5xl font-mono text-amber-400">{data.courseCount}</span>
                    <button onClick={() => setData({...data, courseCount: (parseInt(data.courseCount) + 1).toString()})}
                       className="w-12 h-12 rounded-full bg-slate-800 border border-white/10 text-white font-bold hover:bg-slate-700">+</button>
                 </div>
                 <MagButton onClick={onNext} className="w-full">Calculate Pricing</MagButton>
              </div>
           </StaggerContainer>
        )}
  
        {step === 5 && (
           <StaggerContainer>
              <div className="text-center">
                 <div className="p-8 rounded-3xl border border-emerald-500/30 bg-emerald-900/10 mb-8 relative overflow-hidden">
                    <div className="absolute inset-0 bg-emerald-500/5 blur-xl"></div>
                    <div className="relative z-10">
                        <Sparkles className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                        <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-2">Per Student / Semester</h3>
                        <div className="text-5xl font-mono font-light text-white">
                        ₵{cohortPrice}
                        </div>
                        <p className="text-xs text-emerald-200/50 mt-2">Includes {data.courseCount} Courses + AI Tutor</p>
                    </div>
                 </div>
                 <MagButton onClick={onNext} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white">
                    Launch Cohort Space 🚀
                 </MagButton>
              </div>
           </StaggerContainer>
        )}
      </div>
    )
}

// ==========================================
// 4. MAIN WIZARD CONTAINER
// ==========================================
export default function OnboardingWizard({ userId, role, isCourseRep, onComplete }: any) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [universities, setUniversities] = useState([]);
  const [interestsList, setInterestsList] = useState([]);
  
  // --- STATE FOR ALL ROLES ---
  // Student
  const [studentData, setStudentData] = useState({ university_id: '', custom_university: '', student_id_code: '', isOtherUni: false, selectedInterests: [] as string[] });
  // Lecturer
  const [lecturerData, setLecturerData] = useState({ type: '', classCount: '1', studentCount: '20', hasTAs: 'no', selectedTier: 'starter' });
  // Course Rep
  const [repData, setRepData] = useState({ cohortName: '', courseCount: '6', approxStudents: '50' });

  const [mascotState, setMascotState] = useState<{emotion: MascotEmotion, action: MascotAction}>({ emotion: 'idle', action: 'wave' });

  // Init Data Fetch
  useEffect(() => {
     const fetchData = async () => {
        // Fetch Unis
        const { data: unis } = await supabase.from('universities').select('id, name').eq('is_active', true);
        if (unis) setUniversities(unis as any);

        // Fetch Interests
        const { data: ints } = await supabase.from('interests').select('*').limit(20);
        if (ints) setInterestsList(ints as any);
     }
     fetchData();
     setTimeout(() => setMascotState({ emotion: 'happy', action: 'wave' }), 500);
  }, []);

  // --- HANDLERS ---
  const handleStudentFinish = async () => {
     setLoading(true);
     try {
        const updates: any = { 
           onboarding_completed: true, 
           student_id_code: studentData.student_id_code,
           interests: studentData.selectedInterests
        };
        
        if (studentData.isOtherUni) updates.custom_university = studentData.custom_university;
        else updates.university_id = studentData.university_id;

        await supabase.from('users').update(updates).eq('id', userId);
        setMascotState({ emotion: 'happy', action: 'backflip' });
        setTimeout(onComplete, 1500);
     } catch (e: any) {
        toast.error(e.message);
        setLoading(false);
     }
  }

  const handleLecturerFinish = async () => {
     setLoading(true);
     // Simulate processing...
     setTimeout(() => {
        const price = calculateSaaSPrice(parseInt(lecturerData.studentCount));
        
        if (price > 0) {
           // Redirect to Payment
           window.location.href = `/checkout?plan=pro&seats=${lecturerData.studentCount}`;
        } else {
           // Free Tier - Mark complete
           onComplete();
        }
     }, 1000);
  }

  const handleRepFinish = async () => {
    setLoading(true);
    try {
        const prefix = repData.cohortName.substring(0, 3).toUpperCase();
        const accessCode = `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
        
        // Create the class bundle
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
    
        const { error } = await supabase.from('classes').insert([classData]);
        if (error) throw error;
    
        // Update user status
        await supabase.from('users').update({ onboarding_completed: true, is_course_rep: true }).eq('id', userId);

        setMascotState({ emotion: 'happy', action: 'dance' });
        toast.success(`Cohort Created! Code: ${accessCode}`);
        setTimeout(onComplete, 2000);
    
    } catch (e: any) {
        toast.error(e.message || 'Failed to create cohort');
        setLoading(false);
    }
  };

  // Determine Max Steps based on Role
  const getMaxSteps = () => {
      if (role === 'lecturer') return 3;
      if (isCourseRep) return 5; // Steps 3,4,5 are for Reps
      return 2; // Student
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
       <GlassCanvas className="w-full max-w-5xl h-[85vh] grid lg:grid-cols-2">
          
          {/* LEFT: VISUALS (Mascot) */}
          <div className="hidden lg:flex flex-col items-center justify-center relative p-12 border-r border-white/5">
             <div className="relative z-20 transform scale-125">
                <UniBotMascot size={280} emotion={mascotState.emotion} action={mascotState.action} />
             </div>
             <div className="relative z-20 text-center mt-12">
                <h1 className="text-4xl font-black text-white mb-2 tracking-tight">
                   {role === 'lecturer' ? 'Command Center' : 'System Init'}
                </h1>
                <p className="text-indigo-200 font-mono text-sm">
                   v2.0.4 // {step === 1 ? 'ESTABLISHING_CONNECTION' : 'CALIBRATING_PARAMETERS'}
                </p>
             </div>
          </div>

          {/* RIGHT: LOGIC (Forms) */}
          <div className="flex flex-col h-full bg-slate-950/50">
             {/* Header Progress */}
             <div className="p-8 border-b border-white/5 flex justify-between items-center">
                <div className="flex gap-2">
                   {Array.from({ length: getMaxSteps() }).map((_, i) => {
                      const s = role === 'student' ? i + 1 : (isCourseRep ? i + 3 : i + 1); // Adjust visual index if needed
                      const currentVisualStep = i + 1;
                      // Logic to light up bars
                      const isActive = (isCourseRep && step >= 3) ? (step - 2 >= currentVisualStep) : (step >= currentVisualStep);
                      
                      return (
                        <div key={i} className={`h-1 w-8 rounded-full transition-all ${isActive ? 'bg-indigo-500 shadow-[0_0_10px_#6366f1]' : 'bg-slate-800'}`} />
                      )
                   })}
                </div>
                <span className="text-xs font-mono text-slate-500">STEP {step < 10 ? `0${step}` : step}</span>
             </div>

             {/* Dynamic Form Area */}
             <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                
                {/* 1. STUDENT FLOW */}
                {role === 'student' && (
                   <StudentFlow 
                      step={step} 
                      data={studentData} 
                      setData={setStudentData} 
                      interests={interestsList}
                      universities={universities}
                      onNext={() => {
                         if (step === 1) {
                            if (!studentData.university_id && !studentData.custom_university) return toast.error("Institution required");
                            setStep(2);
                         } else {
                            handleStudentFinish();
                         }
                      }} 
                   />
                )}

                {/* 2. COURSE REP FLOW (Overrides Student Flow if isCourseRep is true) */}
                {isCourseRep && (
                    <CourseRepFlow
                        step={step} // Starts at 3 usually if continuing from Student, or distinct
                        data={repData}
                        setData={setRepData}
                        onNext={() => {
                            if (step < 5) setStep(s => s + 1);
                            else handleRepFinish();
                        }}
                    />
                )}

                {/* 3. LECTURER FLOW */}
                {role === 'lecturer' && (
                   <LecturerFlow 
                      step={step} 
                      data={lecturerData} 
                      setData={setLecturerData} 
                      onNext={() => {
                         if (step < 3) setStep(s => s + 1);
                         else handleLecturerFinish();
                      }} 
                   />
                )}
             </div>
          </div>
       </GlassCanvas>
    </div>
  )
}