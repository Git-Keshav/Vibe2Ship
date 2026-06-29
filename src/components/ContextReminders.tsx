import React, { useState, useEffect, useRef } from 'react';
import { 
  Bell, MapPin, Clock, Zap, Plus, Trash2, ShieldCheck, Play, Radio, Volume2, VolumeX, Landmark, Home, Briefcase, Dumbbell, BookOpen, Coffee, HelpCircle, Check, Compass
} from 'lucide-react';
import GlassCard from './GlassCard';

export interface ContextReminder {
  id: string;
  title: string;
  type: 'location' | 'time' | 'activity';
  triggerValue: string; // "Office", "20:00", "Focus Session Active", etc.
  enabled: boolean;
  cooldownUntil?: number; // timestamp to prevent duplicate fires
  lastFired?: string;
}

interface ContextRemindersProps {
  onTriggerNotification: (message: string, category: 'System' | 'Tasks' | 'Focus' | 'Habits' | 'Inbox') => void;
  isFocusSessionActive: boolean;
  currentTaskTitle?: string;
  procrastinationRisk?: 'low' | 'medium' | 'high';
}

const DEFAULT_REMINDERS: ContextReminder[] = [
  {
    id: 'rem-1',
    title: 'Review focus objectives and block out distractions',
    type: 'location',
    triggerValue: 'Work Office',
    enabled: true,
  },
  {
    id: 'rem-2',
    title: 'Hydrate, stretch, and step away from the screen',
    type: 'activity',
    triggerValue: 'Focus Session Active',
    enabled: true,
  },
  {
    id: 'rem-3',
    title: 'Lock your phone away and prepare for a workout',
    type: 'location',
    triggerValue: 'Gym',
    enabled: true,
  },
  {
    id: 'rem-4',
    title: 'Shift to reflective journaling or high-density reading',
    type: 'location',
    triggerValue: 'Library',
    enabled: true,
  },
  {
    id: 'rem-5',
    title: 'Take a cognitive refresh breathing break',
    type: 'time',
    triggerValue: '15:30', // Mid-afternoon dip
    enabled: true,
  },
  {
    id: 'rem-6',
    title: 'Log complete tasks and clear inbox backlog',
    type: 'activity',
    triggerValue: 'High Procrastination Risk',
    enabled: true,
  },
];

