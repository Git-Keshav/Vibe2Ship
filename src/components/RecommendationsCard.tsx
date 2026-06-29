import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Task, Habit, FocusSession } from '../types';
import GlassCard from './GlassCard';
import { 
  Sparkles, Zap, Clock, Flame, Brain, CheckCircle2, AlertTriangle, RefreshCw, 
  HelpCircle, Coffee, Compass, ChevronRight, BarChart
} from 'lucide-react';

interface RecommendationsCardProps {
  tasks: Task[];
  habits: Habit[];
  focusSessions: FocusSession[];
}

type EnergyStatus = 'exhausted' | 'steady' | 'charged' | 'peak';

export default function RecommendationsCard({ tasks, habits, focusSessions }: RecommendationsCardProps) {
  // User-interactive energy levels
  const [currentEnergy, setCurrentEnergy] = useState<EnergyStatus>('charged');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Active time calculations based on focus sessions or default to standard hours
  const peakFocusHour = useMemo(() => {
    if (focusSessions.length === 0) return '9:00 AM - 11:30 AM';
    
    // Group sessions by completion hour
    const hourCounts: { [key: number]: number } = {};
    focusSessions.forEach(session => {
      try {
        const date = new Date(session.completedAt);
        const hour = date.getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      } catch (e) {
        // Fallback
      }
    });

    let bestHour = 9; // default morning
    let maxCount = 0;
    Object.entries(hourCounts).forEach(([hourStr, count]) => {
      const countNum = count as number;
      if (countNum > maxCount) {
        maxCount = countNum;
        bestHour = parseInt(hourStr);
      }
    });

    if (bestHour >= 5 && bestHour < 12) {
      return `${bestHour}:00 AM - ${bestHour + 2}:30 AM (Morning Peak)`;
    } else if (bestHour >= 12 && bestHour < 17) {
      return `${bestHour - 12 || 12}:00 PM - ${(bestHour - 12 || 12) + 2}:30 PM (Afternoon Focus)`;
    } else if (bestHour >= 17 && bestHour < 21) {
      return `${bestHour - 12}:00 PM - ${(bestHour - 12) + 2}:30 PM (Evening Surge)`;
    } else {
      return `9:00 PM - 11:30 PM (Night Owl)`;
    }
  }, [focusSessions]);

  // Generate recommendation list dynamically
  const recommendations = useMemo(() => {
    const list: {
      id: string;
      title: string;
      description: string;
      type: 'energy' | 'habit' | 'focus' | 'urgency';
      icon: any;
      actionText?: string;
    }[] = [];

    // Filter pending tasks
    const pendingTasks = tasks.filter(t => t.status !== 'completed');
    const completedTasks = tasks.filter(t => t.status === 'completed');
    const criticalTasks = pendingTasks.filter(t => t.priority === 'critical');
    const deepTasks = pendingTasks.filter(t => t.energyRequired === 'deep');
    const quickTasks = pendingTasks.filter(t => t.energyRequired === 'quick');

    // Recommendation 1: Dynamic recommendation based on the interactive Energy selector
    if (currentEnergy === 'exhausted') {
      const targetQuick = quickTasks[0] || pendingTasks.find(t => t.energyRequired === 'quick' || t.energyRequired === 'light');
      if (targetQuick) {
        list.push({
          id: 'energy-state',
          title: 'Exhausted Energy Guard',
          description: `Energy levels are depleted. Postpone heavy cognitive loads and clear your plate with a quick win: "${targetQuick.title}" (estimated ${targetQuick.estimatedDuration}m).`,
          type: 'energy',
          icon: Coffee,
        });
      } else {
        list.push({
          id: 'energy-state',
          title: 'Power Down & Re-energize',
          description: 'No low-energy quick tasks remain. Consider stepping away for 15 minutes, drinking water, or doing a screen-free walk to recharge.',
          type: 'energy',
          icon: Coffee,
        });
      }
    } else if (currentEnergy === 'steady') {
      const adminTask = pendingTasks.find(t => t.energyRequired === 'admin' || t.energyRequired === 'light');
      if (adminTask) {
        list.push({
          id: 'energy-state',
          title: 'Steady State: Admin Catch-up',
          description: `Perfect steady energy for administrative tasks. Knock out "${adminTask.title}" which requires light focal power.`,
          type: 'energy',
          icon: Brain,
        });
      } else {
        list.push({
          id: 'energy-state',
          title: 'Momentum Builder',
          description: 'Start with a minor task or clear subtasks of a larger task first to grease the wheels of progress.',
          type: 'energy',
          icon: Brain,
        });
      }
    } else if (currentEnergy === 'charged' || currentEnergy === 'peak') {
      const deepTask = deepTasks[0] || pendingTasks.find(t => t.priority === 'high' || t.priority === 'critical');
      if (deepTask) {
        list.push({
          id: 'energy-state',
          title: 'High-Cognitive Surge Match',
          description: `You are in peak state! Take on your most challenging task: "${deepTask.title}". Avoid multitasking to keep your focus locked.`,
          type: 'energy',
          icon: Zap,
        });
      } else {
        list.push({
          id: 'energy-state',
          title: 'Strategic Exploration',
          description: 'High energy state but no deep tasks left! Clean up outstanding lists or draft strategies for your upcoming long-term goals.',
          type: 'energy',
          icon: Compass,
        });
      }
    }

    // Recommendation 2: Habit Streaks analysis
    if (habits.length > 0) {
      const bestHabit = [...habits].sort((a, b) => b.streakDays - a.streakDays)[0];
      const strugglingHabit = habits.find(h => h.streakDays === 0);

      if (bestHabit && bestHabit.streakDays > 0) {
        list.push({
          id: 'habit-streak',
          title: `Protect the ${bestHabit.name} Streak`,
          description: `You've kept the "${bestHabit.name}" habit alive for ${bestHabit.streakDays} consecutive days. Chain-link this task directly to your main routine.`,
          type: 'habit',
          icon: Flame,
        });
      } else if (strugglingHabit) {
        list.push({
          id: 'habit-reboot',
          title: `Re-anchoring: ${strugglingHabit.name}`,
          description: `Anchor "${strugglingHabit.name}" right after an existing solid action (like your morning beverage) to build reliable friction-free consistency.`,
          type: 'habit',
          icon: Compass,
        });
      }
    } else {
      list.push({
        id: 'habit-onboarding',
        title: 'Habit Association Trigger',
        description: 'No active habits set up. Establish one simple daily habit to automate accountability and double your completion ratios.',
        type: 'habit',
        icon: Compass,
      });
    }

    // Recommendation 3: Procrastination & Critical Tasks Warning
    if (criticalTasks.length > 0) {
      const urgent = criticalTasks[0];
      list.push({
        id: 'critical-alert',
        title: 'Immediate Action Urgency',
        description: `"${urgent.title}" has critical urgency. Tackle this first to release cortisol and anxiety. Divide it into micro-steps to overcome start friction.`,
        type: 'urgency',
        icon: AlertTriangle,
      });
    }

    // Recommendation 4: Active Time / Focus Sessions Insights
    if (focusSessions.length > 0) {
      const totalSessions = focusSessions.length;
      const distractionsAvg = (focusSessions.reduce((sum, s) => sum + s.distractionsCount, 0) / totalSessions).toFixed(1);
      
      if (parseFloat(distractionsAvg) > 2) {
        list.push({
          id: 'focus-distractions',
          title: 'Sensory Isolation Shielding',
          description: `Focus sessions average ${distractionsAvg} interruptions. We highly recommend activating Full Isolation (Do Not Disturb) for your next session.`,
          type: 'focus',
          icon: Clock,
        });
      } else {
        list.push({
          id: 'focus-momentum',
          title: 'Productive Rhythm Lock',
          description: `Your peak performance window is active between ${peakFocusHour}. Guard this period as sacred, offline-only time.`,
          type: 'focus',
          icon: Brain,
        });
      }
    } else {
      list.push({
        id: 'focus-try',
        title: 'Unlock Focus Metric Logging',
        description: `Start a Pomodoro or Sprint session in the Focus Space. Logging distractions builds high meta-cognitive discipline.`,
        type: 'focus',
        icon: Clock,
      });
    }

    // Trim or shuffle slightly to show variety
    return list.slice(0, 3);
  }, [tasks, habits, focusSessions, currentEnergy, peakFocusHour]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      setRefreshKey(prev => prev + 1);
    }, 600);
  };

  const getEnergyBadgeStyles = (status: EnergyStatus) => {
    switch (status) {
      case 'exhausted':
        return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
      case 'steady':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'charged':
        return 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20';
      case 'peak':
        return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
    }
  };

  return (
    <GlassCard className="p-5 space-y-4 relative overflow-hidden" id="recommendations-container">
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none"></div>

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-500 animate-pulse" />
          <div>
            <h3 className="font-bold text-theme-heading font-display text-sm">Adaptive Focus Advisor</h3>
            <p className="text-[10px] text-theme-subtle">Hyper-personalized advice for your current state</p>
          </div>
        </div>

        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="p-1.5 rounded-lg bg-indigo-500/5 hover:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/10 transition-all cursor-pointer flex items-center justify-center shrink-0"
          title="Recalibrate Suggestions"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Energy State Picker */}
      <div className="space-y-2">
        <span className="text-[9px] uppercase font-mono font-bold tracking-wider text-theme-subtle">How is your focus/energy level right now?</span>
        <div className="grid grid-cols-4 gap-1.5">
          {(['exhausted', 'steady', 'charged', 'peak'] as EnergyStatus[]).map((state) => {
            const isSelected = currentEnergy === state;
            const badgeStyles = getEnergyBadgeStyles(state);
            return (
              <button
                key={state}
                onClick={() => setCurrentEnergy(state)}
                className={`py-1.5 px-1 rounded-xl border text-[10px] font-bold capitalize transition-all cursor-pointer ${
                  isSelected 
                    ? `${badgeStyles} border-opacity-100 scale-102 ring-2 ring-indigo-500/20` 
                    : 'bg-transparent border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 opacity-60 hover:opacity-100'
                }`}
              >
                {state}
              </button>
            );
          })}
        </div>
      </div>

      {/* Recommendations List */}
      <div className="space-y-2.5 relative min-h-[160px]">
        <AnimatePresence mode="wait">
          {isRefreshing ? (
            <motion.div
              key="loader"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center space-y-2 py-8 bg-white/20 dark:bg-slate-900/10 backdrop-blur-[1px] rounded-2xl"
            >
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-[10px] font-mono font-medium text-slate-500">Recalibrating cognitive states...</span>
            </motion.div>
          ) : (
            <motion.div
              key={`list-${refreshKey}-${currentEnergy}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-2.5"
            >
              {recommendations.map((rec) => {
                const Icon = rec.icon;
                return (
                  <div
                    key={rec.id}
                    className="p-3 bg-slate-950/5 dark:bg-slate-950/25 hover:bg-slate-950/10 dark:hover:bg-slate-950/40 border border-slate-200 dark:border-white/5 rounded-2xl flex items-start gap-3 transition-all"
                  >
                    <div className="p-2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/15 rounded-xl shrink-0 mt-0.5">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-theme-heading font-display leading-tight">{rec.title}</h4>
                      <p className="text-[10px] text-theme-subtle leading-relaxed mt-0.5">{rec.description}</p>
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </GlassCard>
  );
}