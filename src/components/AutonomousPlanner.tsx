import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, Play, Pause, RotateCcw, Shield, ShieldAlert, Sparkles, CheckSquare, Clock, Zap, 
  HelpCircle, AlertCircle, Settings, FileText, CheckCircle2, Check, RefreshCw, Layers, CalendarDays
} from 'lucide-react';
import GlassCard from './GlassCard';
import { Task, Habit, Goal } from '../types';

interface AutonomousPlannerProps {
  tasks: Task[];
  habits: Habit[];
  onAddTask: (task: Partial<Task>) => void;
  onUpdateTask?: (taskId: string, updates: Partial<Task>) => void;
  onAddHabit: (habit: Partial<Habit>) => void;
  onUpdateHabit?: (habitId: string, updates: Partial<Habit>) => void;
  onTriggerNotification: (message: string, category: 'System' | 'Tasks' | 'Focus' | 'Habits' | 'Inbox') => void;
}

interface RoutineTemplate {
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  energyRequired: 'deep' | 'light' | 'admin' | 'quick';
  estimatedDuration: number;
  tags: string[];
  type: 'task' | 'habit';
  habitCategory?: string;
}

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'success' | 'warn' | 'action';
  message: string;
}

const PROFILE_TEMPLATES: Record<string, RoutineTemplate[]> = {
  Developer: [
    {
      title: "Daily Codebase Health Triage",
      description: "Review automated test outputs, open PRs, and address lingering architectural technical debt.",
      priority: "high",
      energyRequired: "deep",
      estimatedDuration: 45,
      tags: ["code-health", "triage", "autopilot-routine"],
      type: "task"
    },
    {
      title: "Automated Standup Checklist Compilation",
      description: "Summarize yesterday's accomplished checkins and draft key blockers autonomously.",
      priority: "medium",
      energyRequired: "quick",
      estimatedDuration: 15,
      tags: ["sync-prep", "automated-summary"],
      type: "task"
    },
    {
      title: "Stretching Break & Hydration Window",
      description: "Quick postural reset and mental breather to sustain ergonomic endurance.",
      priority: "medium",
      energyRequired: "quick",
      estimatedDuration: 10,
      tags: ["wellness", "ergonomics"],
      type: "habit",
      habitCategory: "Health"
    },
    {
      title: "Critical Security Log Audit",
      description: "Autonomous screening of database access anomalies and certificate warnings.",
      priority: "critical",
      energyRequired: "admin",
      estimatedDuration: 20,
      tags: ["security", "audit"],
      type: "task"
    }
  ],
  Wellness: [
    {
      title: "Mindfulness & Posture Alignment Cue",
      description: "Log regular desk standup transition and 2-minute centering breath.",
      priority: "medium",
      energyRequired: "quick",
      estimatedDuration: 5,
      tags: ["wellness", "mindfulness"],
      type: "habit",
      habitCategory: "Health"
    },
    {
      title: "Midday Cognitive Recovery Interval",
      description: "15 minutes of screen-free quiet focus to restore visual cortex processing.",
      priority: "medium",
      energyRequired: "light",
      estimatedDuration: 15,
      tags: ["rest", "wellness"],
      type: "task"
    },
    {
      title: "Dietary Tracker & Hydration Log",
      description: "Maintain optimal fuel intake and check active wellness challenges.",
      priority: "low",
      energyRequired: "quick",
      estimatedDuration: 10,
      tags: ["health", "nutrition"],
      type: "habit",
      habitCategory: "Health"
    }
  ],
  Academic: [
    {
      title: "Lecture Notes Structural Synthesis",
      description: "Re-organize messy rapid scribe logs into structured markdown index files.",
      priority: "high",
      energyRequired: "deep",
      estimatedDuration: 30,
      tags: ["study", "synthesis"],
      type: "task"
    },
    {
      title: "Weekly Curriculum Milestones Calibration",
      description: "Evaluate progress against target textbook pages and adjust study velocity.",
      priority: "medium",
      energyRequired: "light",
      estimatedDuration: 20,
      tags: ["academic-planning"],
      type: "task"
    },
    {
      title: "Academic Flashcard Review Segment",
      description: "Quick spaced repetition flashcard segment to build long-term recall.",
      priority: "medium",
      energyRequired: "quick",
      estimatedDuration: 15,
      tags: ["recall", "spaced-repetition"],
      type: "habit",
      habitCategory: "Intellect"
    }
  ],
  Strategist: [
    {
      title: "Quarterly Objective Alignment Review",
      description: "Compare daily action logs against primary milestones to ensure high-priority focus.",
      priority: "high",
      energyRequired: "deep",
      estimatedDuration: 40,
      tags: ["strategy", "planning"],
      type: "task"
    },
    {
      title: "Procrastination Vulnerability Screening",
      description: "Scan tasks pending over 3 days to flag warning states or required breakdowns.",
      priority: "medium",
      energyRequired: "admin",
      estimatedDuration: 15,
      tags: ["triage", "procrastination-shield"],
      type: "task"
    },
    {
      title: "Evening Reflection & Gratitude Log",
      description: "Solidify daily achievements and mentally transition out of work mode.",
      priority: "low",
      energyRequired: "quick",
      estimatedDuration: 10,
      tags: ["mindset", "reflection"],
      type: "habit",
      habitCategory: "Mindfulness"
    }
  ]
};