const LOCATIONS = [
  { name: 'Home', icon: Home, coords: '37.7749, -122.4194', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  { name: 'Work Office', icon: Briefcase, coords: '37.7892, -122.4014', color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' },
  { name: 'Gym', icon: Dumbbell, coords: '37.7699, -122.4468', color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
  { name: 'Library', icon: BookOpen, coords: '37.7786, -122.4115', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  { name: 'Coffee Shop', icon: Coffee, coords: '37.7601, -122.4340', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' },
];

export default function ContextReminders({
  onTriggerNotification,
  isFocusSessionActive,
  currentTaskTitle,
  procrastinationRisk = 'medium',
}: ContextRemindersProps) {
  const [reminders, setReminders] = useState<ContextReminder[]>(() => {
    const saved = localStorage.getItem('context_reminders');
    return saved ? JSON.parse(saved) : DEFAULT_REMINDERS;
  });

  const [simulatedLocation, setSimulatedLocation] = useState<string>('Home');
  const [realGeolocation, setRealGeolocation] = useState<{ lat: number; lng: number } | null>(null);
  const [useRealLocation, setUseRealLocation] = useState<boolean>(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Time Slider simulation state
  const [simulatedTime, setSimulatedTime] = useState<string>(''); // empty means use real system time
  const [systemTimeStr, setSystemTimeStr] = useState<string>('');

  // Form states
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<'location' | 'time' | 'activity'>('location');
  const [newTriggerValue, setNewTriggerValue] = useState('Work Office');

  // Trigger feedback state
  const [triggerLog, setTriggerLog] = useState<{ id: string; title: string; time: string; type: string }[]>([]);

  // Sound chime
  const chimeAudioRef = useRef<HTMLAudioElement | null>(null);

  // Sync state to localstorage
  useEffect(() => {
    localStorage.setItem('context_reminders', JSON.stringify(reminders));
  }, [reminders]);

  // System real-time clock update
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hrs = String(now.getHours()).padStart(2, '0');
      const mins = String(now.getMinutes()).padStart(2, '0');
      setSystemTimeStr(`${hrs}:${mins}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // HTML5 Real Geolocation query
  useEffect(() => {
    if (!useRealLocation) return;
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      setGeoError('Geolocation not supported in browser.');
      setUseRealLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setRealGeolocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setGeoError(null);
        // Find nearest simulated location or mark custom
        setSimulatedLocation('Real GPS Location');
      },
      (error) => {
        setGeoError(error.message);
        setUseRealLocation(false);
      }
    );
  }, [useRealLocation]);

  // Play chime sound
  const playTriggerChime = () => {
    if (!soundEnabled) return;
    try {
      if (!chimeAudioRef.current) {
        chimeAudioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2019/2019-84.wav');
        chimeAudioRef.current.volume = 0.25;
      }
      chimeAudioRef.current.currentTime = 0;
      chimeAudioRef.current.play().catch(() => {});
    } catch (e) {}
  };

  // EVALUATOR ENGINE: runs when location, time, activity states update
  useEffect(() => {
    const activeTime = simulatedTime || systemTimeStr;
    if (!activeTime) return;

    const evaluatedReminders = reminders.map(rem => {
      if (!rem.enabled) return rem;
      
      // Cooldown safeguard (prevent duplicate firing in same 1-min window)
      if (rem.cooldownUntil && Date.now() < rem.cooldownUntil) {
        return rem;
      }

      let isTriggered = false;

      // Rule check
      if (rem.type === 'location') {
        isTriggered = (simulatedLocation === rem.triggerValue);
      } else if (rem.type === 'time') {
        isTriggered = (activeTime === rem.triggerValue);
      } else if (rem.type === 'activity') {
        if (rem.triggerValue === 'Focus Session Active') {
          isTriggered = isFocusSessionActive;
        } else if (rem.triggerValue === 'Focus Session Inactive') {
          isTriggered = !isFocusSessionActive;
        } else if (rem.triggerValue === 'High Procrastination Risk') {
          isTriggered = (procrastinationRisk === 'high');
        }
      }

      if (isTriggered) {
        // Trigger!
        playTriggerChime();
        onTriggerNotification(`📍 Context Reminder: ${rem.title}`, rem.type === 'activity' ? 'Focus' : rem.type === 'location' ? 'Tasks' : 'System');

        // Add to active log
        setTriggerLog(prev => [
          {
            id: 'log-' + Date.now(),
            title: rem.title,
            time: activeTime,
            type: rem.type
          },
          ...prev.slice(0, 15)
        ]);

        return {
          ...rem,
          cooldownUntil: Date.now() + 60000, // 1 min cooldown
          lastFired: activeTime
        };
      }

      return rem;
    });

    // Save evaluated reminder timestamps
    const hasFired = evaluatedReminders.some((rem, i) => rem.lastFired !== reminders[i].lastFired);
    if (hasFired) {
      setReminders(evaluatedReminders);
    }
  }, [simulatedLocation, simulatedTime, systemTimeStr, isFocusSessionActive, procrastinationRisk, reminders]);

  const handleAddReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newRem: ContextReminder = {
      id: 'rem-' + Date.now(),
      title: newTitle.trim(),
      type: newType,
      triggerValue: newTriggerValue,
      enabled: true
    };

    setReminders(prev => [newRem, ...prev]);
    setNewTitle('');
    onTriggerNotification(`New contextual rule added: "${newRem.title.substring(0, 20)}..."`, 'System');
  };

  const handleToggleReminder = (id: string) => {
    setReminders(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  const handleDeleteReminder = (id: string) => {
    setReminders(prev => prev.filter(r => r.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Upper Context Control Center */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Interactive Simulated Environment Card */}
        <div className="lg:col-span-7">
          <GlassCard className="p-5 space-y-4 relative overflow-hidden h-full">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <div>
                <h3 className="font-bold text-theme-heading font-display text-sm flex items-center gap-2">
                  <Compass className="w-4 h-4 text-indigo-400 animate-spin" style={{ animationDuration: '10s' }} />
                  LMLS Context Engine Simulator
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Toggle parameters below to simulate location arrivals or time ticks.</p>
              </div>

              <div className="flex items-center gap-2 bg-slate-950/20 px-2 py-1 rounded-lg border border-white/5">
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className="p-1 text-slate-400 hover:text-white transition-all cursor-pointer"
                  title={soundEnabled ? 'Mute chimes' : 'Unmute chimes'}
                >
                  {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-indigo-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-500" />}
                </button>
              </div>
            </div>

            {/* Simulated parameter sections */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Simulated Locations Selector */}
              <div className="space-y-2">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Simulated Coordinates</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {LOCATIONS.map((loc) => {
                    const active = simulatedLocation === loc.name && !useRealLocation;
                    const LocIcon = loc.icon;
                    return (
                      <button
                        key={loc.name}
                        onClick={() => {
                          setUseRealLocation(false);
                          setSimulatedLocation(loc.name);
                        }}
                        className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                          active 
                            ? 'bg-indigo-600/10 border-indigo-500/40 text-indigo-400 shadow-md font-bold'
                            : 'bg-slate-950/15 border-white/5 text-slate-400 hover:text-slate-300 hover:bg-white/5'
                        }`}
                      >
                        <LocIcon className="w-4 h-4 shrink-0" />
                        <span className="text-[9px] font-mono leading-none">{loc.name}</span>
                      </button>
                    );
                  })}
                  {/* Real GPS Toggle */}
                  <button
                    onClick={() => setUseRealLocation(prev => !prev)}
                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      useRealLocation
                        ? 'bg-emerald-600/10 border-emerald-500/40 text-emerald-400 shadow-md font-bold'
                        : 'bg-slate-950/15 border-white/5 text-slate-400 hover:text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    <Radio className="w-4 h-4 shrink-0 animate-pulse" />
                    <span className="text-[9px] font-mono leading-none">GPS</span>
                  </button>
                </div>
                {geoError && (
                  <p className="text-[9px] text-rose-400 font-mono mt-1">Error: {geoError}</p>
                )}
              </div>

              {/* Simulated Time & Activity status */}
              <div className="space-y-3.5">
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Simulated Time</label>
                    <button
                      onClick={() => setSimulatedTime('')}
                      className="text-[9px] font-semibold text-indigo-400 hover:underline cursor-pointer"
                    >
                      Reset to Live
                    </button>
                  </div>
                  <div className="flex gap-2 items-center">
                    <input
                      type="time"
                      value={simulatedTime || systemTimeStr}
                      onChange={(e) => setSimulatedTime(e.target.value)}
                      className="flex-1 px-3 py-2 bg-slate-950/20 border border-white/5 rounded-xl text-xs text-theme-heading focus:outline-none font-mono"
                    />
                    <span className="text-[10px] font-mono text-slate-500 font-bold uppercase">
                      {simulatedTime ? 'SIMULATED' : 'LIVE'}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-950/20 p-2.5 rounded-xl border border-white/5 flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-bold text-slate-500 font-mono uppercase block">Ongoing Activity State</span>
                    <span className="text-xs font-semibold text-theme-heading">
                      {isFocusSessionActive ? `🔥 Active Focus: "${currentTaskTitle || 'Ongoing Task'}"` : '💤 System Idle (No active Focus Session)'}
                    </span>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${isFocusSessionActive ? 'bg-rose-500 animate-ping' : 'bg-slate-500'}`} />
                </div>
              </div>
            </div>

            {/* Current Context Status indicators */}
            <div className="pt-3 border-t border-white/5 flex items-center justify-between flex-wrap gap-2 text-[10px] font-mono text-slate-400">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-indigo-400" /> Loc: <b className="text-theme-heading font-bold">{simulatedLocation}</b>
                {useRealLocation && realGeolocation && <span className="text-slate-500 font-medium">({realGeolocation.lat.toFixed(4)}, {realGeolocation.lng.toFixed(4)})</span>}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-emerald-400" /> Time: <b className="text-theme-heading font-bold">{simulatedTime || systemTimeStr}</b>
              </span>
              <span className="flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-400" /> Procrastination risk: <b className="text-theme-heading font-bold uppercase">{procrastinationRisk}</b>
              </span>
            </div>
          </GlassCard>
        </div>

        {/* Dynamic Context Trigger Log */}
        <div className="lg:col-span-5">
          <GlassCard className="p-5 space-y-3 h-full flex flex-col justify-between">
            <h4 className="font-bold text-theme-heading font-display text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-2">
              <Bell className="w-4 h-4 text-emerald-400 animate-bounce" /> Live trigger activity log
            </h4>

            <div className="flex-1 bg-slate-950/25 border border-white/5 rounded-2xl p-3.5 max-h-[175px] overflow-y-auto space-y-2">
              {triggerLog.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-6">
                  <ShieldCheck className="w-6 h-6 text-slate-600 mb-1" />
                  <p className="text-[10px] text-slate-500 font-mono">No triggers logged yet in this session. Change location or clock to fire alerts!</p>
                </div>
              ) : (
                triggerLog.map((log) => (
                  <div key={log.id} className="text-[10px] font-mono bg-white/5 border border-white/5 p-2 rounded-xl flex items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <p className="text-theme-heading font-semibold leading-tight">{log.title}</p>
                      <span className="text-[9px] text-slate-500">Trigger category: {log.type.toUpperCase()}</span>
                    </div>
                    <span className="text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded leading-none shrink-0">{log.time}</span>
                  </div>
                ))
              )}
            </div>
            
            <p className="text-[9px] text-slate-500 leading-normal text-center">
              * Context triggers run evaluation loops natively client-side for maximum speed and absolute privacy security.
            </p>
          </GlassCard>
        </div>
      </div>

      {/* Rules Creator & List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Create contextual reminder rule */}
        <div className="lg:col-span-4">
          <GlassCard className="p-5 space-y-4">
            <h4 className="font-bold text-theme-heading font-display text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-2">
              <Plus className="w-4 h-4 text-indigo-400" /> New Contextual Rule
            </h4>

            <form onSubmit={handleAddReminder} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Reminder Message</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Plan tomorrow's tasks list"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950/20 border border-white/5 rounded-xl text-xs text-theme-heading focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Context Trigger Type</label>
                <select
                  value={newType}
                  onChange={(e) => {
                    const type = e.target.value as 'location' | 'time' | 'activity';
                    setNewType(type);
                    // Prepopulate trigger value suggestions
                    if (type === 'location') setNewTriggerValue('Work Office');
                    else if (type === 'time') setNewTriggerValue('09:00');
                    else setNewTriggerValue('Focus Session Active');
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-950/20 border border-white/5 rounded-xl text-xs text-theme-heading focus:outline-none"
                >
                  <option value="location">📍 Arrive at Location</option>
                  <option value="time">⏰ Scheduled Clock Time</option>
                  <option value="activity">⚡ Ongoing App Activity</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Trigger Specific Condition</label>
                {newType === 'location' ? (
                  <select
                    value={newTriggerValue}
                    onChange={(e) => setNewTriggerValue(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950/20 border border-white/5 rounded-xl text-xs text-theme-heading focus:outline-none"
                  >
                    {LOCATIONS.map(loc => (
                      <option key={loc.name} value={loc.name}>Arriving at: {loc.name}</option>
                    ))}
                  </select>
                ) : newType === 'time' ? (
                  <input
                    type="time"
                    required
                    value={newTriggerValue}
                    onChange={(e) => setNewTriggerValue(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950/20 border border-white/5 rounded-xl text-xs text-theme-heading focus:outline-none font-mono"
                  />
                ) : (
                  <select
                    value={newTriggerValue}
                    onChange={(e) => setNewTriggerValue(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950/20 border border-white/5 rounded-xl text-xs text-theme-heading focus:outline-none"
                  >
                    <option value="Focus Session Active">Pomodoro/Focus Session Active</option>
                    <option value="Focus Session Inactive">No Focus Session Active (Idle)</option>
                    <option value="High Procrastination Risk">Procrastination risk marked HIGH</option>
                  </select>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Context Rule
              </button>
            </form>
          </GlassCard>
        </div>

        {/* Existing Rules List */}
        <div className="lg:col-span-8">
          <GlassCard className="p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <h4 className="font-bold text-theme-heading font-display text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Bell className="w-4 h-4 text-emerald-400" /> Registered Contextual Reminders Rules
              </h4>
              <span className="text-[10px] font-mono text-slate-500 font-bold">{reminders.length} RULES ACTIVE</span>
            </div>

            <div className="space-y-3 max-h-[310px] overflow-y-auto pr-1">
              {reminders.map((rem) => {
                const Icon = rem.type === 'location' ? MapPin : rem.type === 'time' ? Clock : Zap;
                const iconColor = rem.type === 'location' ? 'text-indigo-400' : rem.type === 'time' ? 'text-emerald-400' : 'text-amber-400';
                
                return (
                  <div 
                    key={rem.id} 
                    className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                      rem.enabled 
                        ? 'bg-slate-950/15 border-white/5 hover:border-white/10' 
                        : 'bg-slate-950/5 border-transparent opacity-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-xl bg-white/5 border border-white/5 mt-0.5 shrink-0 ${iconColor}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      
                      <div className="space-y-1 text-left">
                        <p className="text-xs font-semibold text-theme-heading leading-snug">{rem.title}</p>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-1.5 py-0.5 text-[8px] font-bold font-mono uppercase bg-white/5 text-slate-400 rounded border border-white/5 tracking-wider">
                            {rem.type}
                          </span>
                          <span className="text-[10px] text-indigo-400 font-semibold font-mono">
                            Trigger: {rem.triggerValue}
                          </span>
                          {rem.lastFired && (
                            <span className="text-[9px] text-slate-500 font-mono">
                              (Last fired: {rem.lastFired})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {/* Checkbox toggle */}
                      <button
                        onClick={() => handleToggleReminder(rem.id)}
                        className={`w-8 h-5 rounded-full p-0.5 transition-all cursor-pointer ${
                          rem.enabled ? 'bg-emerald-600 flex justify-end' : 'bg-slate-800 flex justify-start'
                        }`}
                      >
                        <span className="w-4 h-4 rounded-full bg-white shadow-sm" />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => handleDeleteReminder(rem.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 transition-all cursor-pointer rounded-lg hover:bg-rose-500/5"
                        title="Delete Rule"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
