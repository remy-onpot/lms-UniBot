'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams, useRouter } from 'next/navigation';

export default function ClassStudentsPage() {
  const params = useParams();
  const classId = params?.classId as string; // Use 'classId' to match [classId] folder
  const router = useRouter();

  const [classData, setClassData] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchStudents = async () => {
      // Verify user is a lecturer
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/login');

      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      setRole(profile?.role);

      if (profile?.role !== 'lecturer') {
        alert('Access denied. Lecturers only.');
        return router.push('/dashboard');
      }

      // Fetch class data
      const { data: classInfo } = await supabase
        .from('classes')
        .select('*')
        .eq('id', classId)
        .single();

      setClassData(classInfo);

      // Fetch enrolled students with better error handling
      const { data: enrollments, error: enrollError } = await supabase
        .from('class_enrollments')
        .select(`
          student_id,
          enrolled_at,
          users (
            id,
            email,
            full_name
          )
        `)
        .eq('class_id', classId)
        .order('enrolled_at', { ascending: false });

      console.log('📊 Enrollments query:', { classId, enrollments, enrollError });

      if (enrollments) {
        const studentsData = enrollments.map((e: any) => ({
          id: e.student_id,
          email: e.users?.email || 'N/A',
          full_name: e.users?.full_name || 'Not provided',
          enrolled_at: e.enrolled_at
        }));
        console.log('👥 Processed students:', studentsData);
        setStudents(studentsData);
      }

      setLoading(false);
    };

    fetchStudents();
  }, [classId, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="mx-auto max-w-5xl">
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading students...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-5xl">
        <button
          onClick={() => router.back()}
          className="mb-6 text-sm text-gray-500 hover:text-gray-900 flex items-center"
        >
          ← Back to Course
        </button>

        <div className="bg-white rounded-xl shadow-sm p-8 mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-gray-900">{classData?.name}</h1>
            <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-bold rounded">
              {students.length} {students.length === 1 ? 'Student' : 'Students'}
            </span>
          </div>
          <p className="text-gray-600">{classData?.description}</p>
          <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
            <span>📋 Access Code: <span className="font-mono font-bold text-gray-900">{classData?.access_code}</span></span>
          </div>
        </div>

        {students.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">👥</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Students Enrolled Yet</h3>
            <p className="text-gray-600">
              Share the access code <span className="font-mono font-bold text-blue-600">{classData?.access_code}</span> with students so they can join this class.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Enrolled Students</h2>
            </div>

            <div className="divide-y divide-gray-200">
              {students.map((student, index) => (
                <div key={student.id} className="px-6 py-4 hover:bg-gray-50 transition">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-700 font-bold">{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{student.full_name}</p>
                        <p className="text-sm text-gray-500">{student.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Enrolled</p>
                      <p className="text-sm font-medium text-gray-700">
                        {new Date(student.enrolled_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
              <p className="text-sm text-gray-600 text-center">
                Total: {students.length} {students.length === 1 ? 'student' : 'students'} enrolled
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}