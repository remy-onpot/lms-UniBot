'use client';

import { useState } from 'react';

export default function LandingPage() {
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);

  const features = [
    {
      icon: "🤖",
      title: "AI Tutor",
      description: "Get instant help and personalized explanations",
      color: "from-violet-500 to-purple-600"
    },
    {
      icon: "⚡",
      title: "Auto-Generated Quizzes",
      description: "Smart assessments from your study materials",
      color: "from-orange-500 to-red-600"
    },
    {
      icon: "📝",
      title: "Instant Grading",
      description: "AI-powered feedback on your assignments",
      color: "from-green-500 to-teal-600"
    },
    {
      icon: "📊",
      title: "Progress Analytics",
      description: "Track your learning journey with insights",
      color: "from-blue-500 to-cyan-600"
    },
    {
      icon: "📚",
      title: "Smart Library",
      description: "Organize and access all your course materials",
      color: "from-pink-500 to-rose-600"
    },
    {
      icon: "🎯",
      title: "Goal Setting",
      description: "Stay motivated with personalized milestones",
      color: "from-indigo-500 to-purple-600"
    }
  ];

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-indigo-50 overflow-hidden">
      
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-20">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-linear-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white text-lg sm:text-xl font-bold">U</span>
              </div>
              <span className="text-lg sm:text-2xl font-black text-slate-900">UniBot</span>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-4">
              <a href="/login" className="px-3 sm:px-6 py-2 sm:py-2.5 text-slate-700 hover:text-slate-900 font-medium text-sm sm:text-base transition">
                Login
              </a>
              <a href="/login" className="px-4 sm:px-6 py-2 sm:py-2.5 bg-linear-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold text-sm sm:text-base shadow-lg hover:shadow-xl transform hover:scale-105 transition">
                Get Started
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-24 sm:pt-32 pb-12 sm:pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            
            {/* Left Content */}
            <div className="text-center lg:text-left space-y-6 sm:space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-100 rounded-full">
                <div className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse"></div>
                <span className="text-xs sm:text-sm font-bold text-indigo-700 uppercase tracking-wide">AI-Powered Learning</span>
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black text-slate-900 leading-tight">
                Learn Smarter,
                <span className="block bg-linear-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Not Harder
                </span>
              </h1>
              
              <p className="text-base sm:text-lg lg:text-xl text-slate-600 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                Transform your study experience with AI-powered tools that adapt to your learning style. Get instant help, personalized quizzes, and smart feedback.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <a href="/login" className="px-8 py-4 bg-linear-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-bold text-lg shadow-2xl hover:shadow-indigo-500/50 transform hover:scale-105 transition flex items-center justify-center gap-2">
                  Start Learning Free
                  <span className="text-2xl">→</span>
                </a>
                <button className="px-8 py-4 bg-white border-2 border-slate-200 text-slate-700 rounded-2xl font-bold text-lg hover:border-indigo-300 hover:bg-indigo-50 transition">
                  Watch Demo
                </button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 sm:gap-8 pt-8">
                <div className="text-center lg:text-left">
                  <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900">10K+</div>
                  <div className="text-xs sm:text-sm text-slate-600 font-medium">Students</div>
                </div>
                <div className="text-center lg:text-left">
                  <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900">500+</div>
                  <div className="text-xs sm:text-sm text-slate-600 font-medium">Courses</div>
                </div>
                <div className="text-center lg:text-left">
                  <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900">98%</div>
                  <div className="text-xs sm:text-sm text-slate-600 font-medium">Success Rate</div>
                </div>
              </div>
            </div>

            {/* Right Visual */}
            <div className="relative hidden lg:block">
              <div className="relative w-full aspect-square max-w-xl mx-auto">
                {/* Decorative circles */}
                <div className="absolute top-0 right-0 w-72 h-72 bg-linear-to-br from-indigo-400/30 to-purple-400/30 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-linear-to-tr from-blue-400/20 to-cyan-400/20 rounded-full blur-3xl"></div>
                
                {/* Stack of books visual */}
                <div className="relative z-10 space-y-4 rotate-6 hover:rotate-0 transition-transform duration-500">
                  {[
                    'bg-linear-to-r from-violet-400 to-purple-500',
                    'bg-linear-to-r from-orange-400 to-red-500',
                    'bg-linear-to-r from-emerald-400 to-teal-500',
                    'bg-linear-to-r from-blue-400 to-cyan-500',
                    'bg-linear-to-r from-pink-400 to-rose-500',
                    'bg-linear-to-r from-indigo-400 to-purple-500'
                  ].map((color, i) => (
                    <div 
                      key={i}
                      className={`h-16 sm:h-20 ${color} rounded-2xl shadow-2xl transform hover:-translate-y-2 transition-all duration-300 cursor-pointer`}
                      style={{
                        animation: `float ${3 + i * 0.5}s ease-in-out infinite`,
                        animationDelay: `${i * 0.2}s`
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 sm:py-20 px-4 sm:px-6 lg:px-8 bg-white/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 mb-4">
              Everything You Need to Excel
            </h2>
            <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto">
              Powerful features designed to help you achieve your academic goals faster
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {features.map((feature, i) => (
              <div
                key={i}
                onMouseEnter={() => setHoveredFeature(i)}
                onMouseLeave={() => setHoveredFeature(null)}
                className={`group relative p-6 sm:p-8 bg-white rounded-3xl border-2 transition-all duration-300 cursor-pointer ${
                  hoveredFeature === i 
                    ? 'border-indigo-300 shadow-2xl -translate-y-2' 
                    : 'border-slate-200 shadow-lg hover:border-slate-300'
                }`}
              >
                <div className={`w-14 h-14 sm:w-16 sm:h-16 bg-linear-to-br ${feature.color} rounded-2xl flex items-center justify-center mb-4 sm:mb-6 shadow-lg transform group-hover:scale-110 transition-transform`}>
                  <span className="text-2xl sm:text-3xl">{feature.icon}</span>
                </div>
                
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2 sm:mb-3">
                  {feature.title}
                </h3>
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                  {feature.description}
                </p>

                <div className={`absolute bottom-0 left-0 right-0 h-1 bg-linear-to-r ${feature.color} rounded-b-3xl transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300`}></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-linear-to-br from-indigo-600 to-purple-600 rounded-3xl sm:rounded-[3rem] p-8 sm:p-12 lg:p-16 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 sm:w-96 h-64 sm:h-96 bg-white/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-48 sm:w-72 h-48 sm:h-72 bg-white/10 rounded-full blur-3xl"></div>
            
            <div className="relative z-10">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-4 sm:mb-6">
                Ready to Transform Your Learning?
              </h2>
              <p className="text-base sm:text-lg lg:text-xl text-indigo-100 mb-6 sm:mb-8 max-w-2xl mx-auto">
                Join thousands of students already achieving better grades with AI-powered assistance
              </p>
              <a href="/login" className="inline-flex items-center gap-3 px-8 sm:px-10 py-4 sm:py-5 bg-white text-indigo-600 rounded-2xl font-bold text-base sm:text-lg shadow-2xl hover:shadow-white/50 transform hover:scale-105 transition">
                Get Started Now
                <span className="text-xl sm:text-2xl">→</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 sm:py-12 px-4 sm:px-6 lg:px-8 border-t border-slate-200 bg-white/50">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-sm sm:text-base text-slate-600">
            © 2024 UniBot LMS. All rights reserved.
          </p>
        </div>
      </footer>

      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }
      `}</style>
    </div>
  );
}