import React, { useState, useEffect, useRef } from 'react';
import GlassCard from './GlassCard';
import CustomDropdown from './CustomDropdown';
import { FocusSession, Task } from '../types';
import { Play, Pause, RotateCcw, Volume2, VolumeX, AlertTriangle, Sparkles, Smile, Coffee } from 'lucide-react';

interface FocusModeProps {
  tasks: Task[];
  onAddSession: (session: Partial<FocusSession>) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onActiveChange?: (isActive: boolean, taskTitle?: string) => void;
}

const SOUNDSCAPES = [
  { id: 'rain', label: '🌧️ Heavy Rain', url: '' },
  { id: 'forest', label: '🌲 Forest Birds', url: '' },
  { id: 'cafe', label: '☕ Cozy Café', url: '' },
  { id: 'lofi', label: '🎵 Chill Lofi', url: '' },
];

class SoundscapeSynth {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private activeNodes: { stop: () => void }[] = [];
  private currentType: string = '';
  private isPlaying: boolean = false;
  private volVal: number = 0.5;

  constructor() {}

  init() {
    if (this.ctx) return;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    this.ctx = new AudioContextClass();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.volVal, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);
  }

  setVolume(vol: number) {
    this.volVal = vol;
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setValueAtTime(vol, this.ctx.currentTime);
    }
  }

  stop() {
    this.isPlaying = false;
    this.activeNodes.forEach(node => {
      try { node.stop(); } catch(e) {}
    });
    this.activeNodes = [];
  }

  play(type: string) {
    this.stop();
    this.init();
    if (!this.ctx || !this.masterGain) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    this.isPlaying = true;
    this.currentType = type;

    if (type === 'rain') {
      this.startRain();
    } else if (type === 'forest') {
      this.startForest();
    } else if (type === 'cafe') {
      this.startCafe();
    } else if (type === 'lofi') {
      this.startLofi();
    }
  }

  private createNoiseBuffer() {
    if (!this.ctx) return null;
    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    return noiseBuffer;
  }

  private startRain() {
    if (!this.ctx || !this.masterGain) return;
    const ctx = this.ctx;
    
    const buffer = this.createNoiseBuffer();
    if (!buffer) return;

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = buffer;
    noiseSource.loop = true;

    const lpFilter = ctx.createBiquadFilter();
    lpFilter.type = 'lowpass';
    lpFilter.frequency.setValueAtTime(500, ctx.currentTime);

    const hpFilter = ctx.createBiquadFilter();
    hpFilter.type = 'highpass';
    hpFilter.frequency.setValueAtTime(80, ctx.currentTime);

    noiseSource.connect(lpFilter);
    lpFilter.connect(hpFilter);
    hpFilter.connect(this.masterGain);

    noiseSource.start();
    this.activeNodes.push({ stop: () => { noiseSource.stop(); } });

    let isStopped = false;
    const makeDroplet = () => {
      if (isStopped || !this.isPlaying || ctx.state === 'suspended') return;
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(100 + Math.random() * 200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.1);

      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.08 * Math.random(), ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start();
      osc.stop(ctx.currentTime + 0.12);

      setTimeout(makeDroplet, 150 + Math.random() * 400);
    };
    makeDroplet();
    this.activeNodes.push({ stop: () => { isStopped = true; } });
  }

  private startForest() {
    if (!this.ctx || !this.masterGain) return;
    const ctx = this.ctx;

    const buffer = this.createNoiseBuffer();
    if (!buffer) return;

    const windSource = ctx.createBufferSource();
    windSource.buffer = buffer;
    windSource.loop = true;

    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.setValueAtTime(300, ctx.currentTime);
    windFilter.Q.setValueAtTime(1.5, ctx.currentTime);

    const windGain = ctx.createGain();
    windGain.gain.setValueAtTime(0.12, ctx.currentTime);

    windSource.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(this.masterGain);

    windSource.start();
    this.activeNodes.push({ stop: () => windSource.stop() });

    let isStopped = false;
    const modulateWind = () => {
      if (isStopped || !this.isPlaying) return;
      const targetFreq = 200 + Math.random() * 300;
      windFilter.frequency.linearRampToValueAtTime(targetFreq, ctx.currentTime + 3 + Math.random() * 4);
      setTimeout(modulateWind, 4000);
    };
    modulateWind();

    const chirp = () => {
      if (isStopped || !this.isPlaying || ctx.state === 'suspended') return;

      const now = ctx.currentTime;
      const duration = 0.15 + Math.random() * 0.15;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(2500 + Math.random() * 1500, now);
      osc.frequency.exponentialRampToValueAtTime(4000 + Math.random() * 1000, now + duration);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.04 + Math.random() * 0.04, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start();
      osc.stop(now + duration);

      const nextDelay = Math.random() > 0.7 ? 150 : (2000 + Math.random() * 4000);
      setTimeout(chirp, nextDelay);
    };
    chirp();
    this.activeNodes.push({ stop: () => { isStopped = true; } });
  }

  private startCafe() {
    if (!this.ctx || !this.masterGain) return;
    const ctx = this.ctx;

    const buffer = this.createNoiseBuffer();
    if (!buffer) return;

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(150, ctx.currentTime);

    const murmurGain = ctx.createGain();
    murmurGain.gain.setValueAtTime(0.25, ctx.currentTime);

    source.connect(lp);
    lp.connect(murmurGain);
    murmurGain.connect(this.masterGain);

    source.start();
    this.activeNodes.push({ stop: () => source.stop() });

    const modOsc = ctx.createOscillator();
    const modGain = ctx.createGain();
    modOsc.type = 'sine';
    modOsc.frequency.setValueAtTime(0.1, ctx.currentTime);
    modGain.gain.setValueAtTime(30, ctx.currentTime);
    modOsc.connect(modGain);
    modGain.connect(lp.frequency);
    modOsc.start();
    this.activeNodes.push({ stop: () => modOsc.stop() });

    let isStopped = false;
    const clink = () => {
      if (isStopped || !this.isPlaying || ctx.state === 'suspended') return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(3000 + Math.random() * 1500, now);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.015 * Math.random(), now + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start();
      osc.stop(now + 0.16);

      setTimeout(clink, 4000 + Math.random() * 8000);
    };
    clink();
    this.activeNodes.push({ stop: () => { isStopped = true; } });
  }

  private startLofi() {
    if (!this.ctx || !this.masterGain) return;
    const ctx = this.ctx;

    const chords = [
      [130.81, 164.81, 196.00, 246.94],
      [174.61, 220.00, 261.63, 329.63]
    ];

    let chordIdx = 0;
    let isStopped = false;
    let activeChords: OscillatorNode[] = [];

    const playChord = () => {
      if (isStopped || !this.isPlaying || ctx.state === 'suspended') return;

      activeChords.forEach(osc => {
        try { osc.stop(ctx.currentTime + 1.5); } catch(e) {}
      });
      activeChords = [];

      const currentNotes = chords[chordIdx];
      const now = ctx.currentTime;

      currentNotes.forEach(freq => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);

        const vibrato = ctx.createOscillator();
        const vibratoGain = ctx.createGain();
        vibrato.frequency.setValueAtTime(4 + Math.random() * 2, now);
        vibratoGain.gain.setValueAtTime(1.5, now);
        vibrato.connect(vibratoGain);
        vibratoGain.connect(osc.frequency);
        vibrato.start();
        activeChords.push(vibrato);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(400, now);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.04, now + 1.5);
        gain.gain.setValueAtTime(0.04, now + 6.5);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 8.0);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain!);

        osc.start();
        osc.stop(now + 8.0);
        activeChords.push(osc);
      });

      chordIdx = (chordIdx + 1) % chords.length;
      setTimeout(playChord, 7000);
    };

    const vinylBuffer = this.createNoiseBuffer();
    if (vinylBuffer) {
      const vinylSource = ctx.createBufferSource();
      vinylSource.buffer = vinylBuffer;
      vinylSource.loop = true;

      const vinylFilter = ctx.createBiquadFilter();
      vinylFilter.type = 'bandpass';
      vinylFilter.frequency.setValueAtTime(1000, ctx.currentTime);
      vinylFilter.Q.setValueAtTime(3.0, ctx.currentTime);

      const vinylGain = ctx.createGain();
      vinylGain.gain.setValueAtTime(0.015, ctx.currentTime);

      vinylSource.connect(vinylFilter);
      vinylFilter.connect(vinylGain);
      vinylGain.connect(this.masterGain);

      vinylSource.start();
      this.activeNodes.push({ stop: () => vinylSource.stop() });
    }

    playChord();
    this.activeNodes.push({ stop: () => { isStopped = true; } });
  }
}

