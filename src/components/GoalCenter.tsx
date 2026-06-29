import React, { useState } from 'react';
import { motion } from 'motion/react';
import GlassCard from './GlassCard';
import CustomDropdown from './CustomDropdown';
import { Goal, Habit } from '../types';
import { Plus, Flame, Sparkles, Target, Trophy, Calendar, Check, AlertCircle, Trash2, X } from 'lucide-react';

interface GoalCenterProps {
  goals: Goal[];
  habits: Habit[];
  onAddGoal: (goal: Partial<Goal>) => void;
  onAddHabit: (habit: Partial<Habit>) => void;
  onUpdateGoal: (goalId: string, updates: Partial<Goal>) => void;
  onUpdateHabit: (habitId: string, updates: Partial<Habit>) => void;
  onDeleteGoal?: (goalId: string) => void;
  onDeleteHabit?: (habitId: string) => void;
}

const habitCategoryOptions = [
  { value: 'health', label: 'Health / Wellness', icon: '🌱' },
  { value: 'learning', label: 'Learning / Growth', icon: '📚' },
  { value: 'work', label: 'Work / Projects', icon: '💼' },
  { value: 'mind', label: 'Meditation / Mindfulness', icon: '🧘' }
];

const goalCategoryOptions = [
  { value: 'work', label: 'Business / Work', icon: '💼' },
  { value: 'health', label: 'Health / Athletics', icon: '🌱' },
  { value: 'financial', label: 'Financial Goal', icon: '💰' },
  { value: 'personal', label: 'Personal milestone', icon: '✨' }
];

