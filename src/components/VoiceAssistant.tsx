import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, Sparkles, AlertCircle, Check, X, Volume2, VolumeX, ArrowRight, Keyboard } from 'lucide-react';
import { Task, Habit, Goal } from '../types';
import { parseLocalVoiceCommand } from '../lib/localIntelligence';

interface VoiceAssistantProps {
  onAddTask: (task: Partial<Task>) => void;
  onLaunchFocus: (minutes: number, type: 'pomodoro' | 'deep' | 'sprint' | 'custom') => void;
  onAddHabit: (habit: Partial<Habit>) => void;
  onAddGoal: (goal: Partial<Goal>) => void;
}

type AssistantStatus = 'idle' | 'recording' | 'processing' | 'feedback' | 'error';

export default function VoiceAssistant({ onAddTask, onLaunchFocus, onAddHabit, onAddGoal }: VoiceAssistantProps) {
  const [status, setStatus] = useState<AssistantStatus>('idle');
  const [command, setCommand] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [aiFeedback, setAiFeedback] = useState('');
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualText, setManualText] = useState('');

  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Pre-load synthesis voices
  // useEffect(() => {
  //   if ('speechSynthesis' in window) {
  //     window.speechSynthesis.getVoices();
  //   }
  //   return () => {
  //     if (timerRef.current) clearTimeout(timerRef.current);
  //   };
  // }, []);

  // Close manual input popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (showManualInput && containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowManualInput(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showManualInput]);

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      // Remove emojis
      const clean = text.replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD00-\uDFFF]/g, "");
      const utterance = new SpeechSynthesisUtterance(clean);
      
      const setVoiceAndSpeak = () => {
        const voices = window.speechSynthesis.getVoices();
        const englishVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Premium'))) 
          || voices.find(v => v.lang.startsWith('en-US')) 
          || voices.find(v => v.lang.startsWith('en'));
        if (englishVoice) {
          utterance.voice = englishVoice;
        }
        utterance.rate = 0.95; // normal paced and clear voice
        utterance.pitch = 1.0; // standard clear pitch
        window.speechSynthesis.speak(utterance);
      };

      if (window.speechSynthesis.getVoices().length === 0) {
        window.speechSynthesis.onvoiceschanged = () => {
          setVoiceAndSpeak();
          window.speechSynthesis.onvoiceschanged = null;
        };
      } else {
        setVoiceAndSpeak();
      }
    }
  };

  const startRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setPermissionError("Speech recognition is not supported in this browser.");
      setStatus('error');
      setShowManualInput(true); // Automatically show text prompt since mic/recognition is unsupported
      
      // Auto-close notification after 2 seconds
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setPermissionError(null);
        if (status === 'error') setStatus('idle');
      }, 2000);
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsRecording(true);
      setStatus('recording');
      setCommand('');
      setAiFeedback('');
      setPermissionError(null);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setCommand(transcript);
      handleVoiceExecute(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsRecording(false);
      setPermissionError("Microphone permission required.");
      setStatus('error');
      setShowManualInput(true); // Prompt manual entry when mic fails

      // Auto-close notification after 2 seconds
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setPermissionError(null);
        setStatus('idle');
      }, 2000);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    try {
      recognition.start();
    } catch (e) {
      setIsRecording(false);
      setStatus('idle');
    }
  };

  const handleVoiceRecording = () => {
    if (isRecording) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.error(e);
        }
      }
      setIsRecording(false);
      setStatus('idle');
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);
    setPermissionError(null);
    setAiFeedback('');
    setCommand('');

    // Ask for permission explicitly every time by forcing getUserMedia
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then((stream) => {
          // Stop track immediately to release resource, then start recognition
          stream.getTracks().forEach(track => track.stop());
          startRecognition();
        })
        .catch((err) => {
          console.error("Microphone permission error on getUserMedia:", err);
          setPermissionError("Microphone permission denied.");
          setStatus('error');
          setShowManualInput(true); // Open the manual text input popup immediately on refusal

          // Auto-close notification after 2 seconds
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => {
            setPermissionError(null);
            setStatus('idle');
          }, 2000);
        });
    } else {
      // Fallback
      startRecognition();
    }
  };

  const handleVoiceExecute = async (transcript: string) => {
    if (!transcript.trim()) {
      setStatus('idle');
      return;
    }

    setStatus('processing');

    let parsedResult: any = null;
    let feedback = '';

    if (!navigator.onLine) {
      const localResult = parseLocalVoiceCommand(transcript);
      feedback = localResult.feedback;
      parsedResult = { ...localResult, isLocal: true };
    } else {
      try {
        const res = await fetch('/api/ai/voice-command', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: transcript }),
        });
        if (res.ok) {
          const data = await res.json();
          feedback = data.feedback;
          parsedResult = data;
        } else {
          console.warn('Voice command server call failed, falling back to local engine.');
          const localResult = parseLocalVoiceCommand(transcript);
          feedback = localResult.feedback;
          parsedResult = { ...localResult, isLocal: true };
        }
      } catch (err) {
        console.warn('Voice command error, falling back to local intelligence:', err);
        const localResult = parseLocalVoiceCommand(transcript);
        feedback = localResult.feedback;
        parsedResult = { ...localResult, isLocal: true };
      }
    }

    if (parsedResult && parsedResult.type !== 'unknown') {
      const { type, data } = parsedResult;
      
      // Auto-commit immediately to database/state!
      if (type === 'task' && data) {
        onAddTask(data);
      } else if (type === 'focus' && data) {
        onLaunchFocus(data.durationMinutes || 25, data.focusType || 'pomodoro');
      } else if (type === 'habit' && data) {
        onAddHabit(data);
      } else if (type === 'goal' && data) {
        onAddGoal(data);
      }

      const speakableFeedback = feedback || `Added ${type} successfully!`;
      setAiFeedback(speakableFeedback);
      setStatus('feedback');

      // Convert response to speech
      if (!isMuted) {
        speakText(speakableFeedback);
      }

      // Automatically dismiss the success pill after 2 seconds
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setStatus('idle');
        setAiFeedback('');
        setCommand('');
      }, 2000);
    } else {
      // Handled but not understood
      const unknownFeedback = feedback || "Sorry, I couldn't understand that command. Please try again.";
      setAiFeedback(unknownFeedback);
      setStatus('feedback');

      if (!isMuted) {
        speakText(unknownFeedback);
      }

      // Automatically dismiss after 2 seconds
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setStatus('idle');
        setAiFeedback('');
        setCommand('');
      }, 2000);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualText.trim()) return;

    const textToProcess = manualText;
    setManualText('');
    setShowManualInput(false);
    setCommand(textToProcess);
    handleVoiceExecute(textToProcess);
  };

  return (
    <>
      {/* Sleek, Floating Minimal Micro-Feedback Bubble */}
      <AnimatePresence>
        {status !== 'idle' && (
          <div className="fixed bottom-20 right-6 md:bottom-24 md:right-8 z-50 w-[290px] sm:w-[320px] pointer-events-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="w-full p-4 rounded-2xl bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-color)] shadow-[var(--card-shadow)] backdrop-blur-2xl"
            >
              {/* Recording State */}
              {status === 'recording' && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600"></span>
                    </span>
                    <span className="text-xs font-bold font-display text-rose-600 dark:text-rose-400 uppercase tracking-wide">
                      Listening...
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                    Say: "Add task review code tomorrow" or "Start focus session"
                  </p>
                </div>
              )}

              {/* Processing State */}
              {status === 'processing' && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                    <Sparkles className="w-3.5 h-3.5 animate-spin" />
                    <span className="text-xs font-bold uppercase tracking-wide">Analyzing command...</span>
                  </div>
                  {command && (
                    <p className="text-[11px] text-[var(--text-color)] italic bg-slate-500/5 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 px-2.5 py-1.5 rounded-xl break-words">
                      "{command}"
                    </p>
                  )}
                </div>
              )}

              {/* Success / Feedback State */}
              {status === 'feedback' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-200/50 dark:border-white/5 pb-1.5">
                    <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                      <Check className="w-4 h-4 bg-emerald-500/10 p-0.5 rounded-full" />
                      <span className="text-xs font-bold uppercase tracking-wider font-mono">Executed</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setIsMuted(!isMuted)}
                        className="p-1 rounded-lg text-slate-400 hover:text-[var(--text-color)] hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                        title={isMuted ? "Unmute vocal synthesizer" : "Mute vocal synthesizer"}
                      >
                        {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
                      </button>
                      <button
                        onClick={() => {
                          setStatus('idle');
                          setAiFeedback('');
                        }}
                        className="p-1 rounded-lg text-slate-400 hover:text-[var(--text-color)] transition-colors cursor-pointer"
                        title="Close"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-[var(--text-color)] leading-relaxed italic">
                    "{aiFeedback}"
                  </p>
                </div>
              )}

              {/* Error State */}
              {status === 'error' && (
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <div className="space-y-1 flex-grow">
                    <span className="block text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase font-mono tracking-wide">
                      Microphone Error
                    </span>
                    <p className="text-[10px] text-[var(--text-color)] leading-snug">
                      {permissionError}
                    </p>
                  </div>
                  <button
                    onClick={() => setStatus('idle')}
                    className="p-1 rounded-lg text-slate-400 hover:text-[var(--text-color)] transition-colors cursor-pointer shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Manual Input Fallback Popover - Beautiful, high-contrast, works in light & dark modes */}
      <AnimatePresence>
        {showManualInput && (
          <div
            ref={containerRef}
            className="fixed bottom-20 right-6 md:bottom-24 md:right-8 z-50 w-[310px] sm:w-[350px] pointer-events-auto"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="p-4 rounded-2xl bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-color)] shadow-[var(--card-shadow)] backdrop-blur-2xl space-y-3"
            >
              <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-white/5 pb-1.5">
                <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                  <Keyboard className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider font-display">Type Goal or Task</span>
                </div>
                <button
                  onClick={() => setShowManualInput(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-[var(--text-color)] hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="p-2 bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/10 dark:border-rose-500/20 text-rose-700 dark:text-rose-300 rounded-xl text-[10px] leading-relaxed flex items-start gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                <span>Microphone access was denied. You can write your action manually below and the AI will organize it instantly.</span>
              </div>

              <form onSubmit={handleManualSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  placeholder="e.g. Add task study history tomorrow 3pm..."
                  className="flex-grow px-3 py-2 bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)] placeholder-slate-400 dark:placeholder-slate-500 rounded-xl focus:outline-none focus:border-indigo-500 text-xs"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!manualText.trim()}
                  className="px-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl flex items-center justify-center cursor-pointer transition-all shrink-0 shadow-sm shadow-indigo-600/10"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Primary Floating Action Trigger Button */}
      <button
        onClick={handleVoiceRecording}
        className={`fixed bottom-6 right-6 md:bottom-8 md:right-8 z-50 w-12 h-12 rounded-full text-white shadow-lg shadow-indigo-500/30 dark:shadow-indigo-500/20 hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center cursor-pointer border border-white/10 group ${
          isRecording
            ? 'bg-gradient-to-tr from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 shadow-rose-500/30'
            : 'bg-gradient-to-tr from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500'
        }`}
        title={isRecording ? "Stop Listening" : "Start Voice Commander"}
      >
        <div className={`absolute inset-0 rounded-full opacity-40 transition-all ${
          isRecording 
            ? 'bg-rose-500/30 animate-pulse scale-110' 
            : 'bg-indigo-500/30 animate-ping group-hover:animate-none'
        }`} />
        <Mic className={`w-5 h-5 relative z-10 transition-transform ${isRecording ? 'scale-110 animate-bounce' : 'group-hover:rotate-12'}`} />
      </button>
    </>
  );
}
