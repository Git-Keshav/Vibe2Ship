import React, { useState } from 'react';
import GlassCard from './GlassCard';
import { AIAnalysis, Task, FocusSession, Habit, Goal } from '../types';
import { generateLocalHabitAnalysis } from '../lib/localIntelligence';
import { Sparkles, BarChart2, ShieldAlert, Clock, RefreshCw, AlertCircle, TrendingUp, CheckSquare, Compass, Mic } from 'lucide-react';
import ContextReminders from './ContextReminders';
import VoiceCommandConsole from './VoiceCommandConsole';
import AutonomousPlanner from './AutonomousPlanner';

interface InsightsCenterProps {
  tasks: Task[];
  focusSessions: FocusSession[];
  habits: Habit[];
  goals: Goal[];
  analysis: AIAnalysis | null;
  onUpdateAnalysis: (analysis: AIAnalysis) => void;
  onTriggerNotification: (message: string, category: 'System' | 'Tasks' | 'Focus' | 'Habits' | 'Inbox') => void;
  isFocusSessionActive: boolean;
  currentTaskTitle?: string;
  procrastinationRisk?: 'low' | 'medium' | 'high';
  onAddTask: (task: Partial<Task>) => void;
  onUpdateTask?: (taskId: string, updates: Partial<Task>) => void;
  onLaunchFocus: (minutes: number, type: 'pomodoro' | 'deep' | 'sprint' | 'custom') => void;
  onAddHabit: (habit: Partial<Habit>) => void;
  onUpdateHabit?: (habitId: string, updates: Partial<Habit>) => void;
  onAddGoal: (goal: Partial<Goal>) => void;
}

