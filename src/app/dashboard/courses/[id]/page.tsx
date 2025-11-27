'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function EnhancedCoursePage() {
  const params = useParams();
  const courseId = params?.id as string;
  const router = useRouter();
  
  // --- DATA STATE ---
  const [course, setCourse] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [isCourseRep, setIsCourseRep] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [mainHandout, setMainHandout] = useState<any>(null);
  const [supplementaryMaterials, setSupplementaryMaterials] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  
  // --- ACCESS STATE ---
  const [hasAccess, setHasAccess] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [isPaywalledCourse, setIsPaywalledCourse] = useState(false);
  
  // --- UI STATE ---
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'content' | 'assignments'>('content');
  
  // --- MODALS ---
  const [showModal, setShowModal] = useState<'topic' | 'quiz' | 'manual' | 'announce' | 'assignment' | 'submissions' | 'result_slip' | 'review_grading' | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [submissionsList, setSubmissionsList] = useState<any[]>([]);
  const [mySubmission, setMySubmission] = useState<any>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  
  // --- FORMS ---
  const [topicForm, setTopicForm] = useState({ week_number: 1, title: '', description: '', start_page: 1, end_page: 1 });
  const [announcementForm, setAnnouncementForm] = useState({ title: '', message: '' });
  const [quizConfig, setQuizConfig] = useState({ topic: '', difficulty: 'Medium', numQuestions: 5, type: 'Multiple Choice' });
  const [manualQuestionsForm, setManualQuestionsForm] = useState({ questions: '', action: 'convert', file: null as File | null });
  const [assignForm, setAssignForm] = useState({ title: '', description: '', total_points: 100, due_date: '' });
  const [gradeOverride, setGradeOverride] = useState<{ score: number | string, feedback: string }>({ score: 0, feedback: '' });

  useEffect(() => {
    fetchCourseData();
  }, [courseId]);

  const fetchCourseData = async () => {
    if (!courseId) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push('/login');
    setUserId(user.id);

    const { data: profile } = await supabase.from('users').select('role, is_course_rep').eq('id', user.id).single();
    setRole(profile?.role);
    setIsCourseRep(profile?.is_course_rep || false);

    // Fetch Course Data
    const { data: courseData, error } = await supabase
        .from('courses')
        .select(`*, classes ( id, lecturer_id, users:lecturer_id ( plan_tier ) )`)
        .eq('id', courseId)
        .single();
    
    if (error) {
      setErrorMsg("Course not found.");
      setLoading(false);
      return;
    }
    setCourse(courseData);

    // --- PAYWALL LOGIC ---
    // Check if current user is the owner (Lecturer or Rep who created it)
    const isOwner = courseData.classes?.lecturer_id === user.id;
    
    // Paywall logic applies ONLY to students who are NOT the owner
    if (profile?.role === 'student' && !isOwner) {
        const ownerPlan = courseData.classes?.users?.plan_tier;
        
        // If owner is a Rep (cohort_manager), enable paywall logic for regular students
        if (ownerPlan === 'cohort_manager') {
            setIsPaywalledCourse(true); 
            
            // Check if student has paid for this course
            const { data: access } = await supabase
                .from('student_course_access')
                .select('id')
                .eq('student_id', user.id)
                .eq('course_id', courseId)
                .maybeSingle();
            
            setHasAccess(!!access);
        } else {
            // If owner is a Lecturer (on starter/pro/elite), content is free for students
            setHasAccess(true); 
        }
    } else {
        // Lecturers, TAs, and Course Rep Owners always have access
        setHasAccess(true); 
    }

    // Fetch Content
    const { data: handout } = await supabase.from('materials').select('*').eq('course_id', courseId).eq('is_main_handout', true).maybeSingle();
    setMainHandout(handout);

    const { data: supps } = await supabase.from('supplementary_materials').select('*').eq('course_id', courseId).order('created_at', { ascending: false });
    setSupplementaryMaterials(supps || []);

    const { data: topicsData } = await supabase.from('course_topics').select('*, quizzes(id)').eq('course_id', courseId).order('week_number');
    setTopics(topicsData || []);

    const { data: assigns } = await supabase.from('assignments').select('*').eq('course_id', courseId).order('due_date');
    
    if (profile?.role === 'student' && !isOwner) {
      const { data: subs } = await supabase.from('assignment_submissions').select('*').eq('student_id', user.id);
      const mergedAssigns = assigns?.map(a => {
        const sub = subs?.find(s => s.assignment_id === a.id);
        return { ...a, mySubmission: sub };
      });
      setAssignments(mergedAssigns || []);
    } else {
      setAssignments(assigns || []);
    }

    if (courseData?.class_id) {
      const { data: anns } = await supabase.from('class_announcements').select('*').eq('class_id', courseData.class_id).order('created_at', { ascending: false });
      setAnnouncements(anns || []);
    }

    setLoading(false);
  };

  // 🔒 PERMISSIONS
  const isOwner = course?.classes?.lecturer_id === userId;
  // Can edit if you are a Lecturer OR if you are the Student Rep who owns this class
  const canEdit = role === 'lecturer' || (role === 'student' && isCourseRep && isOwner);
  
  // Note: Course Reps can invite lecturers, but typically don't upload content themselves
  // However, we allow it here so they can set up the initial structure if needed.
  // You can restrict `canEdit` further if you want Reps to be "Read Only" regarding content.
  
  const canViewAnalysis = canEdit; 

  // --- HELPER: EXTRACT TEXT ---
  const extractTextFromPDF = async (file: File) => {
    try {
      const pdfjsLib = await import('pdfjs-dist');
      // ✅ FIX: Use the version matching your package.json (5.4.394)
      // Using unpkg to fetch the worker file directly
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@5.4.394/build/pdf.worker.min.mjs`;

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = "";
      // Limit to first 15 pages to save tokens/processing
      const maxPages = Math.min(pdf.numPages, 15); 
      for (let i = 1; i <= maxPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        // @ts-ignore
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += `\n${pageText}`;
      }
      return fullText;
    } catch (e) { 
        console.error("PDF Extraction Error:", e);
        return ""; 
    }
  };

  // --- PAYMENT HANDLER (Placeholder) ---
  const handlePayment = async (amount: number, type: 'single' | 'bundle') => {
      // PAYMENT SIMULATION
      if(confirm(`Simulate Payment of ₵${amount}?`)) {
          const { error } = await supabase.from('student_course_access').insert({
              student_id: userId,
              course_id: courseId,
              access_type: type === 'bundle' ? 'full_semester' : 'trial'
          });
          
          if (error) {
              alert("Error processing access: " + error.message);
          } else {
              alert("Payment Successful! Content Unlocked.");
              setHasAccess(true);
              setShowPaywall(false);
          }
      }
  };

  // --- ACTION HANDLERS (View/Edit) ---

  const handleViewSubmissions = async (assignId: string, title: string) => {
    setLoading(true);
    setSelectedItem({ title });
    
    const { data: subs, error } = await supabase
      .from('assignment_submissions')
      .select('*, users(full_name, email)')
      .eq('assignment_id', assignId)
      .order('submitted_at', { ascending: false });

    if (error) alert(error.message);
    
    setSubmissionsList(subs || []);
    setShowModal('submissions');
    setLoading(false);
  };

  const handleViewMyResult = (submission: any, assignTitle: string) => {
    setMySubmission(submission);
    setSelectedItem({ title: assignTitle });
    setShowModal('result_slip');
  };

  const openReviewModal = (submission: any) => {
    setSelectedSubmission(submission);
    const currentScore = submission.lecturer_grade !== null ? submission.lecturer_grade : submission.ai_grade;
    setGradeOverride({ 
      score: currentScore, 
      feedback: submission.lecturer_feedback || "" 
    });
    setShowModal('review_grading');
  };

  const handleSaveGrade = async () => {
    if (!selectedSubmission) return;
    const finalScore = gradeOverride.score === '' ? 0 : Number(gradeOverride.score);

    const { error } = await supabase.from('assignment_submissions')
      .update({ 
        lecturer_grade: finalScore, 
        lecturer_feedback: gradeOverride.feedback 
      })
      .eq('id', selectedSubmission.id);

    if (error) alert(error.message);
    else {
      alert("Grade Updated!");
      setShowModal('submissions');
      const { data: subs } = await supabase.from('assignment_submissions').select('*, users(full_name, email)').eq('assignment_id', selectedSubmission.assignment_id).order('submitted_at', { ascending: false });
      setSubmissionsList(subs || []);
    }
  };

  // --- UPLOAD HANDLERS ---

  const handleUploadMainHandout = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    setUploading(true);
    const file = e.target.files[0];
    
    try {
      const extractedText = await extractTextFromPDF(file);
      
      // DEBUG: Check if text was extracted
      if (!extractedText || extractedText.length < 50) {
          console.warn("Warning: Low text extraction. PDF might be scanned.");
      } else {
          console.log("✅ Text extracted successfully:", extractedText.length, "chars");
      }

      const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `${courseId}/handout_${Date.now()}_${cleanName}`;
      
      await supabase.storage.from('course-content').upload(filePath, file);
      const { data: { publicUrl } } = supabase.storage.from('course-content').getPublicUrl(filePath);

      if (mainHandout) await supabase.from('materials').delete().eq('id', mainHandout.id);

      await supabase.from('materials').insert([{
        course_id: courseId, title: file.name, file_url: publicUrl, file_type: file.type, is_main_handout: true, content_text: extractedText
      }]);
      
      alert('Main Handout Uploaded!');
      fetchCourseData();
    } catch (error: any) {
      alert('Upload failed: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleUploadSupplementary = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    setUploading(true);
    const file = e.target.files[0];
    try {
      const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `${courseId}/supp_${Date.now()}_${cleanName}`;
      await supabase.storage.from('course-content').upload(filePath, file);
      const { data: { publicUrl } } = supabase.storage.from('course-content').getPublicUrl(filePath);
      await supabase.from('supplementary_materials').insert([{ course_id: courseId, title: file.name, file_url: publicUrl, file_type: file.type }]);
      alert('Material uploaded!'); fetchCourseData();
    } catch (error: any) { alert('Error: ' + error.message); } finally { setUploading(false); }
  };

  // --- SUBMISSION & QUIZ HANDLERS ---

  const handleAssignmentSubmission = async (e: React.ChangeEvent<HTMLInputElement>, assignId: string, title: string, desc: string, maxPoints: number) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    setUploading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: prev } = await supabase.from('assignment_submissions').select('attempt_count').eq('assignment_id', assignId).eq('student_id', user.id).maybeSingle();
      const attempts = prev?.attempt_count || 0;

      if (attempts >= 2) {
        alert("🚫 Limit Reached: You have used all 2 attempts.");
        setUploading(false);
        return;
      }

      if (!confirm(`Submit "${file.name}"? \nAttempt ${attempts + 1}/2. \n(This will replace your previous file)`)) {
        setUploading(false);
        return;
      }

      let text = "";
      if (file.type === 'application/pdf') {
        text = await extractTextFromPDF(file);
        if (!text || text.trim().length < 20) {
            console.warn("⚠️ Warning: Extracted text is empty or too short.");
        } else {
            console.log(`✅ Extracted ${text.length} characters for grading.`);
        }
      } else {
        text = "Non-PDF submission."; 
        alert("⚠️ Warning: AI Grading only works with readable PDFs.");
      }

      const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const path = `${courseId}/assignments/${Date.now()}_${cleanName}`;
      
      const { error: uploadError } = await supabase.storage.from('course-content').upload(path, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('course-content').getPublicUrl(path);

      let aiResult = { score: 0, feedback: "Pending", is_ai_generated: false, breakdown: {} };
      
      if (text.length > 50) {
         console.log("🚀 Sending text to Grading API...");
         const res = await fetch('/api/grade-assignment', { 
           method: 'POST', 
           body: JSON.stringify({ 
             assignmentTitle: title, 
             assignmentDescription: desc, 
             studentText: text,
             maxPoints: maxPoints
           }) 
         });
         
         if (res.ok) {
             aiResult = await res.json();
             console.log("✅ AI Grading Result:", aiResult);
         } else {
             console.error("❌ AI Grading API Failed:", res.status);
         }
      } else {
          aiResult.feedback = "Could not read document text (Scanned PDF or Non-PDF). Waiting for lecturer review.";
      }

      await supabase.from('assignment_submissions').upsert({
        assignment_id: assignId, 
        student_id: user.id, 
        file_url: publicUrl, 
        content_text: text, 
        ai_grade: aiResult.score, 
        ai_feedback: aiResult.feedback, 
        ai_is_detected: aiResult.is_ai_generated, 
        ai_breakdown: aiResult.breakdown, 
        attempt_count: attempts + 1
      }, { onConflict: 'assignment_id, student_id' });

      alert(`Submitted! AI Grade: ${aiResult.score}/${maxPoints}`);
      fetchCourseData();
      
    } catch (error: any) { 
        console.error("Submission Error:", error);
        alert('Error: ' + error.message); 
    } finally { 
        setUploading(false); 
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    const { error } = await supabase.from('assignments').insert([{ course_id: courseId, ...assignForm }]);
    if (error) alert(error.message);
    else { alert("Assignment Created!"); setShowModal(null); fetchCourseData(); }
    setProcessing(false);
  };

  const handleGenerateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mainHandout) return alert("Upload a handout first!");
    setProcessing(true);
    try {
      const res = await fetch('/api/generate-quiz', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ documentText: mainHandout.content_text || "Text", ...quizConfig }) });
      if (!res.ok) throw new Error("AI Generation Failed");
      const { quiz } = await res.json();
      const { data: quizRecord, error: qError } = await supabase.from('quizzes').insert([{ course_id: courseId, topic_id: selectedItem.id, title: `Quiz: ${quizConfig.topic}`, topic: quizConfig.topic }]).select().single();
      if (qError) throw qError;
      const questions = quiz.map((q: any) => ({ quiz_id: quizRecord.id, question_text: q.question, options: q.options, correct_answer: q.correct_answer, explanation: q.explanation }));
      await supabase.from('questions').insert(questions);
      alert("Quiz Generated!"); setShowModal(null); fetchCourseData();
    } catch (error: any) { alert(error.message); } finally { setProcessing(false); }
  };

  const handleManualQuestions = async (e: React.FormEvent) => {
    e.preventDefault(); setProcessing(true);
    try {
      let content = manualQuestionsForm.questions;
      if (manualQuestionsForm.file) {
         if(manualQuestionsForm.file.type === 'application/pdf') content = await extractTextFromPDF(manualQuestionsForm.file);
         else content = await manualQuestionsForm.file.text();
      }
      const res = await fetch('/api/process-manual-questions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ questions: content, action: manualQuestionsForm.action, topicId: selectedItem.id }) });
      if (!res.ok) throw new Error("Processing Failed");
      const { quiz } = await res.json();
      const { data: quizRecord, error: qError } = await supabase.from('quizzes').insert([{ course_id: courseId, topic_id: selectedItem.id, title: `Quiz: ${selectedItem.title} (Manual)`, topic: selectedItem.title }]).select().single();
      if (qError) throw qError;
      const questions = quiz.map((q: any) => ({ quiz_id: quizRecord.id, question_text: q.question, options: q.options, correct_answer: q.correct_answer, explanation: q.explanation }));
      await supabase.from('questions').insert(questions);
      alert("Quiz Created!"); setShowModal(null); fetchCourseData();
    } catch (error: any) { alert(error.message); } finally { setProcessing(false); }
  };

  const handleAddTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('course_topics').insert([{ course_id: courseId, ...topicForm }]);
    if (error) alert(error.message); else { setShowModal(null); fetchCourseData(); }
  };

  const handleSendAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('class_announcements').insert([{ class_id: course.class_id, lecturer_id: user?.id, ...announcementForm }]);
    if (error) alert(error.message); else { setShowModal(null); fetchCourseData(); }
  };

  const handleDeleteQuiz = async (quizId: string) => {
    if(!confirm("Delete this quiz?")) return;
    await supabase.from('quizzes').delete().eq('id', quizId);
    fetchCourseData();
  };
  
  const handleDeleteAssignment = async (id: string) => {
    if(!confirm("Delete assignment? All submissions will be lost.")) return;
    await supabase.from('assignments').delete().eq('id', id);
    fetchCourseData();
  };

  if (loading) return <div className="p-20 text-center">Loading Course...</div>;
  if (errorMsg) return <div className="p-20 text-center text-red-500">{errorMsg}</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-7xl">
        <button onClick={() => router.back()} className="mb-4 text-sm text-gray-500 hover:text-gray-900">← Back</button>
        
        {/* HEADER */}
        <div className="bg-white rounded-xl shadow-sm p-8 mb-6 border-l-4 border-blue-600 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{course?.title}</h1>
            <p className="text-gray-600 mt-1">{course?.classes?.name}</p>
            {isPaywalledCourse && !hasAccess && (
                <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded mt-2 inline-block">🔒 Locked (Preview)</span>
            )}
          </div>
          {canEdit && (
            <div className="flex gap-2">
              {isCourseRep ? (
                  <button onClick={() => alert("Invite Link: [Copied]")} className="px-4 py-2 bg-purple-600 text-white rounded font-bold text-sm">Invite Lecturer</button>
              ) : (
                  <>
                    <button onClick={() => setShowModal('topic')} className="px-4 py-2 bg-blue-600 text-white rounded font-bold text-sm">+ Add Week</button>
                    <button onClick={() => setShowModal('announce')} className="px-4 py-2 bg-green-600 text-white rounded font-bold text-sm">Announce</button>
                  </>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-6 border-b border-gray-200 mb-6">
          <button onClick={() => setActiveTab('content')} className={`pb-2 font-bold ${activeTab === 'content' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}>Course Content</button>
          <button onClick={() => setActiveTab('assignments')} className={`pb-2 font-bold ${activeTab === 'assignments' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}>Assignments & Grades</button>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            
            {activeTab === 'content' ? (
              <>
                {/* HANDOUT */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">📕 Main Handout</h2>
                  {mainHandout ? (
                    <div className="flex justify-between items-center bg-gray-50 p-3 rounded border">
                      <span className="font-bold text-gray-800">{mainHandout.title}</span>
                      <div className="flex gap-2">
                        <a href={mainHandout.file_url} target="_blank" className="px-3 py-1 bg-gray-200 text-gray-800 text-xs font-bold rounded border hover:bg-gray-300">View PDF</a>
                        <Link href={`/dashboard/chat/${mainHandout.id}`} className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded hover:bg-purple-200">💬 AI Tutor</Link>
                      </div>
                    </div>
                  ) : (
                    canEdit ? (
                      !isCourseRep ? (
                        <input type="file" accept=".pdf" onChange={handleUploadMainHandout} disabled={uploading} className="block w-full text-sm text-gray-900 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
                      ) : <p className="text-gray-500 italic text-sm">Invite a lecturer to upload content.</p>
                    ) : <p className="text-gray-500 italic">No handout yet.</p>
                  )}
                </div>

                {/* TOPICS (Weeks) */}
                <div className="space-y-4">
                  {topics.map(topic => {
                    // LOCK LOGIC: Week 1 is free. Week 2+ requires payment if paywalled.
                    const isLocked = isPaywalledCourse && !hasAccess && topic.week_number > 1;

                    return (
                        <div key={topic.id} className={`bg-white p-5 rounded-xl shadow-sm border ${isLocked ? 'border-red-100 opacity-80' : 'border-gray-100'}`}>
                        <div className="flex justify-between items-start">
                            <div>
                            <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                                Week {topic.week_number}: {topic.title}
                                {isLocked && <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-extrabold tracking-wide uppercase border border-red-200">Locked</span>}
                            </h3>
                            <p className="text-gray-600 text-sm mt-1">{topic.description}</p>
                            <p className="text-xs text-gray-400 mt-1">Pages {topic.start_page}-{topic.end_page}</p>
                            </div>
                            
                            {mainHandout && (
                                isLocked ? (
                                    <button disabled className="px-3 py-1 bg-gray-100 text-gray-400 text-xs font-bold rounded border border-gray-200 cursor-not-allowed">
                                        Ask AI 🔒
                                    </button>
                                ) : (
                                    <Link href={`/dashboard/chat/${mainHandout.id}?pages=${topic.start_page}-${topic.end_page}`} className="px-3 py-1 bg-purple-50 text-purple-600 text-xs font-bold rounded h-fit border border-purple-100 hover:bg-purple-100 transition">
                                        Ask AI
                                    </Link>
                                )
                            )}
                        </div>

                        <div className="mt-4 flex gap-2 items-center">
                            {isLocked ? (
                                <button 
                                    onClick={() => setShowPaywall(true)} 
                                    className="w-full py-2 bg-linear-to-r from-red-500 to-orange-500 text-white text-xs font-bold rounded shadow-lg hover:shadow-xl transition transform hover:-translate-y-0.5 flex justify-center items-center gap-2"
                                >
                                    <span>🔓 Unlock Week {topic.week_number} & More</span>
                                </button>
                            ) : (
                                <>
                                    {topic.quizzes?.[0] ? (
                                    <>
                                        <Link href={canViewAnalysis ? `/dashboard/quiz/${topic.quizzes[0].id}/gradebook` : `/dashboard/quiz/${topic.quizzes[0].id}`} className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded hover:bg-green-200">
                                        {canViewAnalysis ? '✅ View & Grade' : '📝 Take Quiz'}
                                        </Link>
                                        {canEdit && !isCourseRep && (
                                        <button onClick={() => handleDeleteQuiz(topic.quizzes[0].id)} className="text-xs text-red-500 hover:underline">Delete Quiz</button>
                                        )}
                                    </>
                                    ) : canEdit && !isCourseRep ? (
                                    <>
                                        <button onClick={() => { setSelectedItem(topic); setShowModal('quiz'); }} className="px-3 py-1 bg-orange-50 text-orange-600 text-xs font-bold rounded hover:bg-orange-100 border border-orange-200">✨ AI Quiz</button>
                                        <button onClick={() => { setSelectedItem(topic); setShowModal('manual'); }} className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded hover:bg-gray-100 border border-gray-200">📝 Manual Quiz</button>
                                    </>
                                    ) : <span className="text-xs text-gray-400">No quiz available.</span>}
                                </>
                            )}
                        </div>
                        </div>
                    );
                  })}
                </div>
              </>
            ) : (
              /* ASSIGNMENTS TAB */
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold text-gray-900">Assignments</h2>
                  {canEdit && !isCourseRep && <button onClick={() => setShowModal('assignment')} className="px-3 py-1 bg-blue-600 text-white text-sm rounded font-bold">+ Create</button>}
                </div>
                {assignments.map(assign => {
                  const isLate = new Date() > new Date(assign.due_date);
                  return (
                    <div key={assign.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-lg text-gray-900">{assign.title}</h3>
                          <p className="text-sm text-gray-600 mt-1">{assign.description}</p>
                          <div className="flex gap-2 mt-2 items-center">
                             <p className={`text-xs font-bold ${isLate ? 'text-red-600' : 'text-green-600'}`}>
                                Due: {new Date(assign.due_date).toLocaleDateString()}{isLate ? ' (Closed)' : ''}
                             </p>
                             <span className="bg-gray-100 px-2 py-0.5 rounded text-[10px] font-bold text-gray-700">{assign.total_points} Pts</span>
                          </div>
                        </div>
                        
                        {canEdit && !isCourseRep && <button onClick={() => handleDeleteAssignment(assign.id)} className="text-xs text-red-400 hover:text-red-600">Delete</button>}
                      </div>

                      {!canEdit && (
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          {assign.mySubmission ? (
                             <div className="flex justify-between items-center bg-green-50 p-3 rounded border border-green-100">
                                <div>
                                   <p className="text-sm font-bold text-green-800">✅ Submitted ({assign.mySubmission.attempt_count}/2)</p>
                                   <p className="text-xs text-green-600">Grade: {assign.mySubmission.lecturer_grade !== null ? assign.mySubmission.lecturer_grade : (assign.mySubmission.ai_grade || 'Pending')}</p>
                                </div>
                                <button onClick={() => handleViewMyResult(assign.mySubmission, assign.title)} className="text-xs bg-white border border-green-200 text-green-700 px-3 py-1 rounded hover:bg-green-100 font-bold">View Feedback</button>
                             </div>
                          ) : (
                             <div>
                                {isLate ? (
                                   <p className="text-sm text-red-500 italic">Submission closed.</p>
                                ) : (
                                   <>
                                     <p className="text-sm font-bold text-gray-700 mb-2">Submit Work (PDF/Doc)</p>
                                     <input type="file" accept=".pdf" onChange={(e) => handleAssignmentSubmission(e, assign.id, assign.title, assign.description, assign.total_points)} disabled={uploading} className="block w-full text-sm text-gray-900 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
                                     {uploading && <p className="text-xs text-blue-500 mt-2 animate-pulse">AI Grading in progress...</p>}
                                   </>
                                )}
                             </div>
                          )}
                        </div>
                      )}

                      {canEdit && (
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <button 
                            onClick={() => handleViewSubmissions(assign.id, assign.title)}
                            className="text-blue-600 text-sm font-bold hover:underline flex items-center gap-1"
                          >
                            <span>📂 View Submissions & Grades</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h3 className="font-bold text-gray-900 mb-4">📢 Announcements</h3>
              {announcements.map(a => (
                <div key={a.id} className="mb-3 pb-3 border-b border-gray-100 last:border-0">
                  <p className="text-sm font-bold text-gray-800">{a.title}</p>
                  <p className="text-xs text-gray-600 mt-1">{a.message}</p>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">📚 Resources</h2>
              {canEdit && !isCourseRep && <input type="file" accept=".pdf" onChange={handleUploadSupplementary} disabled={uploading} className="block w-full text-xs mb-4 text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-gray-100 file:text-gray-700"/>}
              {supplementaryMaterials.map(m => (
                <div key={m.id} className="flex justify-between items-center p-2 mb-2 bg-gray-50 rounded border border-gray-100">
                  <span className="text-xs truncate w-24 text-gray-700">{m.title}</span>
                  <a href={m.file_url} target="_blank" className="text-xs font-bold text-blue-600 hover:underline">Download</a>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* --- MODALS --- */}

        {/* PAYWALL MODAL */}
        {showPaywall && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-300">
                <div className="bg-white rounded-2xl p-8 w-full max-w-md text-center shadow-2xl border-t-4 border-blue-600 transform scale-100 transition-all">
                    <div className="text-5xl mb-4">🔓</div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Unlock {course?.title}</h2>
                    <p className="text-gray-500 mb-6">Get full access to all weekly notes, AI tutoring, and quiz grading for the entire semester.</p>
                    
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <button 
                            onClick={() => handlePayment(15, 'single')} 
                            className="p-4 border-2 border-blue-100 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition flex flex-col items-center"
                        >
                            <p className="text-xs font-bold text-gray-500 uppercase mb-1">This Course</p>
                            <p className="text-3xl font-bold text-blue-700">₵15</p>
                            <p className="text-[10px] text-gray-400 mt-1">One-time payment</p>
                        </button>
                        <button 
                            onClick={() => handlePayment(50, 'bundle')} 
                            className="p-4 border-2 border-purple-100 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition relative overflow-hidden flex flex-col items-center"
                        >
                            <span className="absolute top-0 right-0 bg-purple-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">BEST VALUE</span>
                            <p className="text-xs font-bold text-gray-500 uppercase mb-1">Semester Bundle</p>
                            <p className="text-3xl font-bold text-purple-700">₵50</p>
                            <p className="text-[10px] text-gray-400 mt-1">Access ALL 6 courses</p>
                        </button>
                    </div>
                    
                    <button onClick={() => setShowPaywall(false)} className="text-sm text-gray-400 hover:text-gray-600 underline font-medium">Maybe later</button>
                </div>
            </div>
        )}

        {/* 1. GRADEBOOK MODAL (List View) */}
        {showModal === 'submissions' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-5xl h-[85vh] overflow-y-auto shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900">Gradebook: {selectedItem?.title}</h3>
                <button onClick={() => setShowModal(null)} className="text-gray-500 hover:text-gray-800 text-2xl">×</button>
              </div>
              <table className="w-full text-sm text-left border-collapse">
                 <thead className="bg-gray-50 text-gray-600 border-b">
                    <tr>
                        <th className="p-3">Student</th>
                        <th className="p-3">Submitted</th>
                        <th className="p-3">AI Score</th>
                        <th className="p-3">Detection</th>
                        <th className="p-3">Final Grade</th>
                        <th className="p-3">Actions</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y">
                    {submissionsList.map(sub => (
                        <tr key={sub.id} className="hover:bg-gray-50">
                            <td className="p-3 font-bold text-gray-900">{sub.users?.full_name || 'Unknown'} <div className="text-xs text-gray-400 font-normal">{sub.users?.email}</div></td>
                            <td className="p-3 text-gray-500">{new Date(sub.submitted_at).toLocaleDateString()}</td>
                            <td className="p-3 text-blue-600 font-mono font-bold">{sub.ai_grade}</td>
                            <td className="p-3">
                               {sub.ai_is_detected ? <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">⚠️ AI Flag</span> : <span className="text-green-600 text-xs">Clean</span>}
                            </td>
                            <td className="p-3 font-bold text-gray-900 text-lg">{sub.lecturer_grade !== null ? sub.lecturer_grade : sub.ai_grade}</td>
                            <td className="p-3 flex gap-2">
                                <a href={sub.file_url} target="_blank" className="px-3 py-1 border rounded text-xs hover:bg-gray-100 text-blue-600">📄 File</a>
                                <button onClick={() => openReviewModal(sub)} className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700">Review</button>
                            </td>
                        </tr>
                    ))}
                 </tbody>
              </table>
              {submissionsList.length === 0 && <div className="p-10 text-center text-gray-400">No submissions yet.</div>}
            </div>
          </div>
        )}

        {/* 2. REVIEW MODAL (Detailed Grading) */}
        {showModal === 'review_grading' && selectedSubmission && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
             <div className="bg-white rounded-xl p-8 w-full max-w-3xl shadow-2xl h-[90vh] flex flex-col">
                <div className="flex justify-between mb-4">
                    <h2 className="text-2xl font-bold text-gray-900">Grading Review</h2>
                    <button onClick={() => setShowModal('submissions')} className="text-gray-500 hover:text-gray-800">Close</button>
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-6 pr-2">
                    <div className={`p-4 rounded-xl border ${selectedSubmission.ai_is_detected ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
                        <h4 className={`font-bold mb-2 ${selectedSubmission.ai_is_detected ? 'text-red-800' : 'text-blue-800'}`}>
                            🤖 AI Analysis {selectedSubmission.ai_is_detected && '(SUSPICIOUS)'}
                        </h4>
                        <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                            <div><strong>Score:</strong> {selectedSubmission.ai_grade}/{selectedItem?.total_points || 100}</div>
                            <div><strong>Detection:</strong> {selectedSubmission.ai_is_detected ? 'Likely AI' : 'Human'}</div>
                        </div>
                        <div className="bg-white p-3 rounded border border-gray-200 text-sm text-gray-700 whitespace-pre-wrap">
                            {selectedSubmission.ai_breakdown?.reasoning || selectedSubmission.ai_feedback}
                        </div>
                    </div>

                    <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                        <h4 className="font-bold text-gray-900 mb-4">👨‍🏫 Lecturer Override</h4>
                        <div className="flex gap-4 mb-4">
                            <div className="w-1/3">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Final Score</label>
                                <input 
                                    type="number" 
                                    className="w-full border p-2 rounded text-lg font-bold text-gray-900 bg-white" 
                                    value={gradeOverride.score} 
                                    onChange={e => setGradeOverride({...gradeOverride, score: e.target.value === '' ? '' : parseInt(e.target.value)})}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Feedback</label>
                            <textarea 
                                className="w-full border p-3 rounded text-sm h-32 text-gray-900 bg-white" 
                                value={gradeOverride.feedback}
                                onChange={e => setGradeOverride({...gradeOverride, feedback: e.target.value})}
                                placeholder="Add your own feedback here..."
                            />
                        </div>
                    </div>
                </div>

                <div className="pt-4 border-t mt-4 text-right">
                    <button onClick={handleSaveGrade} className="px-6 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700">Save Final Grade</button>
                </div>
             </div>
           </div>
        )}

        {/* 3. RESULT SLIP (Student View) */}
        {showModal === 'result_slip' && mySubmission && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
             <div className="bg-white rounded-xl p-8 w-full max-w-2xl shadow-2xl">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Result Slip</h2>
                <p className="text-gray-600 mb-6">Assignment: {selectedItem?.title}</p>
                
                <div className="grid grid-cols-2 gap-6 mb-6">
                    <div className="bg-gray-50 p-4 rounded-xl text-center border">
                        <p className="text-xs font-bold text-gray-500 uppercase">AI Provisional</p>
                        <p className="text-3xl font-bold text-gray-700 mt-1">{mySubmission.ai_grade} / {selectedItem?.total_points || 100}</p>
                    </div>
                    <div className={`p-4 rounded-xl text-center border ${mySubmission.lecturer_grade !== null ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
                        <p className="text-xs font-bold uppercase text-gray-600">Final Grade</p>
                        <p className={`text-4xl font-bold mt-1 ${mySubmission.lecturer_grade !== null ? 'text-green-700' : 'text-yellow-600'}`}>
                            {mySubmission.lecturer_grade !== null ? mySubmission.lecturer_grade : 'Pending'}
                        </p>
                    </div>
                </div>

                <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 max-h-60 overflow-y-auto">
                    <h4 className="font-bold text-gray-900 mb-2">Feedback</h4>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {mySubmission.lecturer_feedback || mySubmission.ai_feedback}
                    </p>
                </div>

                <div className="mt-6 text-right">
                    <button onClick={() => setShowModal(null)} className="px-6 py-2 bg-gray-900 text-white rounded-lg font-bold hover:bg-gray-800">Close</button>
                </div>
             </div>
           </div>
        )}

        {/* OTHER MODALS */}
        {showModal === 'assignment' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">
              <h3 className="text-xl font-bold mb-4 text-gray-900">Create Assignment</h3>
              <form onSubmit={handleCreateAssignment} className="space-y-4">
                <input placeholder="Title" className="w-full border p-2 rounded text-gray-900 bg-white" onChange={e => setAssignForm({...assignForm, title: e.target.value})} required />
                <textarea placeholder="Instructions" className="w-full border p-2 rounded text-gray-900 h-24 bg-white" onChange={e => setAssignForm({...assignForm, description: e.target.value})} required />
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" placeholder="Points" className="w-full border p-2 rounded text-gray-900 bg-white" onChange={e => setAssignForm({...assignForm, total_points: parseInt(e.target.value)})} required />
                  <input type="date" className="w-full border p-2 rounded text-gray-900 bg-white" onChange={e => setAssignForm({...assignForm, due_date: e.target.value})} required />
                </div>
                <div className="flex gap-2"><button type="button" onClick={() => setShowModal(null)} className="flex-1 border py-2 rounded text-gray-700">Cancel</button><button type="submit" disabled={processing} className="flex-1 bg-blue-600 text-white py-2 rounded font-bold">Create</button></div>
              </form>
            </div>
          </div>
        )}

        {/* (Topic, Quiz, Manual, Announce Modals - Standard Implementation) */}
        {showModal === 'topic' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">
              <h3 className="text-xl font-bold mb-4 text-gray-900">Add Topic</h3>
              <form onSubmit={handleAddTopic} className="space-y-4">
                <input type="number" placeholder="Week #" value={topicForm.week_number} onChange={e => setTopicForm({...topicForm, week_number: parseInt(e.target.value)})} className="w-full border p-2 rounded text-gray-900 bg-white" required />
                <input placeholder="Title" value={topicForm.title} onChange={e => setTopicForm({...topicForm, title: e.target.value})} className="w-full border p-2 rounded text-gray-900 bg-white" required />
                <textarea placeholder="Description" value={topicForm.description} onChange={e => setTopicForm({...topicForm, description: e.target.value})} className="w-full border p-2 rounded text-gray-900 bg-white" />
                <div className="grid grid-cols-2 gap-2">
                    <input type="number" placeholder="Start Page" value={topicForm.start_page} onChange={e => setTopicForm({...topicForm, start_page: parseInt(e.target.value)})} className="w-full border p-2 rounded text-gray-900 bg-white" />
                    <input type="number" placeholder="End Page" value={topicForm.end_page} onChange={e => setTopicForm({...topicForm, end_page: parseInt(e.target.value)})} className="w-full border p-2 rounded text-gray-900 bg-white" />
                </div>
                <div className="flex gap-2"><button type="button" onClick={() => setShowModal(null)} className="flex-1 border py-2 rounded text-gray-700">Cancel</button><button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded">Add</button></div>
              </form>
            </div>
          </div>
        )}

        {showModal === 'announce' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">
              <h3 className="text-xl font-bold mb-4 text-gray-900">Send Announcement</h3>
              <form onSubmit={handleSendAnnouncement} className="space-y-4">
                <input placeholder="Title" value={announcementForm.title} onChange={e => setAnnouncementForm({...announcementForm, title: e.target.value})} className="w-full border p-2 rounded text-gray-900 bg-white" required />
                <textarea placeholder="Message" value={announcementForm.message} onChange={e => setAnnouncementForm({...announcementForm, message: e.target.value})} className="w-full border p-2 rounded text-gray-900 h-24 bg-white" required />
                <div className="flex gap-2"><button type="button" onClick={() => setShowModal(null)} className="flex-1 border py-2 rounded text-gray-700">Cancel</button><button type="submit" className="flex-1 bg-green-600 text-white py-2 rounded font-bold">Send</button></div>
              </form>
            </div>
          </div>
        )}

        {showModal === 'quiz' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">
              <h3 className="text-xl font-bold mb-4 text-orange-600">AI Quiz Generator</h3>
              <form onSubmit={handleGenerateQuiz} className="space-y-4">
                <input placeholder="Topic" value={quizConfig.topic} onChange={e => setQuizConfig({...quizConfig, topic: e.target.value})} className="w-full border p-2 rounded text-gray-900 bg-white" required />
                <div className="grid grid-cols-2 gap-2">
                  <select value={quizConfig.difficulty} onChange={e => setQuizConfig({...quizConfig, difficulty: e.target.value})} className="w-full border p-2 rounded text-gray-900 bg-white"><option>Easy</option><option>Medium</option><option>Hard</option></select>
                  <select value={quizConfig.numQuestions} onChange={e => setQuizConfig({...quizConfig, numQuestions: parseInt(e.target.value)})} className="w-full border p-2 rounded text-gray-900 bg-white"><option value={3}>3 Questions</option><option value={5}>5 Questions</option><option value={10}>10 Questions</option></select>
                </div>
                <div className="flex gap-2"><button type="button" onClick={() => setShowModal(null)} className="flex-1 border py-2 rounded text-gray-700">Cancel</button><button type="submit" disabled={processing} className="flex-1 bg-orange-600 text-white py-2 rounded font-bold">{processing ? 'Generating...' : 'Generate'}</button></div>
              </form>
            </div>
          </div>
        )}

        {showModal === 'manual' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-lg">
              <h3 className="text-xl font-bold mb-4 text-gray-900">Manual Quiz Creator</h3>
              <textarea value={manualQuestionsForm.questions} onChange={e => setManualQuestionsForm({...manualQuestionsForm, questions: e.target.value})} className="w-full border p-2 rounded text-gray-900 h-40 font-mono text-sm bg-white mb-4" placeholder="Type questions here..." />
              <input type="file" accept=".txt,.doc,.docx,.pdf" onChange={e => setManualQuestionsForm({...manualQuestionsForm, file: e.target.files?.[0] || null})} className="block w-full text-sm text-gray-900 mb-4"/>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <button onClick={() => setManualQuestionsForm({...manualQuestionsForm, action: 'convert'})} type="button" className={`p-2 border rounded text-sm ${manualQuestionsForm.action==='convert' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'text-gray-600'}`}>📝 Convert Only</button>
                <button onClick={() => setManualQuestionsForm({...manualQuestionsForm, action: 'enhance'})} type="button" className={`p-2 border rounded text-sm ${manualQuestionsForm.action==='enhance' ? 'bg-green-50 border-green-500 text-green-700' : 'text-gray-600'}`}>✨ AI Enhance</button>
              </div>
              <div className="flex gap-2 mt-4"><button type="button" onClick={() => setShowModal(null)} className="flex-1 border py-2 rounded text-gray-700">Cancel</button><button onClick={handleManualQuestions} disabled={processing} className="flex-1 bg-gray-900 text-white py-2 rounded font-bold">{processing ? 'Processing...' : 'Process'}</button></div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}