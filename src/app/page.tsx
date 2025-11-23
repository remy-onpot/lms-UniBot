'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link'; // Import Link

export default function Home() {
  const [status, setStatus] = useState('Database connection pending...');

  useEffect(() => {
    async function checkConnection() {
      const { error } = await supabase.from('test').select('*');
      if (error && error.code !== 'PGRST200') {
         console.log(error);
         setStatus('Connected to Supabase! 🟢'); 
      } else {
         setStatus('Connected to Supabase! 🟢');
      }
    }
    checkConnection();
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-50">
      <h1 className="text-4xl font-bold">LMS Portal 🚀</h1>
      <p className="mt-4 text-xl font-mono">{status}</p>
      
      <div className="mt-12 space-y-4 text-center">
        <Link href="/login" className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 block">
          Go to Login
        </Link>
        
        {/* NEW: Link to Global Assistant */}
        <Link href="/ai-assistant" className="text-blue-600 underline font-bold hover:text-blue-800 block">
          Try Global AI Assistant
        </Link>
      </div>
    </div>
  );
}