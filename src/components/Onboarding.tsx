import React, { useState } from 'react';
import GlassCard from './GlassCard';
import { UserPreferences } from '../types';
import { Sparkles, ArrowRight, User, Compass, HelpCircle, AlertOctagon } from 'lucide-react';

interface OnboardingProps {
  onComplete: (name: string, role: string, preferences: UserPreferences) => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [role, setRole] = useState('student');
  const [personality, setPersonality] = useState<'mentor' | 'coach' | 'friendly' | 'strict'>('mentor');
  const [nudgeFrequency, setNudgeFrequency] = useState<'low' | 'medium' | 'high'>('medium');

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      onComplete(name || 'Productive Hero', role, {
        aiPersonality: personality,
        nudgeFrequency,
        wakeTime: '07:00',
        sleepTime: '23:00',
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#070b14]">
      {/* Background blobs */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-indigo-600/20 rounded-full blur-[100px] animate-float-1"></div>
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-violet-600/20 rounded-full blur-[100px] animate-float-2"></div>

      <div className="w-full max-w-lg z-10">
        {step === 1 && (
          <GlassCard className="space-y-6 border-white/10 shadow-2xl transition-all duration-300">
            <div className="text-center space-y-2">
              <div className="inline-flex p-3 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-2">
                <Sparkles className="w-8 h-8 animate-pulse" />
              </div>
              <h1 className="text-3xl font-bold font-display tracking-tight text-white">Last-Minute Life Saver</h1>
              <p className="text-slate-400 text-sm">
                Proactive AI companion designed to help you crush procrastination and get things done before they're due.
              </p>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-medium text-slate-300">What shall we call you?</label>
              <div className="relative">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white placeholder-slate-500 pl-11"
                  required
                />
                <User className="absolute left-4 top-3.5 w-4 h-4 text-slate-500" />
              </div>
            </div>

            <button
              onClick={handleNext}
              disabled={!name.trim()}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-all duration-200 shadow-lg shadow-indigo-600/25 cursor-pointer"
            >
              Get Started <ArrowRight className="w-4 h-4" />
            </button>
          </GlassCard>
        )}

        {step === 2 && (
          <GlassCard className="space-y-6 border-white/10 shadow-2xl transition-all duration-300">
            <div className="space-y-2">
              <span className="text-xs font-mono text-indigo-400 uppercase tracking-widest">Step 2 of 3</span>
              <h2 className="text-2xl font-bold font-display text-white">I am primarily a...</h2>
              <p className="text-slate-400 text-sm">This helps customize your task suggestions and peak hour predictions.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'student', label: '🎓 Student', desc: 'Manage exams & coursework' },
                { id: 'professional', label: '💼 Professional', desc: 'Balance clients & workflows' },
                { id: 'entrepreneur', label: '🚀 Founder', desc: 'Build and run goals' },
                { id: 'personal', label: '🏠 Personal Life', desc: 'Organize day-to-day admin' },
              ].map((item) => (
                <div
                  key={item.id}
                  onClick={() => setRole(item.id)}
                  className={`p-4 rounded-xl border text-left cursor-pointer transition-all duration-200 ${
                    role === item.id
                      ? 'bg-indigo-600/20 border-indigo-500 shadow-md shadow-indigo-500/10'
                      : 'bg-slate-900/30 border-white/5 hover:border-white/15'
                  }`}
                >
                  <h3 className="font-semibold text-white text-sm">{item.label}</h3>
                  <p className="text-xs text-slate-400 mt-1">{item.desc}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="w-1/3 py-3 text-slate-400 hover:text-white border border-white/10 rounded-xl transition-colors cursor-pointer"
              >
                Back
              </button>
              <button
                onClick={handleNext}
                className="w-2/3 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer"
              >
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </GlassCard>
        )}

        {step === 3 && (
          <GlassCard className="space-y-6 border-white/10 shadow-2xl transition-all duration-300">
            <div className="space-y-2">
              <span className="text-xs font-mono text-indigo-400 uppercase tracking-widest">Step 3 of 3</span>
              <h2 className="text-2xl font-bold font-display text-white">Choose your AI Personality</h2>
              <p className="text-slate-400 text-sm">Select how your companion should motivate and nudge you toward deadlines.</p>
            </div>

            <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
              {[
                {
                  id: 'mentor',
                  icon: Compass,
                  label: '🧘 Wise Mentor',
                  desc: 'Supportive, patient, and structural. "You\'ve got this. Let\'s break this down together."',
                },
                {
                  id: 'coach',
                  icon: Sparkles,
                  label: '💪 Direct Coach',
                  desc: 'Goal-driven, high energy, and proactive. "3 tasks left. You are close. Let\'s push through!"',
                },
                {
                  id: 'friendly',
                  icon: HelpCircle,
                  label: '🤝 Friendly Assistant',
                  desc: 'Casual, low-key, conversational, and warm. "Hey! Quick reminder that your presentation is coming up."',
                },
                {
                  id: 'strict',
                  icon: AlertOctagon,
                  label: '📋 Strict Taskmaster',
                  desc: 'No-nonsense, firm accountability. "You have 2 overdue tasks. Start focusing now to save your day."',
                },
              ].map((item) => (
                <div
                  key={item.id}
                  onClick={() => setPersonality(item.id as any)}
                  className={`p-3 rounded-xl border flex gap-3 items-start cursor-pointer transition-all duration-200 ${
                    personality === item.id
                      ? 'bg-indigo-600/20 border-indigo-500 shadow-md shadow-indigo-500/10'
                      : 'bg-slate-900/30 border-white/5 hover:border-white/15'
                  }`}
                >
                  <item.icon className={`w-5 h-5 mt-0.5 ${personality === item.id ? 'text-indigo-400' : 'text-slate-500'}`} />
                  <div>
                    <h3 className="font-semibold text-white text-sm">{item.label}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">PROACTIVE REMINDER NUDGES</label>
              <div className="grid grid-cols-3 gap-2 bg-slate-950/40 p-1 rounded-xl border border-white/5">
                {['low', 'medium', 'high'].map((freq) => (
                  <button
                    key={freq}
                    onClick={() => setNudgeFrequency(freq as any)}
                    className={`py-1.5 rounded-lg text-xs font-medium capitalize transition-all cursor-pointer ${
                      nudgeFrequency === freq
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {freq}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="w-1/3 py-3 text-slate-400 hover:text-white border border-white/10 rounded-xl transition-colors cursor-pointer"
              >
                Back
              </button>
              <button
                onClick={handleNext}
                className="w-2/3 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer"
              >
                Enter Applet <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
