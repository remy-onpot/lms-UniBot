'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LandingPage() {
  const router = useRouter();
  const [dbStatus, setDbStatus] = useState<'loading' | 'connected' | 'error'>('loading');

  // Check database connection on load
  useEffect(() => {
    async function checkConnection() {
      try {
        const { error } = await supabase.from('users').select('id').limit(1);
        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows, which is fine
          setDbStatus('error');
        } else {
          setDbStatus('connected');
        }
      } catch (err) {
        setDbStatus('error');
      }
    }
    checkConnection();
  }, []);

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-purple-50">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-gray-200 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🎓</span>
              <span className="text-2xl font-bold bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                UniBot
              </span>
              {/* Status Indicator */}
              {dbStatus === 'connected' && (
                <span className="ml-2 px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                  ● Live
                </span>
              )}
            </div>
            <div className="flex items-center gap-4">
              <Link href="/ai-assistant" className="text-gray-700 hover:text-gray-900 font-medium">
                Try AI Assistant
              </Link>
              <Link href="/login" className="text-gray-700 hover:text-gray-900 font-medium">
                Login
              </Link>
              <Link 
                href="/login" 
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-block mb-4 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-bold">
            🚀 AI-Powered Learning Management System
          </div>
          <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight">
            Transform Education with
            <br />
            <span className="bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              AI-Powered LMS
            </span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Automated quiz generation, intelligent tutoring, and seamless course management. 
            Built specifically for African universities and independent educators.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login"
              className="px-8 py-4 bg-blue-600 text-white rounded-lg font-bold text-lg hover:bg-blue-700 transition shadow-lg hover:shadow-xl"
            >
              Start Free Trial
            </Link>
            <button
              onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-8 py-4 bg-white text-blue-600 rounded-lg font-bold text-lg hover:bg-gray-50 transition border-2 border-blue-600"
            >
              View Pricing
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Powerful Features</h2>
            <p className="text-xl text-gray-600">Everything you need to manage courses effectively</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-8 rounded-2xl bg-linear-to-br from-blue-50 to-blue-100 hover:shadow-xl transition">
              <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center mb-4">
                <span className="text-3xl">⚡</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">AI Quiz Generation</h3>
              <p className="text-gray-700">
                Upload PDFs and generate quizzes instantly. AI creates relevant questions with explanations from your course materials.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-8 rounded-2xl bg-linear-to-br from-purple-50 to-purple-100 hover:shadow-xl transition">
              <div className="w-14 h-14 bg-purple-600 rounded-xl flex items-center justify-center mb-4">
                <span className="text-3xl">💬</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">AI Tutor Chat</h3>
              <p className="text-gray-700">
                Students get 24/7 help with an AI tutor trained on your course content. Instant answers to questions about materials.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-8 rounded-2xl bg-linear-to-br from-green-50 to-green-100 hover:shadow-xl transition">
              <div className="w-14 h-14 bg-green-600 rounded-xl flex items-center justify-center mb-4">
                <span className="text-3xl">📊</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Smart Analytics</h3>
              <p className="text-gray-700">
                Track student progress, quiz performance, and engagement. Get insights to improve teaching effectiveness.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-8 rounded-2xl bg-linear-to-br from-orange-50 to-orange-100 hover:shadow-xl transition">
              <div className="w-14 h-14 bg-orange-600 rounded-xl flex items-center justify-center mb-4">
                <span className="text-3xl">📢</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Announcements</h3>
              <p className="text-gray-700">
                Send instant notifications to your class. Students get real-time updates with notification badges.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-8 rounded-2xl bg-linear-to-br from-pink-50 to-pink-100 hover:shadow-xl transition">
              <div className="w-14 h-14 bg-pink-600 rounded-xl flex items-center justify-center mb-4">
                <span className="text-3xl">📅</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Weekly Topics</h3>
              <p className="text-gray-700">
                Organize course content by weeks. Students always know what to study and when quizzes are due.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-8 rounded-2xl bg-linear-to-br from-indigo-50 to-indigo-100 hover:shadow-xl transition">
              <div className="w-14 h-14 bg-indigo-600 rounded-xl flex items-center justify-center mb-4">
                <span className="text-3xl">🏫</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Multi-University</h3>
              <p className="text-gray-700">
                Perfect for institutions or independent lecturers. Each university gets their own secure workspace.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Simple, Transparent Pricing</h2>
            <p className="text-xl text-gray-600">Choose the plan that fits your needs</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Free Tier */}
            <div className="p-8 rounded-2xl bg-white border-2 border-gray-200 hover:border-blue-500 hover:shadow-xl transition">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Free</h3>
              <p className="text-gray-600 mb-6">For individual lecturers getting started</p>
              <div className="mb-6">
                <span className="text-5xl font-bold text-gray-900">$0</span>
                <span className="text-gray-600">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span className="text-gray-700">1 course</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span className="text-gray-700">Up to 50 students</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span className="text-gray-700">AI quiz generation</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span className="text-gray-700">AI tutor chat</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span className="text-gray-700">Basic analytics</span>
                </li>
              </ul>
              <Link
                href="/login"
                className="block w-full py-3 bg-gray-100 text-gray-900 rounded-lg font-bold text-center hover:bg-gray-200 transition"
              >
                Get Started Free
              </Link>
            </div>

            {/* Pro Tier */}
            <div className="p-8 rounded-2xl bg-linear-to-br from-blue-600 to-purple-600 text-white relative hover:shadow-2xl transition transform hover:scale-105">
              <div className="absolute top-4 right-4 px-3 py-1 bg-white text-blue-600 rounded-full text-xs font-bold">
                POPULAR
              </div>
              <h3 className="text-2xl font-bold mb-2">Pro</h3>
              <p className="text-blue-100 mb-6">For serious educators</p>
              <div className="mb-6">
                <span className="text-5xl font-bold">$15</span>
                <span className="text-blue-100">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2">
                  <span>✓</span>
                  <span>Unlimited courses</span>
                </li>
                <li className="flex items-center gap-2">
                  <span>✓</span>
                  <span>Unlimited students</span>
                </li>
                <li className="flex items-center gap-2">
                  <span>✓</span>
                  <span>All Free features</span>
                </li>
                <li className="flex items-center gap-2">
                  <span>✓</span>
                  <span>Advanced analytics</span>
                </li>
                <li className="flex items-center gap-2">
                  <span>✓</span>
                  <span>Priority support</span>
                </li>
                <li className="flex items-center gap-2">
                  <span>✓</span>
                  <span>Remove UniBot branding</span>
                </li>
              </ul>
              <Link
                href="/login"
                className="block w-full py-3 bg-white text-blue-600 rounded-lg font-bold text-center hover:bg-blue-50 transition"
              >
                Start Pro Trial
              </Link>
            </div>

            {/* Enterprise Tier */}
            <div className="p-8 rounded-2xl bg-white border-2 border-gray-200 hover:border-purple-500 hover:shadow-xl transition">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Enterprise</h3>
              <p className="text-gray-600 mb-6">For universities and institutions</p>
              <div className="mb-6">
                <span className="text-5xl font-bold text-gray-900">Custom</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span className="text-gray-700">Everything in Pro</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span className="text-gray-700">Custom subdomain</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span className="text-gray-700">University branding</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span className="text-gray-700">SSO integration</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span className="text-gray-700">Dedicated support</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span className="text-gray-700">SLA guarantee</span>
                </li>
              </ul>
              <Link
                href="/contact"
                className="block w-full py-3 bg-purple-600 text-white rounded-lg font-bold text-center hover:bg-purple-700 transition"
              >
                Contact Sales
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-linear-to-br from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to Transform Your Teaching?
          </h2>
          <p className="text-xl mb-8 text-blue-100">
            Join hundreds of educators using UniBot to deliver better learning experiences
          </p>
          <Link
            href="/login"
            className="inline-block px-8 py-4 bg-white text-blue-600 rounded-lg font-bold text-lg hover:bg-blue-50 transition shadow-xl"
          >
            Get Started Free - No Credit Card Required
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-gray-900 text-gray-400">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">🎓</span>
                <span className="text-xl font-bold text-white">UniBot</span>
              </div>
              <p className="text-sm">
                AI-powered learning management system for African universities and educators.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-white mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white">Features</a></li>
                <li><a href="#pricing" className="hover:text-white">Pricing</a></li>
                <li><a href="#" className="hover:text-white">Updates</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-white mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white">About</a></li>
                <li><a href="#" className="hover:text-white">Blog</a></li>
                <li><a href="/contact" className="hover:text-white">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-white mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white">Privacy</a></li>
                <li><a href="#" className="hover:text-white">Terms</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-gray-800 text-center text-sm">
            <p>© 2024 UniBot. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}