export default function FocusMode({ tasks, onAddSession, onUpdateTask, onActiveChange }: FocusModeProps) {
  const [selectedType, setSelectedType] = useState<'pomodoro' | 'deep' | 'sprint' | 'custom'>('pomodoro');
  const [customTime, setCustomTime] = useState(45);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [totalDuration, setTotalDuration] = useState(25 * 60);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  
  // Stats trackers
  const [distractions, setDistractions] = useState(0);
  const [subtasksCompleted, setSubtasksCompleted] = useState(0);

  // Soundscape state
  const [selectedSound, setSelectedSound] = useState<string>('rain');
  const [isPlayingSound, setIsPlayingSound] = useState(false);
  const [volume, setVolume] = useState(0.5);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const synthRef = useRef<SoundscapeSynth | null>(null);

  // Initialize time when type changes
  useEffect(() => {
    if (!isActive) {
      let minutes = 25;
      if (selectedType === 'deep') minutes = 90;
      else if (selectedType === 'sprint') minutes = 15;
      else if (selectedType === 'custom') minutes = customTime;
      
      setTimeLeft(minutes * 60);
      setTotalDuration(minutes * 60);
    }
  }, [selectedType, customTime, isActive]);

  // Audio synthesizer effects
  useEffect(() => {
    if (!synthRef.current) {
      synthRef.current = new SoundscapeSynth();
    }
    synthRef.current.setVolume(volume);

    if (isPlayingSound) {
      synthRef.current.play(selectedSound);
    } else {
      synthRef.current.stop();
    }

    return () => {
      // Keep playing until unmount or state change
    };
  }, [isPlayingSound, selectedSound]);

  // Handle volume changes
  useEffect(() => {
    if (synthRef.current) {
      synthRef.current.setVolume(volume);
    }
  }, [volume]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (synthRef.current) {
        synthRef.current.stop();
      }
    };
  }, []);

  // Timer Tick
  useEffect(() => {
    if (isActive && !isPaused) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleSessionComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, isPaused]);

  const handleStart = () => {
    setIsActive(true);
    setIsPaused(false);
    setDistractions(0);
    setSubtasksCompleted(0);
  };

  const handlePause = () => {
    setIsPaused(!isPaused);
  };

  const handleReset = () => {
    setIsActive(false);
    setIsPaused(false);
    let minutes = 25;
    if (selectedType === 'deep') minutes = 90;
    else if (selectedType === 'sprint') minutes = 15;
    else if (selectedType === 'custom') minutes = customTime;
    setTimeLeft(minutes * 60);
    setDistractions(0);
    setSubtasksCompleted(0);
  };

  const handleSessionComplete = () => {
    setIsActive(false);
    setIsPaused(false);
    
    // Save focus session log
    const minutesFocused = Math.round((totalDuration - timeLeft) / 60) || 1;
    const task = tasks.find(t => t.id === selectedTaskId);

    onAddSession({
      taskId: selectedTaskId || undefined,
      taskTitle: task?.title || undefined,
      durationMinutes: minutesFocused,
      type: selectedType,
      completedAt: new Date().toISOString(),
      distractionsCount: distractions,
      subtasksCompleted: subtasksCompleted
    });

    // Mark task as in_progress if not completed yet
    if (selectedTaskId && task && task.status === 'todo') {
      onUpdateTask(selectedTaskId, { status: 'in_progress' });
    }

    alert('🎉 Focus Session Complete! Awesome job holding that attention span.');
    handleReset();
  };

  const handleTrackDistraction = () => {
    setDistractions((prev) => prev + 1);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const selectedTask = tasks.find((t) => t.id === selectedTaskId);
  
  useEffect(() => {
    if (onActiveChange) {
      onActiveChange(isActive, selectedTask?.title);
    }
  }, [isActive, selectedTask, onActiveChange]);
  
  // Calculate SVG Circle Progress
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = isActive 
    ? circumference - (timeLeft / totalDuration) * circumference 
    : 0;

  const taskDropdownOptions = [
    { value: '', label: '-- No Specific Task --' },
    ...tasks.filter(t => t.status !== 'completed').map((t) => ({
      value: t.id,
      label: `[${t.priority.toUpperCase()}] ${t.title}`,
      bulletColor: t.priority === 'critical' ? 'bg-rose-500' : t.priority === 'high' ? 'bg-amber-500' : t.priority === 'medium' ? 'bg-indigo-500' : 'bg-emerald-500'
    }))
  ];

  const soundDropdownOptions = SOUNDSCAPES.map((sound) => {
    const iconMap: Record<string, string> = {
      rain: '🌧️',
      forest: '🌲',
      cafe: '☕',
      lofi: '🎵',
    };
    return {
      value: sound.id,
      label: sound.label,
      icon: iconMap[sound.id] || '🎵',
    };
  });

  return (
    <div className="space-y-6">

      <div>
        <h1 className="text-2xl font-bold font-display tracking-tight text-theme-heading flex items-center gap-2">
          ⏱ Deep Focus Studio
        </h1>
        <p className="text-theme-subtle text-xs mt-0.5">Engage immersion mode, lock onto a key task, and sink into distraction-free flow.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Control Board */}
        <div className="lg:col-span-1 space-y-4">
          <GlassCard className="space-y-4">
            <h3 className="font-semibold text-theme-heading font-display text-sm">Select Session Type</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'pomodoro', label: '⏱ Pomodoro', time: '25 min' },
                { id: 'deep', label: '🧠 Deep Work', time: '90 min' },
                { id: 'sprint', label: '⚡ Sprint', time: '15 min' },
                { id: 'custom', label: '⚙️ Custom', time: `${customTime} min` },
              ].map((type) => (
                <button
                  key={type.id}
                  disabled={isActive}
                  onClick={() => setSelectedType(type.id as any)}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all duration-200 disabled:opacity-50 ${
                    selectedType === type.id
                      ? 'bg-indigo-50 dark:bg-indigo-600/20 border-indigo-500 text-indigo-600 dark:text-theme-heading'
                      : 'bg-slate-50 dark:bg-slate-950/20 border-slate-200 dark:border-white/5 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-white/10'
                  }`}
                >
                  <span className="block font-semibold text-xs text-slate-800 dark:text-theme-heading">{type.label}</span>
                  <span className="block text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{type.time}</span>
                </button>
              ))}
            </div>

            {selectedType === 'custom' && (
              <div className="space-y-1.5 pt-2 border-t border-white/5">
                <label className="text-xs text-slate-400 font-medium flex justify-between">
                  <span>Custom Duration</span>
                  <span className="text-indigo-400 font-semibold">{customTime}m</span>
                </label>
                <input
                  type="range"
                  min={5}
                  max={120}
                  step={5}
                  value={customTime}
                  disabled={isActive}
                  onChange={(e) => setCustomTime(Number(e.target.value))}
                  className="w-full accent-indigo-500 bg-slate-950/40 rounded-lg cursor-pointer h-1.5"
                />
              </div>
            )}
          </GlassCard>

          <GlassCard className="space-y-4 relative focus-within:z-30 transition-all">
            <h3 className="font-semibold text-theme-heading font-display text-sm">Anchor Task</h3>
            <div className="space-y-2 flex flex-col">
              <label className="block text-xs text-slate-400 mb-1">Lock focus on a specific task:</label>
              <CustomDropdown
                value={selectedTaskId}
                disabled={isActive}
                onChange={setSelectedTaskId}
                options={taskDropdownOptions}
                className="w-full"
              />
            </div>
          </GlassCard>

          <GlassCard className="space-y-4 relative focus-within:z-30 transition-all">
            <h3 className="font-semibold text-theme-heading font-display text-sm">Flow Soundscape</h3>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <CustomDropdown
                  value={selectedSound}
                  onChange={setSelectedSound}
                  options={soundDropdownOptions}
                  className="flex-grow"
                />

                <button
                  onClick={() => setIsPlayingSound(!isPlayingSound)}
                  className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all cursor-pointer shrink-0"
                >
                  {isPlayingSound ? <Volume2 className="w-4 h-4 animate-pulse" /> : <VolumeX className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <VolumeX className="w-3.5 h-3.5 text-slate-500" />
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.1}
                  value={volume}
                  onChange={(e) => {
                    const newVol = Number(e.target.value);
                    setVolume(newVol);
                  }}
                  className="w-full accent-indigo-500 bg-slate-200 dark:bg-slate-950/40 rounded-lg cursor-pointer h-1"
                />
                <Volume2 className="w-3.5 h-3.5 text-slate-500" />
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Center Countdown Screen */}
        <div className="lg:col-span-2 flex flex-col justify-between gap-6">
          <GlassCard className="flex flex-col items-center justify-center p-8 space-y-6 text-center relative overflow-hidden flex-grow">
            {/* Visual gradient backdrop */}
            <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none"></div>

            {/* Timer visual circle */}
            <div className="relative w-56 h-56 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="112"
                  cy="112"
                  r={radius}
                  className="stroke-slate-200 dark:stroke-slate-950/40 fill-none"
                  strokeWidth="8"
                />
                <circle
                  cx="112"
                  cy="112"
                  r={radius}
                  className="stroke-indigo-500 fill-none transition-all duration-300"
                  strokeWidth="8"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                />
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-extrabold text-theme-heading font-mono tracking-tight">
                  {formatTime(timeLeft)}
                </span>
                <span className="text-[10px] uppercase font-mono tracking-widest text-theme-subtle mt-1">
                  {isActive ? (isPaused ? 'Paused' : 'In Session') : 'Studio Ready'}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-bold font-display text-theme-heading text-base">
                {selectedTask ? selectedTask.title : 'General Workspace focus'}
              </h3>
              <p className="text-xs text-theme-subtle max-w-sm">
                {selectedTask && selectedTask.description 
                  ? selectedTask.description 
                  : 'Maintain visual focus, ignore micro-notifications, and remain consistent.'}
              </p>
            </div>

            {/* Timer Actions */}
            <div className="flex gap-4 items-center">
              {!isActive ? (
                <button
                  onClick={handleStart}
                  className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold rounded-xl text-sm transition-all shadow-lg shadow-indigo-600/25 flex items-center gap-1.5 cursor-pointer"
                >
                  <Play className="w-4 h-4" /> Start Studio
                </button>
              ) : (
                <>
                  <button
                    onClick={handlePause}
                    className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-200 font-semibold rounded-xl text-sm transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                    {isPaused ? 'Resume' : 'Pause'}
                  </button>
                  <button
                    onClick={handleReset}
                    className="p-2.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 hover:text-rose-300 rounded-xl transition-all cursor-pointer"
                    title="Stop Session"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>

            {/* Live stats log during session */}
            {isActive && (
              <div className="w-full grid grid-cols-2 gap-3 pt-6 border-t border-slate-200 dark:border-white/5">
                <div className="p-3 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-white/5 text-left relative overflow-hidden group">
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                    <span className="text-[10px] font-semibold">DISTRACTION WARNINGS</span>
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  </div>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-xl font-bold text-theme-heading font-mono">{distractions}</span>
                    <button 
                      onClick={handleTrackDistraction}
                      className="ml-auto text-[10px] text-indigo-600 dark:text-indigo-400 hover:text-indigo-750 dark:hover:text-indigo-300 underline font-semibold cursor-pointer"
                    >
                      Log Distraction
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-white/5 text-left relative overflow-hidden group">
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                    <span className="text-[10px] font-semibold">SUBTASKS COMPLETED</span>
                    <Sparkles className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                  </div>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-xl font-bold text-theme-heading font-mono">{subtasksCompleted}</span>
                    <button 
                      onClick={() => setSubtasksCompleted((prev) => prev + 1)}
                      className="ml-auto text-[10px] text-emerald-600 dark:text-emerald-400 hover:text-emerald-550 dark:hover:text-emerald-300 underline font-semibold cursor-pointer"
                    >
                      Log Subtask
                    </button>
                  </div>
                </div>
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