export default function InsightsCenter({
  tasks,
  focusSessions,
  habits,
  goals,
  analysis,
  onUpdateAnalysis,
  onTriggerNotification,
  isFocusSessionActive,
  currentTaskTitle,
  procrastinationRisk = 'medium',
  onAddTask,
  onUpdateTask,
  onLaunchFocus,
  onAddHabit,
  onUpdateHabit,
  onAddGoal,
}: InsightsCenterProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'analytics' | 'reminders' | 'voice' | 'autonomous'>('analytics');

  const handleRunAnalysis = async () => {
    setAnalyzing(true);
    setAnalysisError(null);

    // If offline, use local adaptive engine instantly
    if (!navigator.onLine) {
      const localResult = generateLocalHabitAnalysis(tasks, focusSessions, habits, goals);
      onUpdateAnalysis({ ...localResult, isLocal: true } as any);
      setAnalyzing(false);
      return;
    }

    try {
      const res = await fetch('/api/ai/analyze-habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks, focusSessions, habits, goals }),
      });
      if (res.ok) {
        const data = await res.json();
        onUpdateAnalysis({
          id: data.id || 'ai-analysis-' + Date.now(),
          userId: 'user',
          generatedAt: new Date().toISOString(),
          completionRate: data.completionRate || 0,
          peakHours: data.peakHours || 'Pending more data',
          procrastinationRisk: data.procrastinationRisk || 'medium',
          weeklyReport: data.weeklyReport || '',
          recommendations: data.recommendations || [],
        });
      } else {
        console.warn('API Habit analysis failed, utilizing local intelligence engine.');
        const localResult = generateLocalHabitAnalysis(tasks, focusSessions, habits, goals);
        onUpdateAnalysis({ ...localResult, isLocal: true } as any);
      }
    } catch (err: any) {
      console.warn('Error running habit analysis, utilizing local intelligence engine:', err);
      const localResult = generateLocalHabitAnalysis(tasks, focusSessions, habits, goals);
      onUpdateAnalysis({ ...localResult, isLocal: true } as any);
    } finally {
      setAnalyzing(false);
    }
  };

  // Safe custom Markdown-to-HTML parser for beautiful styled presentation of AI weekly reports
  const renderFormattedReport = (markdown: string) => {
    if (!markdown) return <p className="text-slate-400 text-xs">No analysis logged yet. Click "Recalculate Ledger" to generate.</p>;

    const lines = markdown.split('\n');
    return lines.map((line, idx) => {
      const cleanLine = line.trim();
      if (cleanLine.startsWith('###')) {
        return (
          <h4 key={idx} className="text-sm font-bold text-theme-heading font-display mt-4 mb-2 pb-1 border-b border-white/5 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            {cleanLine.substring(3).trim()}
          </h4>
        );
      }
      if (cleanLine.startsWith('##')) {
        return (
          <h3 key={idx} className="text-base font-bold text-theme-heading font-display mt-5 mb-2.5 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            {cleanLine.substring(2).trim()}
          </h3>
        );
      }
      if (cleanLine.startsWith('#')) {
        return (
          <h2 key={idx} className="text-lg font-extrabold text-theme-heading font-display mt-6 mb-3 flex items-center gap-2">
            {cleanLine.substring(1).trim()}
          </h2>
        );
      }
      if (cleanLine.startsWith('*') || cleanLine.startsWith('-')) {
        return (
          <li key={idx} className="text-xs text-slate-700 dark:text-slate-300 ml-4 list-disc list-outside mb-1.5 leading-relaxed">
            {cleanLine.substring(1).trim()}
          </li>
        );
      }
      if (/^\d+\./.test(cleanLine)) {
        return (
          <li key={idx} className="text-xs text-slate-700 dark:text-slate-300 ml-4 list-decimal list-outside mb-1.5 leading-relaxed">
            {cleanLine.replace(/^\d+\./, '').trim()}
          </li>
        );
      }
      if (cleanLine === '') {
        return <div key={idx} className="h-2"></div>;
      }
      return <p key={idx} className="text-xs text-slate-700 dark:text-slate-300 mb-2 leading-relaxed">{cleanLine}</p>;
    });
  };

  // Generate chart data for SVG Charting based on user task stats
  const getDailyCompletions = () => {
    // Count actual completions if available
    const completedTasks = tasks.filter(t => t.status === 'completed');
    // Map tasks completed in the last 7 days
    const counts = [0, 0, 0, 0, 0, 0, 0];
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    completedTasks.forEach((task) => {
      if (task.completedAt) {
        const completedDate = new Date(task.completedAt);
        const dayIdx = (completedDate.getDay() + 6) % 7; // Convert Sun-Sat to Mon-Sun
        counts[dayIdx] += 1;
      }
    });

    return days.map((day, idx) => ({ day, count: counts[idx] }));
  };

  const chartData = getDailyCompletions();
  const maxCount = Math.max(...chartData.map(d => d.count)) || 5;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight text-theme-heading flex items-center gap-2">
            📊 Productivity Intelligence
          </h1>
          <p className="text-slate-400 text-xs mt-0.5">Let AI learn from your focus rhythms, procrastination records, and consistency curves.</p>
        </div>

        {activeSubTab === 'analytics' && (
          <button
            onClick={handleRunAnalysis}
            disabled={analyzing}
            className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-lg cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${analyzing ? 'animate-spin' : ''}`} />
            {analyzing ? 'Learning rhythms...' : 'Analyze My Rhythms'}
          </button>
        )}
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex border-b border-slate-200 dark:border-white/5 pb-px gap-6">
        <button
          onClick={() => setActiveSubTab('analytics')}
          className={`pb-3 text-xs font-bold tracking-wider uppercase transition-all relative cursor-pointer ${
            activeSubTab === 'analytics'
              ? 'text-indigo-400 font-extrabold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          📊 Performance Analytics
          {activeSubTab === 'analytics' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('reminders')}
          className={`pb-3 text-xs font-bold tracking-wider uppercase transition-all relative cursor-pointer ${
            activeSubTab === 'reminders'
              ? 'text-indigo-400 font-extrabold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          💡 Smart Context Reminders
          {activeSubTab === 'reminders' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('voice')}
          className={`pb-3 text-xs font-bold tracking-wider uppercase transition-all relative cursor-pointer ${
            activeSubTab === 'voice'
              ? 'text-indigo-400 font-extrabold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          🎙️ Voice Commands Control
          {activeSubTab === 'voice' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('autonomous')}
          className={`pb-3 text-xs font-bold tracking-wider uppercase transition-all relative cursor-pointer ${
            activeSubTab === 'autonomous'
              ? 'text-indigo-400 font-extrabold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          🤖 Autopilot Routines
          {activeSubTab === 'autonomous' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />
          )}
        </button>
      </div>

      {activeSubTab === 'analytics' ? (
        !analysis ? (
          <GlassCard className="p-8 text-center max-w-2xl mx-auto my-6 space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-violet-500/10 rounded-full blur-3xl pointer-events-none"></div>
            
            <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/20">
              <Sparkles className="w-8 h-8 text-white animate-pulse" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold font-display text-theme-heading tracking-tight">AI Rhythm Analysis Engine</h2>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                Connect your workspace activities and compile real-time performance analytics. Our local intelligence engine evaluates your task velocity, deep work sessions, and habit streaks to find your peak focus hours and procrastination friction points.
              </p>
            </div>

            {/* Current Ledger Contents */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-950/20 border border-white/5 p-4 rounded-xl max-w-lg mx-auto text-left font-mono">
              <div className="p-2 border border-white/5 rounded-lg">
                <span className="block text-[9px] text-slate-500 uppercase font-bold">Tasks</span>
                <span className="text-sm font-extrabold text-indigo-400">{tasks.length} logged</span>
              </div>
              <div className="p-2 border border-white/5 rounded-lg">
                <span className="block text-[9px] text-slate-500 uppercase font-bold">Focus Blocks</span>
                <span className="text-sm font-extrabold text-indigo-400">{focusSessions.length} sessions</span>
              </div>
              <div className="p-2 border border-white/5 rounded-lg">
                <span className="block text-[9px] text-slate-500 uppercase font-bold">Habit Rules</span>
                <span className="text-sm font-extrabold text-indigo-400">{habits.length} tracked</span>
              </div>
              <div className="p-2 border border-white/5 rounded-lg">
                <span className="block text-[9px] text-slate-500 uppercase font-bold">Visions</span>
                <span className="text-sm font-extrabold text-indigo-400">{goals.length} active</span>
              </div>
            </div>

            <div className="flex flex-col items-center gap-3">
              <button
                onClick={handleRunAnalysis}
                disabled={analyzing}
                className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all shadow-lg cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${analyzing ? 'animate-spin' : ''}`} />
                {analyzing ? 'Ingesting Ledger Rhythms...' : 'Analyze My Rhythms'}
              </button>
              <p className="text-[10px] text-slate-500">
                Analysis is generated on-demand based purely on user-collected workspace telemetry.
              </p>
            </div>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Core metrics summary */}
            <div className="lg:col-span-1 space-y-4">
              <GlassCard className="text-center p-6 flex flex-col items-center justify-center space-y-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/10 rounded-full blur-xl pointer-events-none"></div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Productivity Yield</span>
                <div className="text-5xl font-extrabold text-indigo-400 font-mono tracking-tight animate-pulse">
                  {analysis ? `${analysis.completionRate}%` : 'N/A'}
                </div>
                <div className="space-y-1">
                  <h4 className="font-semibold text-theme-heading font-display text-xs flex items-center gap-1 justify-center">
                    <TrendingUp className="w-3.5 h-3.5 text-indigo-400" /> task completion rate
                  </h4>
                  <p className="text-[10px] text-slate-400">Calculated from total active task logs and historical timelines.</p>
                </div>
              </GlassCard>

              <GlassCard className="p-4 space-y-3">
                <h4 className="font-semibold text-theme-heading font-display text-xs uppercase tracking-wider">Attentional Metrics</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-500 font-bold uppercase">PEAK FOCUS HOURS</span>
                      <span className="text-xs font-semibold text-theme-heading">{analysis ? analysis.peakHours : 'Not computed'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
                      <ShieldAlert className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-500 font-bold uppercase">PEAK PROCRASTINATION RISK</span>
                      <span className={`text-xs font-semibold uppercase ${
                        analysis?.procrastinationRisk === 'high' ? 'text-rose-400' :
                        analysis?.procrastinationRisk === 'medium' ? 'text-amber-400' : 
                        analysis?.procrastinationRisk === 'low' ? 'text-emerald-400' : 'text-slate-400'
                      }`}>
                        {analysis ? analysis.procrastinationRisk : 'Not computed'}
                      </span>
                    </div>
                  </div>
                </div>
              </GlassCard>

              {/* SVG Custom Responsive Bar Chart (Completed tasks weekly timeline) */}
              <GlassCard className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-slate-700 dark:text-slate-200 font-display text-xs uppercase tracking-wider">Weekly Completions</h4>
                  <BarChart2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                </div>

                <div className="h-32 flex items-end justify-between gap-2 bg-slate-100 dark:bg-slate-950/20 p-3 rounded-xl border border-slate-200 dark:border-white/5 relative">
                  {chartData.map((d) => {
                    const heightPercent = maxCount > 0 ? (d.count / maxCount) * 100 : 0;
                    return (
                      <div key={d.day} className="flex-grow flex flex-col items-center gap-1.5 h-full justify-end group">
                        {/* Tooltip on hover */}
                        <span className="absolute bottom-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold text-slate-800 dark:text-theme-heading pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-10">
                          {d.count} tasks
                        </span>

                        <div 
                          className="w-full bg-gradient-to-t from-indigo-600/50 to-violet-500 rounded-md transition-all duration-500 min-h-[2px]"
                          style={{ height: `${heightPercent}%` }}
                        />
                        <span className="text-[9px] text-slate-500 font-mono font-semibold">{d.day}</span>
                      </div>
                    );
                  })}
                </div>
              </GlassCard>
            </div>

            {/* AI report and recommendations display */}
            <div className="lg:col-span-2 space-y-6">
              <GlassCard className="space-y-4">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <h3 className="font-bold text-theme-heading font-display text-sm flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 animate-pulse" /> Weekly AI Productivity Report
                  </h3>
                  {(analysis as any)?.isLocal && (
                    <span className="px-2 py-0.5 text-[8px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-bold rounded-full font-mono uppercase tracking-wider">⚡ Local Intelligence</span>
                  )}
                </div>
                
                <div className="bg-slate-100 dark:bg-slate-950/20 border border-slate-200 dark:border-white/5 p-5 rounded-2xl max-h-[340px] overflow-y-auto space-y-3 text-slate-700 dark:text-slate-300">
                  {analysisError ? (
                    <div className="space-y-3 py-4 text-center">
                      <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
                      <p className="text-rose-400 text-xs font-semibold">{analysisError}</p>
                    </div>
                  ) : analysis ? (
                    renderFormattedReport(analysis.weeklyReport)
                  ) : (
                    <div className="space-y-3 py-4 text-center">
                      <AlertCircle className="w-8 h-8 text-indigo-600 dark:text-indigo-400 mx-auto animate-bounce" />
                      <p className="text-slate-500 dark:text-slate-400 text-xs">
                        Your AI Productivity Companion is waiting to ingest your habits! Click "Analyze My Rhythms" to trigger the LangChain evaluation ledger.
                      </p>
                    </div>
                  )}
                </div>
              </GlassCard>

              {/* Action Recommendations cards */}
              {analysis && analysis.recommendations && analysis.recommendations.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-slate-700 dark:text-slate-300 font-display text-xs uppercase tracking-wider">AI Habit Coaching Action Items</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {analysis.recommendations.map((rec, index) => (
                      <div 
                        key={index}
                        className="p-3 bg-slate-100/60 dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 rounded-xl text-left text-xs text-slate-700 dark:text-slate-300 hover:border-indigo-500/20 hover:bg-slate-100 dark:hover:bg-slate-900/60 transition-all flex gap-2 items-start"
                      >
                        <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                        <span>{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      ) : activeSubTab === 'reminders' ? (
        <ContextReminders
          onTriggerNotification={onTriggerNotification}
          isFocusSessionActive={isFocusSessionActive}
          currentTaskTitle={currentTaskTitle}
          procrastinationRisk={analysis ? analysis.procrastinationRisk : 'medium'}
        />
      ) : activeSubTab === 'voice' ? (
        <VoiceCommandConsole
          onAddTask={onAddTask}
          onLaunchFocus={onLaunchFocus}
          onAddHabit={onAddHabit}
          onAddGoal={onAddGoal}
          onTriggerNotification={onTriggerNotification}
        />
      ) : (
        <AutonomousPlanner
          tasks={tasks}
          habits={habits}
          onAddTask={onAddTask}
          onUpdateTask={onUpdateTask}
          onAddHabit={onAddHabit}
          onUpdateHabit={onUpdateHabit}
          onTriggerNotification={onTriggerNotification}
        />
      )}
    </div>
  );
}