export default function GoalCenter({
  goals,
  habits,
  onAddGoal,
  onAddHabit,
  onUpdateGoal,
  onUpdateHabit,
  onDeleteGoal,
  onDeleteHabit,
}: GoalCenterProps) {
  // Tabs: 'goals' | 'habits'
  const [activeTab, setActiveTab] = useState<'habits' | 'goals'>('habits');

  // Form states
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalDesc, setGoalDesc] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalCategory, setGoalCategory] = useState('work');

  const [showHabitForm, setShowHabitForm] = useState(false);
  const [habitName, setHabitName] = useState('');
  const [habitDesc, setHabitDesc] = useState('');
  const [habitCategory, setHabitCategory] = useState('health');

  // Confirmation states for deletion (non-blocking for iframe / multi-mode environments)
  const [confirmDeleteHabitId, setConfirmDeleteHabitId] = useState<string | null>(null);
  const [confirmDeleteGoalId, setConfirmDeleteGoalId] = useState<string | null>(null);

  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalTitle.trim()) return;

    onAddGoal({
      title: goalTitle.trim(),
      description: goalDesc.trim(),
      targetDate: goalTarget || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      category: goalCategory,
      progress: 0,
      healthScore: 80,
    });

    setGoalTitle('');
    setGoalDesc('');
    setGoalTarget('');
    setShowGoalForm(false);
  };

  const handleCreateHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!habitName.trim()) return;

    onAddHabit({
      name: habitName.trim(),
      description: habitDesc.trim(),
      streakDays: 0,
      longestStreak: 0,
      category: habitCategory,
      history: [],
    });

    setHabitName('');
    setHabitDesc('');
    setShowHabitForm(false);
  };

  const handleToggleHabitToday = (habit: Habit) => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const completedToday = habit.history.includes(todayStr);

    let updatedHistory = [...habit.history];
    let newStreak = habit.streakDays;

    if (completedToday) {
      // Remove today from history
      updatedHistory = updatedHistory.filter((d) => d !== todayStr);
      newStreak = Math.max(0, newStreak - 1);
    } else {
      // Add today to history
      updatedHistory.push(todayStr);
      newStreak += 1;
    }

    const newLongest = Math.max(habit.longestStreak, newStreak);

    onUpdateHabit(habit.id, {
      history: updatedHistory,
      streakDays: newStreak,
      longestStreak: newLongest,
    });
  };

  // Generate the last 7 days list for individual checklists
  const getLast7Days = () => {
    const days = [];
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push({
        dateStr: d.toISOString().slice(0, 10),
        dayNum: d.getDate(),
        weekday: weekdays[d.getDay()],
        isToday: i === 0,
      });
    }
    return days;
  };

  const last7Days = getLast7Days();

  // Habit check-in grid (representing simulated consistencies over past 15 days)
  const getHabitGrid = () => {
    const grid = [];
    for (let i = 24; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      grid.push(d.toISOString().slice(0, 10));
    }
    return grid;
  };

  const habitGridDates = getHabitGrid();

  const getHealthColor = (score: number) => {
    if (score >= 75) return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-500/20';
    if (score >= 45) return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-amber-500/20';
    return 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 border-rose-500/20';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight text-theme-heading flex items-center gap-2">
            🎯 Habits & Vision Goals
          </h1>
          <p className="text-slate-400 text-xs mt-0.5">Build compound consistencies with daily habit stacks and measure long-term targets.</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('habits')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all border ${
              activeTab === 'habits'
                ? 'bg-indigo-600/10 border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'bg-[var(--glass-highlight)] border-[var(--glass-border)] text-slate-500 dark:text-slate-400 hover:bg-[var(--glass-bg)]'
            }`}
          >
            Daily Habits
          </button>
          <button
            onClick={() => setActiveTab('goals')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all border ${
              activeTab === 'goals'
                ? 'bg-indigo-600/10 border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'bg-[var(--glass-highlight)] border-[var(--glass-border)] text-slate-500 dark:text-slate-400 hover:bg-[var(--glass-bg)]'
            }`}
          >
            Vision Goals
          </button>
        </div>
      </div>

      {activeTab === 'habits' ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-theme-heading font-display text-sm">Active Habit Stacks</h3>
            <button
              onClick={() => setShowHabitForm(!showHabitForm)}
              className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-600/10 hover:bg-indigo-100 dark:hover:bg-indigo-600/20 border border-indigo-200 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> Define Habit
            </button>
          </div>

          {/* New Habit Form */}
          {showHabitForm && (
            <GlassCard className="border-indigo-500/20 p-5 space-y-4">
              <h4 className="font-semibold text-theme-heading font-display text-sm">Set New Compound Habit</h4>
              <form onSubmit={handleCreateHabit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Habit Name</label>
                  <input
                    type="text"
                    value={habitName}
                    onChange={(e) => setHabitName(e.target.value)}
                    placeholder="e.g. Read 30 mins"
                    required
                    className="w-full px-4 py-2 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl text-[var(--input-text)] focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Description</label>
                  <input
                    type="text"
                    value={habitDesc}
                    onChange={(e) => setHabitDesc(e.target.value)}
                    placeholder="e.g. Right after morning coffee"
                    className="w-full px-4 py-2 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl text-[var(--input-text)] focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs"
                  />
                </div>

                <div className="flex gap-2 items-end">
                  <div className="space-y-1 flex-grow flex flex-col">
                    <label className="text-xs text-slate-400 mb-1">Category</label>
                    <CustomDropdown
                      value={habitCategory}
                      onChange={setHabitCategory}
                      options={habitCategoryOptions}
                      className="w-full"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition-all h-[36px] cursor-pointer shadow-md shadow-indigo-600/10"
                  >
                    Add
                  </button>
                </div>
              </form>
            </GlassCard>
          )}

          {/* Habit Lists */}
          <div className="grid grid-cols-1 gap-4">
            {habits.length === 0 ? (
              <GlassCard className="text-center py-10 border-dashed border-slate-300 dark:border-white/5">
                <p className="text-slate-400 text-xs font-medium">No habits registered. Create one to lock down daily streaks!</p>
              </GlassCard>
            ) : (
              habits.map((habit) => {
                const todayStr = new Date().toISOString().slice(0, 10);
                const isCompletedToday = habit.history.includes(todayStr);

                return (
                  <GlassCard key={habit.id} className="border-slate-200 dark:border-white/10 bg-slate-950/10 dark:bg-white/5 p-4 space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-theme-heading font-display text-sm">{habit.name}</h4>
                          <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-500/20 text-[9px] font-mono text-indigo-600 dark:text-indigo-400 capitalize">
                            {habit.category}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">{habit.description || 'Practice daily consistency.'}</p>
                      </div>

                      {/* Streaks metrics */}
                      <div className="flex items-center gap-4 flex-wrap md:flex-nowrap">
                        <div className="text-left">
                          <span className="block text-[10px] text-slate-500 font-semibold uppercase">Streak</span>
                          <span className="text-sm font-bold text-theme-heading flex items-center gap-1 font-mono">
                            <Flame className="w-4 h-4 text-orange-500 fill-orange-500/20" /> {habit.streakDays} days
                          </span>
                        </div>
                        <div className="text-left">
                          <span className="block text-[10px] text-slate-500 font-semibold uppercase">Record</span>
                          <span className="text-sm font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1 font-mono">
                            <Trophy className="w-4 h-4 text-yellow-500" /> {habit.longestStreak} days
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleHabitToday(habit)}
                            className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center gap-1 ${
                              isCompletedToday
                                ? 'bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/15'
                            }`}
                          >
                            {isCompletedToday ? <Check className="w-3.5 h-3.5" /> : null}
                            {isCompletedToday ? 'Done Today' : 'Mark Done'}
                          </button>

                          {confirmDeleteHabitId === habit.id ? (
                            <div className="flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/20 p-1 rounded-xl animate-fade-in shrink-0">
                              <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 px-1 font-mono uppercase">Delete?</span>
                              <button
                                onClick={() => {
                                  onDeleteHabit?.(habit.id);
                                  setConfirmDeleteHabitId(null);
                                }}
                                className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold rounded-lg cursor-pointer transition-colors"
                              >
                                Yes
                              </button>
                              <button
                                onClick={() => setConfirmDeleteHabitId(null)}
                                className="p-1 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg cursor-pointer transition-colors"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDeleteHabitId(habit.id)}
                              title="Delete Habit"
                              className="p-2 text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 rounded-xl transition-all cursor-pointer shrink-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Weekly habit review & history grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-200 dark:border-white/5">
                      {/* Last 7 days status */}
                      <div className="space-y-2">
                        <span className="text-[10px] text-slate-500 font-semibold uppercase block">Weekly Track</span>
                        <div className="flex justify-between bg-slate-100 dark:bg-slate-950/20 p-2 rounded-xl border border-slate-200 dark:border-white/5">
                          {last7Days.map((day) => {
                            const completed = habit.history.includes(day.dateStr);
                            return (
                              <div key={day.dateStr} className="text-center space-y-1">
                                <span className="text-[9px] text-slate-500 block font-mono">{day.weekday}</span>
                                <div
                                  onClick={() => {
                                    // Custom history logging
                                    let updatedHistory = [...habit.history];
                                    if (completed) {
                                      updatedHistory = updatedHistory.filter((d) => d !== day.dateStr);
                                    } else {
                                      updatedHistory.push(day.dateStr);
                                    }
                                    onUpdateHabit(habit.id, { history: updatedHistory });
                                  }}
                                  className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-semibold cursor-pointer transition-all ${
                                    completed
                                      ? 'bg-emerald-50 dark:bg-emerald-500/20 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                                      : day.isToday
                                      ? 'bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400'
                                      : 'bg-slate-200 dark:bg-slate-900 border border-slate-300 dark:border-white/5 text-slate-500'
                                  }`}
                                >
                                  {day.dayNum}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Grid Heatmap (Visual habit ledger) */}
                      <div className="space-y-2">
                        <span className="text-[10px] text-slate-500 font-semibold uppercase block">Streak contribution ledger</span>
                        <div className="flex flex-wrap gap-1 bg-slate-100 dark:bg-slate-950/20 p-2.5 rounded-xl border border-slate-200 dark:border-white/5 justify-start h-[44px] overflow-hidden">
                          {habitGridDates.map((dateStr) => {
                            const completed = habit.history.includes(dateStr);
                            return (
                              <div
                                key={dateStr}
                                className={`w-3.5 h-3.5 rounded-[3px] transition-all ${
                                  completed
                                    ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                                    : 'bg-slate-200 dark:bg-white/5'
                                }`}
                                title={dateStr}
                              />
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </GlassCard>
                );
              })
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-theme-heading font-display text-sm">Long-Horizon Targets</h3>
            <button
              onClick={() => setShowGoalForm(!showGoalForm)}
              className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-600/10 hover:bg-indigo-100 dark:hover:bg-indigo-600/20 border border-indigo-200 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> Set Vision Goal
            </button>
          </div>

          {/* New Goal Form */}
          {showGoalForm && (
            <GlassCard className="border-indigo-500/20 p-5 space-y-4">
              <h4 className="font-semibold text-theme-heading font-display text-sm">Define Vision Goal</h4>
              <form onSubmit={handleCreateGoal} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Vision Title</label>
                  <input
                    type="text"
                    value={goalTitle}
                    onChange={(e) => setGoalTitle(e.target.value)}
                    placeholder="e.g. Launch AI Startup MVP"
                    required
                    className="w-full px-4 py-2 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl text-[var(--input-text)] focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Brief Description</label>
                  <input
                    type="text"
                    value={goalDesc}
                    onChange={(e) => setGoalDesc(e.target.value)}
                    placeholder="Key success metrics..."
                    className="w-full px-4 py-2 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl text-[var(--input-text)] focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Target Date</label>
                  <input
                    type="date"
                    value={goalTarget}
                    onChange={(e) => setGoalTarget(e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl text-[var(--input-text)] focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs"
                  />
                </div>

                <div className="flex gap-2 items-end">
                  <div className="space-y-1 flex-grow flex flex-col">
                    <label className="text-xs text-slate-400 mb-1">Category</label>
                    <CustomDropdown
                      value={goalCategory}
                      onChange={setGoalCategory}
                      options={goalCategoryOptions}
                      className="w-full"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition-all h-[36px] cursor-pointer"
                  >
                    Create
                  </button>
                </div>
              </form>
            </GlassCard>
          )}

          {/* Goal Lists */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {goals.length === 0 ? (
              <GlassCard className="text-center py-10 border-dashed border-slate-300 dark:border-white/5 md:col-span-2">
                <p className="text-slate-400 text-xs font-medium">No long-horizon goals registered. Set one to inspire your daily focus blocks!</p>
              </GlassCard>
            ) : (
              goals.map((goal) => {
                const radius = 20;
                const circumference = 2 * Math.PI * radius;
                return (
                  <GlassCard key={goal.id} className="border-slate-200 dark:border-white/10 bg-slate-950/10 dark:bg-white/5 p-5 space-y-4">
                    <div className="flex justify-between items-start gap-4">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <Target className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                          <h4 className="font-bold text-theme-heading font-display text-sm">{goal.title}</h4>
                        </div>
                        <p className="text-xs text-slate-400">{goal.description || 'Target milestone.'}</p>
                        <div className="pt-1.5 flex flex-wrap gap-1.5">
                          <span className={`px-2 py-0.5 rounded-full border text-[9px] font-mono flex items-center gap-1 shrink-0 ${getHealthColor(goal.healthScore)}`}>
                            <AlertCircle className="w-2.5 h-2.5" /> Health: {goal.healthScore}%
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 text-[9px] font-mono text-slate-500 dark:text-slate-400 capitalize">
                            {goal.category}
                          </span>
                        </div>
                      </div>

                      {/* Animated Circular Progress */}
                      <div className="relative shrink-0 flex items-center justify-center bg-slate-100 dark:bg-slate-950/20 rounded-full p-1 border border-slate-200 dark:border-white/5">
                        <svg className="w-14 h-14" viewBox="0 0 50 50">
                          <circle
                            cx="25"
                            cy="25"
                            r={radius}
                            fill="transparent"
                            stroke="currentColor"
                            className="text-slate-200 dark:text-white/5"
                            strokeWidth="4"
                          />
                          <motion.circle
                            cx="25"
                            cy="25"
                            r={radius}
                            fill="transparent"
                            stroke="url(#goalIndigoGrad)"
                            strokeWidth="4"
                            strokeDasharray={circumference}
                            initial={{ strokeDashoffset: circumference }}
                            animate={{ strokeDashoffset: circumference - (goal.progress / 100) * circumference }}
                            transition={{ duration: 1.2, ease: "easeOut" }}
                            strokeLinecap="round"
                            style={{ rotate: -90, transformOrigin: '25px 25px' }}
                          />
                          <defs>
                            <linearGradient id="goalIndigoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#818cf8" />
                              <stop offset="100%" stopColor="#4f46e5" />
                            </linearGradient>
                          </defs>
                          <text
                            x="25"
                            y="28"
                            textAnchor="middle"
                            className="fill-current text-slate-800 dark:text-white text-[10px] font-mono font-bold"
                            dy=".3em"
                          >
                            {Math.round(goal.progress)}%
                          </text>
                        </svg>
                      </div>
                    </div>

                    {/* Goal Progress Slider with Animated Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                        <span>PROGRESS REGULATION</span>
                        <span className="text-indigo-600 dark:text-indigo-400 font-mono font-bold">{goal.progress}%</span>
                      </div>
                      
                      {/* Custom Framer Motion Animated Progress Bar */}
                      <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-950/40 rounded-full overflow-hidden relative border border-slate-300 dark:border-white/5 shadow-inner">
                        <motion.div
                          className="h-full bg-gradient-to-r from-indigo-500 via-indigo-400 to-emerald-400 rounded-full shadow-[0_0_12px_rgba(99,102,241,0.5)]"
                          initial={{ width: 0 }}
                          animate={{ width: `${goal.progress}%` }}
                          transition={{ type: "spring", damping: 15, stiffness: 120 }}
                        />
                      </div>

                      <div className="flex items-center gap-3 pt-1">
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={goal.progress}
                          onChange={(e) => onUpdateGoal(goal.id, { progress: Number(e.target.value) })}
                          className="flex-grow accent-indigo-500 bg-slate-200 dark:bg-slate-950/40 rounded-lg cursor-pointer h-1.5 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1 border-t border-slate-200 dark:border-white/5">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" /> Target: {new Date(goal.targetDate).toLocaleDateString(undefined, {
                          month: 'short', day: 'numeric', year: 'numeric'
                        })}
                      </span>

                      {confirmDeleteGoalId === goal.id ? (
                        <div className="flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/20 p-0.5 rounded-lg animate-fade-in shrink-0">
                          <span className="text-[9px] font-bold text-rose-600 dark:text-rose-400 px-1 font-mono uppercase">Delete?</span>
                          <button
                            onClick={() => {
                              onDeleteGoal?.(goal.id);
                              setConfirmDeleteGoalId(null);
                            }}
                            className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white text-[9px] font-bold rounded-md cursor-pointer transition-colors"
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setConfirmDeleteGoalId(null)}
                            className="p-0.5 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-md cursor-pointer transition-colors"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteGoalId(goal.id)}
                          title="Delete Goal"
                          className="p-1.5 text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-500/10 rounded-lg border border-transparent hover:border-rose-500/20 transition-all cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </GlassCard>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
