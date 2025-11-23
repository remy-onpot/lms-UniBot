'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import * as pdfjsLib from 'pdfjs-dist';

export default function EnhancedCoursePage() {
  const params = useParams();
  const courseId = params?.id as string;
  const router = useRouter();
  
  const [course, setCourse] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [mainHandout, setMainHandout] = useState<any>(null);
  const [supplementaryMaterials, setSupplementaryMaterials] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Modal states
  const [showTopicModal, setShowTopicModal] = useState(false);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [showManualQuestionsModal, setShowManualQuestionsModal] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<any>(null);
  
  const [topicForm, setTopicForm] = useState({
    week_number: 1,
    title: '',
    description: '',
    start_page: 1,
    end_page: 1
  });
  
  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    message: ''
  });
  
  const [quizConfig, setQuizConfig] = useState({
    topic: '',
    difficulty: 'Medium',
    numQuestions: 5,
    type: 'Multiple Choice'
  });

  const [manualQuestionsForm, setManualQuestionsForm] = useState({
    questions: '',
    action: 'convert', // 'convert' or 'enhance'
    file: null as File | null
  });

  useEffect(() => {
    fetchCourseData();
  }, [courseId]);

  // Mark announcements as read when student views them
  useEffect(() => {
    const markAnnouncementsAsRead = async () => {
      if (role === 'student' && announcements.length > 0) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Mark each announcement as read
        const reads = announcements.map(announcement => ({
          announcement_id: announcement.id,
          user_id: user.id
        }));

        // Insert read records (ignore duplicates)
        await supabase
          .from('announcement_reads')
          .upsert(reads, { onConflict: 'announcement_id,user_id' });
      }
    };

    if (announcements.length > 0) {
      markAnnouncementsAsRead();
    }
  }, [announcements, role]);

  const fetchCourseData = async () => {
    if (!courseId || courseId === 'undefined' || courseId === 'null') {
      setErrorMsg("Invalid Course ID.");
      setLoading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push('/login');

    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
    setRole(profile?.role);

    const { data: courseData, error } = await supabase
      .from('courses')
      .select('*, classes!inner(*)')
      .eq('id', courseId)
      .single();
    
    if (error) {
      setErrorMsg("Course not found.");
      setLoading(false);
      return;
    }

    setCourse(courseData);

    // Fetch main handout
    const { data: handout } = await supabase
      .from('materials')
      .select('*')
      .eq('course_id', courseId)
      .eq('is_main_handout', true)
      .maybeSingle();
    
    setMainHandout(handout);

    // Fetch supplementary materials
    const { data: suppMaterials } = await supabase
      .from('supplementary_materials')
      .select('*')
      .eq('course_id', courseId)
      .order('created_at', { ascending: false });
    
    setSupplementaryMaterials(suppMaterials || []);

    // Fetch topics with quizzes
    const { data: topicsData } = await supabase
      .from('course_topics')
      .select(`
        *,
        quizzes (
          id,
          title,
          topic
        )
      `)
      .eq('course_id', courseId)
      .order('week_number', { ascending: true });
    
    setTopics(topicsData || []);

    // Fetch announcements
    if (courseData?.class_id) {
      const { data: announcementsData } = await supabase
        .from('class_announcements')
        .select('*, users(full_name, email)')
        .eq('class_id', courseData.class_id)
        .order('created_at', { ascending: false })
        .limit(5);
      
      setAnnouncements(announcementsData || []);
    }

    setLoading(false);
  };

  const extractTextFromPDF = async (file: File): Promise<string> => {
    try {
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
      const pdf = await pdfjsLib.getDocument(await file.arrayBuffer()).promise;
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        // @ts-ignore
        fullText += textContent.items.map((item: any) => item.str).join(' ') + '\n';
      }
      return fullText;
    } catch (error) { return ""; }
  };

  const extractTextFromPDFPages = async (fileUrl: string, startPage: number, endPage: number): Promise<string> => {
    try {
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
      
      const response = await fetch(fileUrl);
      const arrayBuffer = await response.arrayBuffer();
      const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
      
      let extractedText = '';
      const start = Math.max(1, startPage);
      const end = Math.min(pdf.numPages, endPage);
      
      for (let i = start; i <= end; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        // @ts-ignore
        extractedText += textContent.items.map((item: any) => item.str).join(' ') + '\n';
      }
      
      return extractedText;
    } catch (error) {
      console.error('Error:', error);
      return "";
    }
  };

  const handleUploadMainHandout = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files.length) return;
    const file = e.target.files[0];
    setUploading(true);

    try {
      const extractedText = await extractTextFromPDF(file);
      const filePath = `${courseId}/handout_${Date.now()}_${file.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from('course-content')
        .upload(filePath, file);
      
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('course-content')
        .getPublicUrl(filePath);
      
      if (mainHandout) {
        await supabase.from('materials').delete().eq('id', mainHandout.id);
      }

      const { error: dbError } = await supabase.from('materials').insert([{
        course_id: courseId,
        title: file.name,
        file_url: publicUrl,
        file_type: file.type,
        content_text: extractedText,
        is_main_handout: true
      }]);

      if (dbError) throw dbError;
      
      alert('Main handout uploaded!');
      fetchCourseData();
    } catch (error: any) {
      alert('Upload failed: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleUploadSupplementary = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files.length) return;
    const file = e.target.files[0];
    setUploading(true);

    try {
      const filePath = `${courseId}/supp_${Date.now()}_${file.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from('course-content')
        .upload(filePath, file);
      
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('course-content')
        .getPublicUrl(filePath);
      
      const { error: dbError } = await supabase.from('supplementary_materials').insert([{
        course_id: courseId,
        title: file.name,
        file_url: publicUrl,
        file_type: file.type
      }]);

      if (dbError) throw dbError;
      
      alert('Supplementary material uploaded!');
      fetchCourseData();
    } catch (error: any) {
      alert('Upload failed: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleAddTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { error } = await supabase.from('course_topics').insert([{
        course_id: courseId,
        ...topicForm
      }]);

      if (error) throw error;
      
      alert('Week added!');
      setShowTopicModal(false);
      setTopicForm({ 
        week_number: topics.length + 2, 
        title: '', 
        description: '', 
        start_page: 1, 
        end_page: 1 
      });
      fetchCourseData();
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  };

  const handleSendAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase.from('class_announcements').insert([{
        class_id: course.class_id,
        lecturer_id: user?.id,
        ...announcementForm
      }]);

      if (error) throw error;
      
      alert('Announcement sent!');
      setShowAnnouncementModal(false);
      setAnnouncementForm({ title: '', message: '' });
      fetchCourseData();
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  };

  const openQuizModal = (topic: any) => {
    if (!mainHandout) return alert('Please upload the main handout first!');
    setSelectedTopic(topic);
    setQuizConfig({
      ...quizConfig,
      topic: `Week ${topic.week_number}: ${topic.title}`
    });
    setShowQuizModal(true);
  };

  const openManualQuestionsModal = (topic: any) => {
    setSelectedTopic(topic);
    setManualQuestionsForm({
      questions: '',
      action: 'convert',
      file: null
    });
    setShowManualQuestionsModal(true);
  };

  const handleManualQuestions = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowManualQuestionsModal(false);
    setGenerating(true);

    try {
      let questionsText = manualQuestionsForm.questions;

      // If file uploaded, extract text
      if (manualQuestionsForm.file) {
        const fileText = await manualQuestionsForm.file.text();
        questionsText = fileText;
      }

      if (!questionsText.trim()) {
        throw new Error('Please provide questions');
      }

      // Process with AI
      const res = await fetch('/api/process-manual-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questions: questionsText,
          action: manualQuestionsForm.action,
          topicId: selectedTopic.id
        })
      });

      if (!res.ok) throw new Error('Failed to process questions');

      const { quiz } = await res.json();

      // Create quiz
      const { data: quizRecord, error: quizError } = await supabase
        .from('quizzes')
        .insert([{
          course_id: courseId,
          topic_id: selectedTopic.id,
          title: `Quiz: Week ${selectedTopic.week_number} (Manual)`,
          topic: selectedTopic.title
        }])
        .select()
        .single();

      if (quizError) throw quizError;

      const questionsToInsert = quiz.map((q: any) => ({
        quiz_id: quizRecord.id,
        question_text: q.question,
        options: q.options,
        correct_answer: q.correct_answer,
        explanation: q.explanation
      }));

      await supabase.from('questions').insert(questionsToInsert);

      alert('Manual quiz created successfully! 🎉');
      fetchCourseData();
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowQuizModal(false);
    setGenerating(true);

    try {
      // Extract text from topic's page range
      const documentText = await extractTextFromPDFPages(
        mainHandout.file_url,
        selectedTopic.start_page,
        selectedTopic.end_page
      );

      if (!documentText || documentText.trim().length === 0) {
        throw new Error("Failed to extract text from specified pages");
      }

      const res = await fetch('/api/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentText,
          topic: quizConfig.topic,
          difficulty: quizConfig.difficulty,
          numQuestions: quizConfig.numQuestions,
          type: quizConfig.type
        })
      });

      if (!res.ok) throw new Error("AI failed to generate quiz");

      const { quiz } = await res.json();

      // Create quiz linked to topic
      const { data: quizRecord, error: quizError } = await supabase
        .from('quizzes')
        .insert([{
          course_id: courseId,
          topic_id: selectedTopic.id,
          title: `Quiz: ${quizConfig.topic}`,
          topic: quizConfig.topic
        }])
        .select()
        .single();

      if (quizError) throw quizError;

      const questionsToInsert = quiz.map((q: any) => ({
        quiz_id: quizRecord.id,
        question_text: q.question,
        options: q.options,
        correct_answer: q.correct_answer,
        explanation: q.explanation
      }));

      const { error: questionsError } = await supabase
        .from('questions')
        .insert(questionsToInsert);

      if (questionsError) throw questionsError;

      alert('Quiz generated successfully! 🎉');
      fetchCourseData();
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setGenerating(false);
    }
  };

  if (errorMsg) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-red-50 p-4">
      <h1 className="text-2xl font-bold text-red-700 mb-4">Error</h1>
      <p className="text-red-600">{errorMsg}</p>
      <button
        onClick={() => router.push('/dashboard')}
        className="mt-4 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Back to Dashboard
      </button>
    </div>
  );

  if (loading) return <div className="p-10 text-center">Loading...</div>;

  const isLecturer = role === 'lecturer';

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-900">
            ← Back
          </button>
          
          {isLecturer && course?.class_id && (
            <Link
              href={`/dashboard/class/${course.class_id}/students`}
              className="px-4 py-2 bg-purple-600 text-white text-sm font-bold rounded hover:bg-purple-700"
            >
              👥 View Students
            </Link>
          )}
        </div>

        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-8 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{course?.title}</h1>
          <p className="text-gray-600">{course?.description}</p>
          {isLecturer && (
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setShowTopicModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-bold"
              >
                ➕ Add Week
              </button>
              <button
                onClick={() => setShowAnnouncementModal(true)}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-bold"
              >
                📢 Announce
              </button>
            </div>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-4">
          {/* MAIN CONTENT - 3 columns */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Main Handout */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold mb-4">📕 Main Course Handout</h2>
              
              {mainHandout ? (
                <div className="border rounded-lg p-4 bg-gray-50">
                  <p className="font-bold text-gray-900 mb-2">{mainHandout.title}</p>
                  <div className="flex gap-2">
                    <a href={mainHandout.file_url} target="_blank" className="px-3 py-1 bg-gray-600 text-white text-xs font-bold rounded hover:bg-gray-700">
                      📄 View
                    </a>
                    <Link href={`/dashboard/chat/${mainHandout.id}`} className="px-3 py-1 bg-purple-600 text-white text-xs font-bold rounded hover:bg-purple-700">
                      💬 AI Chat
                    </Link>
                  </div>
                </div>
              ) : isLecturer ? (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleUploadMainHandout}
                    disabled={uploading}
                    className="block w-full text-sm"
                  />
                </div>
              ) : (
                <p className="text-gray-500 italic">No handout yet</p>
              )}
            </div>

            {/* Weekly Topics */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold mb-4">📅 Weekly Schedule</h2>
              
              {topics.length === 0 ? (
                <p className="text-gray-500 italic">No topics yet</p>
              ) : (
                <div className="space-y-4">
                  {topics.map((topic) => (
                    <div key={topic.id} className="border rounded-lg p-4">
                      <h3 className="font-bold text-gray-900">
                        Week {topic.week_number}: {topic.title}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">{topic.description}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        📖 Pages {topic.start_page}-{topic.end_page}
                      </p>
                      
                      <div className="flex gap-2 mt-3">
                        {mainHandout && (
                          <Link
                            href={`/dashboard/chat/${mainHandout.id}?pages=${topic.start_page}-${topic.end_page}`}
                            className="px-3 py-1 bg-purple-100 text-xs font-bold text-purple-700 rounded"
                          >
                            💬 AI Chat
                          </Link>
                        )}
                        
                        {isLecturer && !topic.quizzes?.[0] && (
                          <>
                            <button
                              onClick={() => openQuizModal(topic)}
                              disabled={generating}
                              className="px-3 py-1 bg-orange-100 text-xs font-bold text-orange-700 rounded"
                            >
                              ⚡ AI Quiz
                            </button>
                            <button
                              onClick={() => openManualQuestionsModal(topic)}
                              disabled={generating}
                              className="px-3 py-1 bg-green-100 text-xs font-bold text-green-700 rounded"
                            >
                              📝 Manual Quiz
                            </button>
                          </>
                        )}
                        
                        {topic.quizzes?.[0] && (
                          <Link
                            href={isLecturer ? `/dashboard/quiz/${topic.quizzes[0].id}/gradebook` : `/dashboard/quiz/${topic.quizzes[0].id}`}
                            className="px-3 py-1 bg-green-100 text-xs font-bold text-green-700 rounded"
                          >
                            📝 {isLecturer ? 'Gradebook' : 'Take Quiz'}
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Supplementary Materials */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold mb-4">📚 Supplementary Materials</h2>
              
              {isLecturer && (
                <div className="mb-4">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleUploadSupplementary}
                    disabled={uploading}
                    className="block w-full text-sm"
                  />
                </div>
              )}
              
              {supplementaryMaterials.length === 0 ? (
                <p className="text-gray-500 italic text-sm">No materials yet</p>
              ) : (
                <div className="space-y-2">
                  {supplementaryMaterials.map((material) => (
                    <div key={material.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <span className="text-sm font-medium">{material.title}</span>
                      <a href={material.file_url} target="_blank" className="px-3 py-1 bg-gray-600 text-white text-xs rounded">
                        View
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* SIDEBAR - Announcements */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm p-6 sticky top-4">
              <h2 className="text-lg font-bold mb-4">📢 Announcements</h2>
              
              {announcements.length === 0 ? (
                <p className="text-gray-500 italic text-sm">No announcements</p>
              ) : (
                <div className="space-y-4">
                  {announcements.map((announcement) => (
                    <div key={announcement.id} className="border-l-4 border-blue-500 pl-3 py-2">
                      <h4 className="font-bold text-sm">{announcement.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{announcement.message}</p>
                      <p className="text-xs text-gray-400 mt-2">
                        {new Date(announcement.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modals */}
        {showTopicModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">
              <h3 className="text-xl font-bold mb-4">Add Weekly Topic</h3>
              <form onSubmit={handleAddTopic} className="space-y-4">
                <input
                  type="number"
                  placeholder="Week Number"
                  value={topicForm.week_number}
                  onChange={(e) => setTopicForm({...topicForm, week_number: parseInt(e.target.value)})}
                  className="w-full border p-2 rounded"
                  required
                />
                <input
                  type="text"
                  placeholder="Title"
                  value={topicForm.title}
                  onChange={(e) => setTopicForm({...topicForm, title: e.target.value})}
                  className="w-full border p-2 rounded"
                  required
                />
                <textarea
                  placeholder="Description"
                  value={topicForm.description}
                  onChange={(e) => setTopicForm({...topicForm, description: e.target.value})}
                  className="w-full border p-2 rounded"
                  rows={3}
                />
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="number"
                    placeholder="Start Page"
                    value={topicForm.start_page}
                    onChange={(e) => setTopicForm({...topicForm, start_page: parseInt(e.target.value)})}
                    className="w-full border p-2 rounded"
                    required
                  />
                  <input
                    type="number"
                    placeholder="End Page"
                    value={topicForm.end_page}
                    onChange={(e) => setTopicForm({...topicForm, end_page: parseInt(e.target.value)})}
                    className="w-full border p-2 rounded"
                    required
                  />
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowTopicModal(false)} className="flex-1 border py-2 rounded">Cancel</button>
                  <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded">Add</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showAnnouncementModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">
              <h3 className="text-xl font-bold mb-4">Send Announcement</h3>
              <form onSubmit={handleSendAnnouncement} className="space-y-4">
                <input
                  type="text"
                  placeholder="Title"
                  value={announcementForm.title}
                  onChange={(e) => setAnnouncementForm({...announcementForm, title: e.target.value})}
                  className="w-full border p-2 rounded"
                  required
                />
                <textarea
                  placeholder="Message"
                  value={announcementForm.message}
                  onChange={(e) => setAnnouncementForm({...announcementForm, message: e.target.value})}
                  className="w-full border p-2 rounded"
                  rows={4}
                  required
                />
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowAnnouncementModal(false)} className="flex-1 border py-2 rounded">Cancel</button>
                  <button type="submit" className="flex-1 bg-green-600 text-white py-2 rounded">Send</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showQuizModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">
              <h3 className="text-xl font-bold mb-4">Generate AI Quiz</h3>
              <form onSubmit={handleGenerateQuiz} className="space-y-4">
                <input
                  type="text"
                  value={quizConfig.topic}
                  onChange={(e) => setQuizConfig({...quizConfig, topic: e.target.value})}
                  className="w-full border p-2 rounded"
                  required
                />
                <div className="grid grid-cols-2 gap-4">
                  <select
                    value={quizConfig.difficulty}
                    onChange={(e) => setQuizConfig({...quizConfig, difficulty: e.target.value})}
                    className="w-full border p-2 rounded"
                  >
                    <option>Easy</option>
                    <option>Medium</option>
                    <option>Hard</option>
                  </select>
                  <select
                    value={quizConfig.numQuestions}
                    onChange={(e) => setQuizConfig({...quizConfig, numQuestions: parseInt(e.target.value)})}
                    className="w-full border p-2 rounded"
                  >
                    <option value={3}>3 Questions</option>
                    <option value={5}>5 Questions</option>
                    <option value={10}>10 Questions</option>
                  </select>
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowQuizModal(false)} className="flex-1 border py-2 rounded">Cancel</button>
                  <button type="submit" className="flex-1 bg-orange-600 text-white py-2 rounded">Generate</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Manual Questions Modal */}
        {showManualQuestionsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
            <div className="bg-white rounded-xl p-6 w-full max-w-2xl my-8">
              <h3 className="text-xl font-bold mb-4">Upload Manual Questions</h3>
              <form onSubmit={handleManualQuestions} className="space-y-4">
                
                {/* Action Selection */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">What should AI do?</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setManualQuestionsForm({...manualQuestionsForm, action: 'convert'})}
                      className={`p-3 rounded-lg border-2 text-sm ${
                        manualQuestionsForm.action === 'convert'
                          ? 'border-blue-500 bg-blue-50 text-blue-700 font-bold'
                          : 'border-gray-200 text-gray-600'
                      }`}
                    >
                      📝 Convert to Format
                      <p className="text-xs mt-1 font-normal">Turn raw questions into quiz format</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setManualQuestionsForm({...manualQuestionsForm, action: 'enhance'})}
                      className={`p-3 rounded-lg border-2 text-sm ${
                        manualQuestionsForm.action === 'enhance'
                          ? 'border-green-500 bg-green-50 text-green-700 font-bold'
                          : 'border-gray-200 text-gray-600'
                      }`}
                    >
                      ✨ Enhance & Improve
                      <p className="text-xs mt-1 font-normal">Rephrase for clarity and add explanations</p>
                    </button>
                  </div>
                </div>

                {/* File Upload */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Upload File (Optional)</label>
                  <input
                    type="file"
                    accept=".txt,.doc,.docx,.pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setManualQuestionsForm({...manualQuestionsForm, file});
                      }
                    }}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  <p className="text-xs text-gray-500 mt-1">Supports .txt, .doc, .docx, .pdf</p>
                </div>

                {/* Text Area */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Or Paste Questions</label>
                  <textarea
                    value={manualQuestionsForm.questions}
                    onChange={(e) => setManualQuestionsForm({...manualQuestionsForm, questions: e.target.value})}
                    className="w-full border p-3 rounded font-mono text-sm"
                    rows={12}
                    placeholder={`Example format:
1. What is marketing?
a) Selling products
b) Understanding customer needs
c) Making ads
d) All of the above
Answer: d

2. Which is a marketing strategy?
a) SEO
b) Content marketing
c) Social media
d) All of the above
Answer: d`}
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-800">
                  <strong>💡 Tip:</strong> AI will {manualQuestionsForm.action === 'convert' ? 'convert your questions into a standardized quiz format' : 'enhance your questions with better wording and add helpful explanations'}.
                </div>

                <div className="flex gap-3">
                  <button 
                    type="button" 
                    onClick={() => setShowManualQuestionsModal(false)} 
                    className="flex-1 border py-2 rounded font-bold"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={!manualQuestionsForm.questions.trim() && !manualQuestionsForm.file}
                    className="flex-1 bg-green-600 text-white py-2 rounded font-bold hover:bg-green-700 disabled:bg-gray-300"
                  >
                    {manualQuestionsForm.action === 'convert' ? 'Convert' : 'Enhance'} with AI
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}