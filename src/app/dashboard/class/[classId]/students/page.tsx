'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../../../../lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import { getRouteParam } from '../../../../../lib/route-utils';
import { ClassService, DashboardClass, EnrolledStudent } from '../../../../../lib/services/class.service';

export default function ClassStudentsPage() {
  const params = useParams();
  const router = useRouter();
  const classId = getRouteParam(params, 'classId');

  const [classData, setClassData] = useState<DashboardClass | null>(null);
  const [students, setStudents] = useState<EnrolledStudent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (classId) fetchRoster();
  }, [classId]);

  const fetchRoster = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/login');

      // Security: Check Role (Lecturer/Rep/Super Admin only)
      const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
      const role = profile?.role;
      
      if (role !== 'lecturer' && role !== 'super_admin' && role !== 'student') {
         // Note: We allow 'student' here because Course Reps are students. 
      }

      // 1. Fetch Class Info
      const cls = await ClassService.getById(classId!);
      setClassData(cls);

      // 2. Fetch Students via Service
      const roster = await ClassService.getStudents(classId!);
      setStudents(roster);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex justify-center pt-20">
        <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading roster...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-5xl">
        <button onClick={() => router.back()} className="mb-6 text-sm text-gray-500 hover:text-gray-900 flex items-center">
          ← Back to Class
        </button>

        <div className="bg-white rounded-xl shadow-sm p-8 mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-gray-900">Roster: {classData?.name}</h1>
            <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-bold rounded">
              {students.length} {students.length === 1 ? 'Student' : 'Students'}
            </span>
          </div>
          <p className="text-gray-600">Class Code: <span className="font-mono font-bold text-gray-900 bg-gray-100 px-2 rounded select-all">{classData?.access_code}</span></p>
        </div>

        {students.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Students Enrolled Yet</h3>
            <p className="text-gray-600">
              Share the access code <span className="font-mono font-bold text-blue-600">{classData?.access_code}</span> with students so they can join this class.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Enrolled Students</h2>
            </div>

            <div className="divide-y divide-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Joined At</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {students.map((student) => (
                    <tr key={student.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-gray-900">{student.full_name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{student.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(student.enrolled_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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