export default function AutonomousPlanner({
  tasks,
  habits,
  onAddTask,
  onUpdateTask,
  onAddHabit,
  onUpdateHabit,
  onTriggerNotification
}: AutonomousPlannerProps) {
  const [profile, setProfile] = useState<'Developer' | 'Wellness' | 'Academic' | 'Strategist'>('Developer');
  const [autonomyLevel, setAutonomyLevel] = useState<'manual' | 'semi' | 'full'>('semi');
  const [plannedRoutines, setPlannedRoutines] = useState<RoutineTemplate[]>(PROFILE_TEMPLATES.Developer);
  const [isRunningSim, setIsRunningSim] = useState(false);
  const [simStep, setSimStep] = useState(0);
  const [simProgress, setSimProgress] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: 'init',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      level: 'info',
      message: 'Autonomous Planner initialized. Selecting "Semi-Autonomous" autopilot policy.'
    }
  ]);

  const simTimeoutRef = useRef<any>(null);

  // Update planned routines when profile changes
  useEffect(() => {
    setPlannedRoutines(PROFILE_TEMPLATES[profile]);
    addLog('info', `Profile modified to "${profile}". Prepared ${PROFILE_TEMPLATES[profile].length} routine definitions.`);
  }, [profile]);

  const addLog = (level: 'info' | 'success' | 'warn' | 'action', message: string) => {
    const newLog: LogEntry = {
      id: 'log-' + Date.now() + Math.random().toString(36).substr(2, 5),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      level,
      message
    };
    setLogs(prev => [newLog, ...prev].slice(0, 50));
  };

  const handleClearLogs = () => {
    setLogs([
      {
        id: 'clear',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        level: 'info',
        message: 'Log audit history cleared.'
      }
    ]);
  };

  // Run autonomous lifecycle simulation
  const startAutopilotSimulation = () => {
    if (isRunningSim) {
      // Pause
      setIsRunningSim(false);
      addLog('warn', 'Autopilot execution loop suspended by supervisor.');
      if (simTimeoutRef.current) clearTimeout(simTimeoutRef.current);
      return;
    }

    setIsRunningSim(true);
    setSimStep(1);
    setSimProgress(10);
    addLog('action', `Starting automated sequence under [${autonomyLevel.toUpperCase()}] guidelines. Analyzing target routine set...`);
    
    // Step 1: Scan & Schedule
    simTimeoutRef.current = setTimeout(() => runSimulationStep(1), 1500);
  };

  const runSimulationStep = (currentStep: number) => {
    if (!isRunningSim) return;

    const templates = PROFILE_TEMPLATES[profile];
    
    switch(currentStep) {
      case 1:
        // Schedule first item
        const first = templates[0];
        addLog('info', `Autonomously scheduling critical item: "${first.title}"`);
        
        // Add to main ledger
        if (first.type === 'task') {
          onAddTask({
            title: `[Auto] ${first.title}`,
            description: first.description,
            priority: first.priority,
            energyRequired: first.energyRequired,
            estimatedDuration: first.estimatedDuration,
            tags: first.tags,
            contextTags: ["autonomous-scheduled"]
          });
          onTriggerNotification(`Autopilot scheduled task: ${first.title}`, 'Tasks');
        } else {
          onAddHabit({
            name: `[Auto] ${first.title}`,
            description: first.description,
            category: first.habitCategory || "Health"
          });
          onTriggerNotification(`Autopilot added habit trigger: ${first.title}`, 'Habits');
        }

        setSimStep(2);
        setSimProgress(40);
        addLog('success', `Routines catalogued. Created primary item "${first.title}" directly in standard user lists.`);
        simTimeoutRef.current = setTimeout(() => runSimulationStep(2), 2500);
        break;

      case 2:
        // Schedule second item & simulate active execution
        const second = templates[1 % templates.length];
        addLog('action', `Simulating background execution. Agent is automatically running active focus on: "${second.title}"`);
        
        if (second.type === 'task') {
          // Put standard task
          onAddTask({
            title: `[Auto] ${second.title}`,
            description: second.description,
            priority: second.priority,
            energyRequired: second.energyRequired,
            estimatedDuration: second.estimatedDuration,
            tags: second.tags,
            contextTags: ["autonomous-in-progress"]
          });
        }
        
        onTriggerNotification(`Autopilot processing routine: ${second.title}`, 'Focus');
        setSimStep(3);
        setSimProgress(75);
        addLog('info', `Active focus block successfully completed. Simulating status transition...`);
        simTimeoutRef.current = setTimeout(() => runSimulationStep(3), 2500);
        break;

      case 3:
        // Check off / Complete the routines
        addLog('success', `Successfully auto-completed planned tasks! Cleaned up current session memory.`);
        
        // Log habits if any match wellness
        const matchingHabits = templates.filter(t => t.type === 'habit');
        if (matchingHabits.length > 0) {
          const matching = matchingHabits[0];
          // Try to find the actual habit in lists or create
          const existingHabit = habits.find(h => h.name.includes(matching.title));
          if (existingHabit && onUpdateHabit) {
            const todayStr = new Date().toISOString().split('T')[0];
            const updatedHistory = existingHabit.history.includes(todayStr) 
              ? existingHabit.history 
              : [...existingHabit.history, todayStr];
            
            onUpdateHabit(existingHabit.id, {
              streakDays: existingHabit.streakDays + 1,
              history: updatedHistory
            });
            addLog('success', `Autonomously logged streak +1 for habit: "${matching.title}"`);
          } else {
            onAddHabit({
              name: `[Auto] ${matching.title}`,
              description: matching.description,
              category: matching.habitCategory || "Health"
            });
          }
        }

        onTriggerNotification(`Autonomous cleanup complete. 2 routines resolved!`, 'System');
        setSimStep(4);
        setSimProgress(100);
        setIsRunningSim(false);
        addLog('info', `Simulated autopilot cycle finished. High workspace hygiene and optimized cognitive pace preserved.`);
        break;

      default:
        setIsRunningSim(false);
        break;
    }
  };

  const handleManualTriggerSingle = (template: RoutineTemplate) => {
    addLog('action', `Supervisor manually authorized dispatch for: "${template.title}"`);
    if (template.type === 'task') {
      onAddTask({
        title: `[Auto] ${template.title}`,
        description: template.description,
        priority: template.priority,
        energyRequired: template.energyRequired,
        estimatedDuration: template.estimatedDuration,
        tags: template.tags,
        contextTags: ["manually-triggered-routine"]
      });
      onTriggerNotification(`Routine task dispatched: ${template.title}`, 'Tasks');
      addLog('success', `Task "${template.title}" successfully compiled and dispatched to active task pool.`);
    } else {
      onAddHabit({
        name: `[Auto] ${template.title}`,
        description: template.description,
        category: template.habitCategory || "Health"
      });
      onTriggerNotification(`Routine habit dispatched: ${template.title}`, 'Habits');
      addLog('success', `Habit tracker for "${template.title}" logged.`);
    }
  };

  const resetSimulation = () => {
    if (simTimeoutRef.current) clearTimeout(simTimeoutRef.current);
    setIsRunningSim(false);
    setSimStep(0);
    setSimProgress(0);
    addLog('info', 'Autopilot state machine reset to ground state.');
  };

  return (
    <div className="space-y-6 text-left">
      {/* Grid of Settings and Visual State Machine */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Settings and Config Panel */}
        <div className="lg:col-span-4">
          <GlassCard className="p-5 space-y-4 flex flex-col justify-between h-full">
            <div className="space-y-3">
              <h3 className="font-bold text-theme-heading font-display text-xs uppercase tracking-wider flex items-center gap-2 border-b border-white/5 pb-2">
                <Settings className="w-4 h-4 text-indigo-400" />
                Autopilot Policy Engine
              </h3>

              {/* Autopilot Profiles */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Routines Target Profile</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['Developer', 'Wellness', 'Academic', 'Strategist'] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setProfile(p)}
                      className={`px-2.5 py-1.5 text-[10px] font-semibold rounded-lg border transition-all text-center cursor-pointer ${
                        profile === p
                          ? 'bg-indigo-600/25 border-indigo-500 text-indigo-300 font-bold'
                          : 'bg-slate-950/20 border-white/5 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {p === 'Developer' ? '💻 Dev Core' :
                       p === 'Wellness' ? '🧘 Wellness' :
                       p === 'Academic' ? '📚 Academic' : '🎯 Strategist'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Autonomy Mode Selector */}
              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Autonomy Level</label>
                  <span className="text-[9px] text-slate-500 bg-slate-950/30 px-1.5 py-0.5 rounded border border-white/5 font-mono">
                    {autonomyLevel === 'manual' ? 'Low' : autonomyLevel === 'semi' ? 'Medium' : 'High'}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {([
                    { id: 'manual', label: 'Manual Approval Guard', desc: 'Prepares structures but dispatches only on supervisor click.' },
                    { id: 'semi', label: 'Co-Pilot Mode (Recommended)', desc: 'Autonomously inserts routine blocks and logs toast notices.' },
                    { id: 'full', label: 'Full Self-Executing Autopilot', desc: 'Directly schedules, runs background work, and clears routine tasks.' }
                  ] as const).map((level) => (
                    <button
                      key={level.id}
                      onClick={() => {
                        setAutonomyLevel(level.id);
                        addLog('warn', `Policy changed to: ${level.label}`);
                      }}
                      className={`w-full text-left p-2 rounded-xl border transition-all cursor-pointer flex gap-2.5 items-start ${
                        autonomyLevel === level.id
                          ? 'bg-indigo-600/10 border-indigo-500 text-indigo-300'
                          : 'bg-slate-950/20 border-white/5 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className={`p-1 rounded-md shrink-0 border mt-0.5 ${
                        autonomyLevel === level.id ? 'border-indigo-500/20 bg-indigo-500/10 text-indigo-400' : 'border-white/5 bg-slate-950/30 text-slate-500'
                      }`}>
                        <Shield className="w-3.5 h-3.5" />
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-bold block">{level.label}</span>
                        <span className="text-[9px] text-slate-500 leading-normal block">{level.desc}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-white/5 text-[9px] text-slate-500 leading-normal">
              * Change policy to match your cognitive stamina. Higher autonomy reduces ambient mental weight but relies on background completions.
            </div>
          </GlassCard>
        </div>

        {/* Live Simulation Playback Control */}
        <div className="lg:col-span-8 space-y-4">
          <GlassCard className="p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <div>
                <h3 className="font-bold text-theme-heading font-display text-xs uppercase tracking-wider flex items-center gap-2">
                  <Bot className="w-4 h-4 text-emerald-400" />
                  Active Routine Execution Simulation
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Test how the autopilot handles routines by running a live simulated cycle.</p>
              </div>

              <div className="flex gap-1.5">
                <button
                  onClick={startAutopilotSimulation}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-sm ${
                    isRunningSim 
                      ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-500/15'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/15'
                  }`}
                >
                  {isRunningSim ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  {isRunningSim ? 'Pause Cycle' : 'Simulate Autopilot Cycle'}
                </button>
                <button
                  onClick={resetSimulation}
                  className="p-1.5 bg-slate-950/20 border border-white/5 rounded-lg text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                  title="Reset simulation"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Simulated Live Segment Display */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { step: 1, name: '1. Scan & Schedule', desc: 'Scan active profile & create routine item' },
                { step: 2, name: '2. Execute Focus', desc: 'Initialize active focus simulation' },
                { step: 3, name: '3. Complete Routine', desc: 'Log completion & update main list' },
                { step: 4, name: '4. Session Report', desc: 'Clean up workspace & render report' }
              ].map((s) => {
                const isCurrent = simStep === s.step;
                const isDone = simStep > s.step;
                return (
                  <div 
                    key={s.step} 
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      isCurrent 
                        ? 'bg-indigo-600/10 border-indigo-500/40 text-indigo-300' 
                        : isDone 
                          ? 'bg-emerald-950/10 border-emerald-500/20 text-emerald-400' 
                          : 'bg-slate-950/25 border-white/5 text-slate-500'
                    }`}
                  >
                    <span className="text-[10px] font-bold block mb-0.5">{s.name}</span>
                    <span className="text-[8px] text-slate-500 leading-normal block">{s.desc}</span>
                  </div>
                );
              })}
            </div>

            {/* Progress Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>Simulation Progress</span>
                <span>{simProgress}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-950/40 rounded-full overflow-hidden border border-white/5">
                <div 
                  className="h-full bg-indigo-500 transition-all duration-500 rounded-full" 
                  style={{ width: `${simProgress}%` }}
                />
              </div>
            </div>

            {/* Live Terminal Log Stream */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">Agent Background Console Logs</span>
                <button 
                  onClick={handleClearLogs}
                  className="text-[9px] text-slate-500 hover:text-slate-300 font-mono font-bold cursor-pointer"
                >
                  [Clear Log History]
                </button>
              </div>

              <div className="bg-slate-950/40 border border-white/5 rounded-xl p-3 h-[135px] overflow-y-auto font-mono text-[10px] space-y-1.5 text-slate-300 scrollbar-thin">
                {logs.map((log) => (
                  <div key={log.id} className="leading-relaxed">
                    <span className="text-slate-500 font-bold mr-1.5">[{log.timestamp}]</span>
                    {log.level === 'success' && <span className="text-emerald-400 font-bold mr-1">[SUCCESS] </span>}
                    {log.level === 'warn' && <span className="text-rose-400 font-bold mr-1">[WARN] </span>}
                    {log.level === 'action' && <span className="text-indigo-400 font-bold mr-1">[AGENT] </span>}
                    {log.level === 'info' && <span className="text-blue-400 font-bold mr-1">[INFO] </span>}
                    <span>{log.message}</span>
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>
        </div>

      </div>

      {/* Routine Definitions & Direct Dispatch Table */}
      <div className="space-y-3">
        <h4 className="font-bold text-theme-heading font-display text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-2">
          <CalendarDays className="w-4 h-4 text-indigo-400" />
          Active "{profile}" Routine Catalog ({plannedRoutines.length} Items)
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {plannedRoutines.map((routine) => (
            <GlassCard key={routine.title} className="p-4 space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex justify-between items-start gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-[8px] font-mono uppercase font-bold tracking-wider ${
                    routine.type === 'task' 
                      ? 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-400' 
                      : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                  }`}>
                    {routine.type === 'task' ? '📋 task' : '🧘 habit'}
                  </span>
                  
                  <div className="flex gap-1 font-mono text-[8px] text-slate-400">
                    <Clock className="w-2.5 h-2.5" />
                    <span>{routine.estimatedDuration}m</span>
                  </div>
                </div>

                <div>
                  <h5 className="text-xs font-bold text-theme-heading font-display tracking-tight leading-tight mb-1">
                    {routine.title}
                  </h5>
                  <p className="text-[10px] text-slate-400 leading-normal">
                    {routine.description}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                <div className="flex gap-1.5">
                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold capitalize ${
                    routine.priority === 'critical' ? 'bg-rose-500/15 text-rose-400 border border-rose-500/10' :
                    routine.priority === 'high' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/10' :
                    routine.priority === 'medium' ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/10' :
                    'bg-slate-500/15 text-slate-400 border border-white/5'
                  }`}>
                    {routine.priority}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[8px] font-mono font-bold bg-slate-950/40 text-slate-400 border border-white/5 uppercase">
                    {routine.energyRequired}
                  </span>
                </div>

                <button
                  onClick={() => handleManualTriggerSingle(routine)}
                  className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[9px] font-bold transition-all cursor-pointer flex items-center gap-1"
                >
                  <Zap className="w-2.5 h-2.5" />
                  Dispatch
                </button>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>
    </div>
  );
}
