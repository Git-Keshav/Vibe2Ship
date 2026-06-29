import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Clock, Timer, Palette, Maximize2, Minimize2, Sparkles, Play, Pause, RotateCcw, Volume2, VolumeX, ArrowLeft
} from 'lucide-react';

interface FlipClockProps {
  onClose: () => void;
}

type ClockMode = 'clock' | 'pomodoro' | 'stopwatch';
type ClockTheme = 'black' | 'light' | 'cyberpunk' | 'amber' | 'forest';

export default function FlipClock({ onClose }: FlipClockProps) {
  const [mode, setMode] = useState<ClockMode>('clock');
  const [theme, setTheme] = useState<ClockTheme>('black');
  const [is24h, setIs24h] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Time state for Clock Mode
  const [time, setTime] = useState(new Date());

  // Pomodoro states
  const [pomoMinutes, setPomoMinutes] = useState(25);
  const [pomoSeconds, setPomoSeconds] = useState(0);
  const [pomoRunning, setPomoRunning] = useState(false);
  const [pomoTotalDuration, setPomoTotalDuration] = useState(25 * 60); // 25 mins

  // Stopwatch states
  const [swMinutes, setSwMinutes] = useState(0);
  const [swSeconds, setSwSeconds] = useState(0);
  const [swRunning, setSwRunning] = useState(false);

  // Audio refs for ticking/complete sounds
  const tickAudioRef = useRef<HTMLAudioElement | null>(null);
  const alarmAudioRef = useRef<HTMLAudioElement | null>(null);

  // Update real-time clock
  useEffect(() => {
    if (mode !== 'clock') return;
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, [mode]);

  // Pomodoro Timer Logic
  useEffect(() => {
    if (mode !== 'pomodoro' || !pomoRunning) return;

    const interval = setInterval(() => {
      if (pomoSeconds > 0) {
        setPomoSeconds(prev => prev - 1);
        if (soundEnabled) playTickSound();
      } else if (pomoMinutes > 0) {
        setPomoMinutes(prev => prev - 1);
        setPomoSeconds(59);
        if (soundEnabled) playTickSound();
      } else {
        // Complete!
        setPomoRunning(false);
        playAlarmSound();
        alert("Pomodoro session completed! Take a break.");
        // Reset to 25 mins
        setPomoMinutes(25);
        setPomoSeconds(0);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [mode, pomoRunning, pomoMinutes, pomoSeconds, soundEnabled]);

  // Stopwatch Timer Logic
  useEffect(() => {
    if (mode !== 'stopwatch' || !swRunning) return;

    const interval = setInterval(() => {
      if (swSeconds < 59) {
        setSwSeconds(prev => prev + 1);
      } else {
        setSwMinutes(prev => prev + 1);
        setSwSeconds(0);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [mode, swRunning, swMinutes, swSeconds]);

  // Monitor Fullscreen status
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.warn("Fullscreen toggle failed:", err);
    }
  };

  // Sound play functions
  const playTickSound = () => {
    try {
      if (!tickAudioRef.current) {
        tickAudioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-84.wav');
        tickAudioRef.current.volume = 0.15;
      }
      tickAudioRef.current.currentTime = 0;
      tickAudioRef.current.play().catch(() => {});
    } catch (e) {}
  };

  const playAlarmSound = () => {
    try {
      if (!alarmAudioRef.current) {
        alarmAudioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/911/911-84.wav');
        alarmAudioRef.current.volume = 0.4;
      }
      alarmAudioRef.current.currentTime = 0;
      alarmAudioRef.current.play().catch(() => {});
    } catch (e) {}
  };

  // Helper to get formatted string digits
  const getClockDigits = () => {
    let hours = time.getHours();
    let ampm = '';

    if (!is24h) {
      ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12; // hour '0' should be '12'
    }

    const hoursStr = String(hours); // In 12h mode, single digit hours don't need leading zero
    const minutesStr = String(time.getMinutes()).padStart(2, '0');

    return { hoursStr, minutesStr, ampm };
  };

  const getPomoDigits = () => {
    const hoursStr = String(pomoMinutes).padStart(2, '0');
    const minutesStr = String(pomoSeconds).padStart(2, '0');
    return { hoursStr, minutesStr };
  };

  const getStopwatchDigits = () => {
    const hoursStr = String(swMinutes).padStart(2, '0');
    const minutesStr = String(swSeconds).padStart(2, '0');
    return { hoursStr, minutesStr };
  };

  const { hoursStr, minutesStr, ampm } =
    mode === 'clock'
      ? getClockDigits()
      : mode === 'pomodoro'
      ? { ...getPomoDigits(), ampm: '' }
      : { ...getStopwatchDigits(), ampm: '' };

  // Theme settings mapping
  const themeClasses = {
    black: {
      bg: 'bg-black text-white',
      cardBg: 'bg-[#151515] border-neutral-900 shadow-neutral-950/80',
      digitText: 'text-white',
      splitLine: 'bg-[#0a0a0a]',
      controlsBg: 'bg-[#151515]/80 border-neutral-800',
      accentText: 'text-emerald-400',
      inactiveText: 'text-neutral-500 hover:text-neutral-300',
    },
    light: {
      bg: 'bg-[#f7f5f0] text-neutral-900',
      cardBg: 'bg-white border-neutral-200/60 shadow-neutral-300/50',
      digitText: 'text-neutral-900',
      splitLine: 'bg-[#ece9df]',
      controlsBg: 'bg-white/90 border-neutral-200/80',
      accentText: 'text-emerald-600',
      inactiveText: 'text-neutral-400 hover:text-neutral-600',
    },
    cyberpunk: {
      bg: 'bg-[#0c001a] text-pink-500',
      cardBg: 'bg-[#120024] border-pink-500/20 shadow-pink-950/40 shadow-xl',
      digitText: 'text-transparent bg-clip-text bg-gradient-to-b from-pink-500 via-fuchsia-400 to-indigo-500 drop-shadow-[0_0_15px_rgba(236,72,153,0.3)]',
      splitLine: 'bg-[#080012]',
      controlsBg: 'bg-[#120024]/80 border-pink-500/20 backdrop-blur-md',
      accentText: 'text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]',
      inactiveText: 'text-indigo-400 hover:text-pink-400',
    },
    amber: {
      bg: 'bg-[#0a0600] text-amber-500',
      cardBg: 'bg-[#140c00] border-amber-950/50 shadow-amber-950/60',
      digitText: 'text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]',
      splitLine: 'bg-[#080400]',
      controlsBg: 'bg-[#140c00]/80 border-amber-950/50',
      accentText: 'text-amber-400',
      inactiveText: 'text-amber-900 hover:text-amber-600',
    },
    forest: {
      bg: 'bg-[#121a15] text-[#e3ece7]',
      cardBg: 'bg-[#1b2620] border-[#2c3d33]/50 shadow-emerald-950/60',
      digitText: 'text-[#e3ece7]',
      splitLine: 'bg-[#0e1411]',
      controlsBg: 'bg-[#1b2620]/85 border-[#2c3d33]/50',
      accentText: 'text-emerald-400',
      inactiveText: 'text-emerald-800 hover:text-emerald-500',
    }
  };

  const activeTheme = themeClasses[theme];

  // Helper component for single flip card block
  const FlipCard = ({ value, label }: { value: string; label?: string }) => {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className={`relative ${activeTheme.cardBg} border rounded-[2rem] md:rounded-[2.5rem] w-[42vw] h-[42vw] max-w-[280px] max-h-[280px] md:w-[320px] md:h-[320px] flex items-center justify-center shadow-2xl overflow-hidden transition-all duration-300`}>
          {/* Hour AM/PM Indicator embedded in left card */}
          {label === 'hour' && ampm && (
            <span className="absolute top-4 left-6 md:top-6 md:left-8 text-xs md:text-sm font-bold tracking-widest font-mono text-neutral-500/80 uppercase">
              {ampm}
            </span>
          )}

          {/* Large Digit rendering */}
          <span className={`font-sans font-black text-[18vw] md:text-[11rem] leading-none select-none tracking-tighter ${activeTheme.digitText}`}>
            {value}
          </span>

          {/* Central physical split line overlay with 3D shadow style */}
          <div className={`absolute top-[49.5%] left-0 w-full h-[2px] ${activeTheme.splitLine} z-10`} />
          <div className="absolute top-[50%] left-0 w-full h-[1px] bg-white/5 z-10" />
        </div>
      </div>
    );
  };

  const handleCycleTheme = () => {
    const themes: ClockTheme[] = ['black', 'light', 'cyberpunk', 'amber', 'forest'];
    const nextIdx = (themes.indexOf(theme) + 1) % themes.length;
    setTheme(themes[nextIdx]);
  };

  return (
    <div className={`fixed inset-0 z-[100] ${activeTheme.bg} flex flex-col items-center justify-center p-6 md:p-12 transition-colors duration-500 select-none overflow-hidden`}>
      {/* Background Ambience Sparks for Cyberpunk */}
      {theme === 'cyberpunk' && (
        <>
          <div className="absolute top-1/4 left-1/4 w-[350px] h-[350px] bg-pink-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-[150px] pointer-events-none animate-pulse" style={{ animationDelay: '1.5s' }}></div >
        </>
      )}

      {/* Mode Switcher Header */}
      <div className="absolute top-6 left-6 md:top-8 md:left-8 flex items-center gap-3 z-50">
        <button
          onClick={onClose}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold backdrop-blur-md transition-all cursor-pointer ${
            theme === 'light'
              ? 'bg-white/80 border border-neutral-200/80 hover:bg-neutral-100 text-neutral-800'
              : 'bg-white/5 border border-white/10 hover:bg-white/10 text-white'
          }`}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Go to App</span>
        </button>
      </div>

      {/* Mode Picker (Clock, Pomodoro, Stopwatch) */}
      <div className="absolute top-6 md:top-8 flex items-center gap-1.5 p-1 bg-neutral-900/40 dark:bg-black/40 backdrop-blur-md border border-neutral-800/50 dark:border-white/5 rounded-full text-xs z-50">
        {[
          { id: 'clock', icon: Clock, label: 'Clock' },
          { id: 'pomodoro', icon: Timer, label: 'Pomodoro' },
          { id: 'stopwatch', icon: Sparkles, label: 'Stopwatch' }
        ].map((item) => {
          const active = mode === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => {
                setMode(item.id as ClockMode);
                // Reset states on change
                setPomoRunning(false);
                swRunning && setSwRunning(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium transition-all cursor-pointer ${
                active
                  ? 'bg-emerald-600 text-white shadow-md font-semibold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Split Cards Container */}
      <div className="flex items-center justify-center gap-4 md:gap-8 max-w-full z-10">
        {/* Hour Card */}
        <FlipCard value={hoursStr} label="hour" />

        {/* Separator Dots (physical 3D dots) */}
        <div className="flex flex-col gap-6 md:gap-8 justify-center items-center py-2 shrink-0">
          <div className={`w-3.5 h-3.5 md:w-5 md:h-5 rounded-full ${theme === 'light' ? 'bg-neutral-400' : 'bg-neutral-700'} shadow-inner animate-pulse`} />
          <div className={`w-3.5 h-3.5 md:w-5 md:h-5 rounded-full ${theme === 'light' ? 'bg-neutral-400' : 'bg-neutral-700'} shadow-inner animate-pulse`} />
        </div>

        {/* Minute Card */}
        <FlipCard value={minutesStr} label="minute" />
      </div>

      {/* Extra Interactive Timer Controls (For Pomodoro and Stopwatch) */}
      <AnimatePresence>
        {(mode === 'pomodoro' || mode === 'stopwatch') && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="mt-12 flex items-center gap-4 z-20"
          >
            {mode === 'pomodoro' && (
              <>
                <button
                  onClick={() => {
                    setPomoRunning(!pomoRunning);
                    if (soundEnabled) playTickSound();
                  }}
                  className="p-4 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-lg hover:scale-105 cursor-pointer"
                  title={pomoRunning ? 'Pause Session' : 'Start Session'}
                >
                  {pomoRunning ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 fill-white" />}
                </button>
                <button
                  onClick={() => {
                    setPomoRunning(false);
                    setPomoMinutes(25);
                    setPomoSeconds(0);
                  }}
                  className="p-4 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-white transition-all hover:scale-105 cursor-pointer"
                  title="Reset Timer"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
              </>
            )}

            {mode === 'stopwatch' && (
              <>
                <button
                  onClick={() => setSwRunning(!swRunning)}
                  className="p-4 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-lg hover:scale-105 cursor-pointer"
                  title={swRunning ? 'Pause Stopwatch' : 'Start Stopwatch'}
                >
                  {swRunning ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 fill-white" />}
                </button>
                <button
                  onClick={() => {
                    setSwRunning(false);
                    setSwMinutes(0);
                    setSwSeconds(0);
                  }}
                  className="p-4 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-white transition-all hover:scale-105 cursor-pointer"
                  title="Reset Stopwatch"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Bottom Toolbar */}
      <div className={`absolute bottom-6 md:bottom-8 right-6 md:right-8 flex items-center gap-3.5 px-4 py-2 rounded-full border shadow-xl transition-colors duration-300 z-50 ${activeTheme.controlsBg}`}>
        {/* Toggle format (Only in Clock mode) */}
        {mode === 'clock' && (
          <button
            onClick={() => setIs24h(!is24h)}
            className="text-xs font-black tracking-widest uppercase font-mono cursor-pointer hover:opacity-80 transition-all"
            title="Toggle 12h/24h Format"
          >
            {is24h ? '24h' : '12h'}
          </button>
        )}

        {/* Vertical divider */}
        {mode === 'clock' && <div className="w-[1px] h-4 bg-neutral-700/60" />}

        {/* Toggle ticking sound (For Pomodoro) */}
        {mode === 'pomodoro' && (
          <>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-1 cursor-pointer transition-all hover:opacity-80"
              title={soundEnabled ? 'Mute ticking' : 'Unmute ticking'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-500" /> : <VolumeX className="w-4 h-4 text-neutral-500" />}
            </button>
            <div className="w-[1px] h-4 bg-neutral-700/60" />
          </>
        )}

        {/* Cycle Theme */}
        <button
          onClick={handleCycleTheme}
          className="p-1 cursor-pointer transition-all hover:scale-110"
          title="Cycle Clock Colors"
        >
          <Palette className="w-4 h-4" />
        </button>

        {/* Fullscreen API Toggle */}
        <button
          onClick={toggleFullscreen}
          className="p-1 cursor-pointer transition-all hover:scale-110"
          title="Toggle Fullscreen View"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Subtle indicator label */}
      <div className="absolute bottom-6 md:bottom-8 left-6 md:left-8 z-50 hidden md:block">
        <p className="text-[10px] font-mono tracking-widest text-neutral-500 uppercase font-semibold">
          {mode === 'clock' ? 'LIVE FOCUS COMPANION' : mode === 'pomodoro' ? 'DEEP WORK CYCLE' : 'SPEED LAP COUNTER'}
        </p>
      </div>
    </div>
  );
}
