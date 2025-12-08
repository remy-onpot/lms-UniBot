'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function PaymentCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reference = searchParams?.get('reference');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const processedRef = useRef(false); // Prevent double-fire in React Strict Mode

  useEffect(() => {
    if (!reference || processedRef.current) return;
    
    const verifyPayment = async () => {
      processedRef.current = true; // Mark as running

      try {
        const res = await fetch('/api/payment/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reference })
        });

        const data = await res.json();

        if (data.success || data.status) {
          setStatus('success');
          toast.success("Payment Confirmed! Access Granted.");
          // Redirect after short delay
          setTimeout(() => router.push('/dashboard'), 2000);
        } else {
          throw new Error(data.error || "Verification failed");
        }
      } catch (error) {
        console.error(error);
        setStatus('error');
        toast.error("Could not verify payment. Please contact support.");
      }
    };

    verifyPayment();
  }, [reference, router]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-3xl shadow-xl text-center max-w-sm w-full border border-slate-100">
        
        {status === 'loading' && (
          <>
            <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
               <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">Verifying...</h2>
            <p className="text-slate-500 text-sm">Please wait while we confirm your transaction.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
               <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">Success!</h2>
            <p className="text-slate-500 text-sm">Your access has been unlocked.</p>
            <p className="text-xs text-slate-400 mt-4">Redirecting...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
               <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">Failed</h2>
            <p className="text-slate-500 text-sm">We couldn't verify this payment.</p>
            <button 
              onClick={() => router.push('/dashboard')}
              className="mt-6 w-full py-3 bg-slate-900 text-white font-bold rounded-xl"
            >
              Return to Dashboard
            </button>
          </>
        )}
      </div>
    </div>
  );
}