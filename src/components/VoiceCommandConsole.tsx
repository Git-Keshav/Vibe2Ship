import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, Sparkles, AlertCircle, Check, X, Volume2, VolumeX, ArrowRight, Keyboard, Calendar, CheckSquare, Clock, Target, ShieldCheck, Play, HelpCircle, History, MessageSquare, BookOpen, AlertTriangle
} from 'lucide-react';
import GlassCard from './GlassCard';
import { Task, Habit, Goal } from '../types';
import { parseLocalVoiceCommand } from '../lib/localIntelligence';

interface VoiceCommandConsoleProps {
  onAddTask: (task: Partial<Task>) => void;
  onLaunchFocus: (minutes: number, type: 'pomodoro' | 'deep' | 'sprint' | 'custom') => void;
  onAddHabit: (habit: Partial<Habit>) => void;
  onAddGoal: (goal: Partial<Goal>) => void;
  onTriggerNotification: (message: string, category: 'System' | 'Tasks' | 'Focus' | 'Habits' | 'Inbox') => void;
}

interface CommandHistoryItem {
  id: string;
  timestamp: string;
  transcript: string;
  type: string;
  feedback: string;
  success: boolean;
}

const SAMPLE_COMMANDS = [
  {
    category: 'Task Scheduling',
    icon: Calendar,
    color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    items: [
      { text: 'Add task prepare pitch deck tomorrow at 10 AM with high priority', desc: 'Schedules a specific high-priority task with deadline' },
      { text: 'Add task dentist appointment next Wednesday at 3 PM', desc: 'Schedules a future calendar event' },
      { text: 'Add task submit code review today at 6 PM', desc: 'Adds a critical task due today' }
    ]
  },
  {
    category: 'Focus Block Control',
    icon: Clock,
    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    items: [
      { text: 'Start a 45 minute deep focus session', desc: 'Launches a deep work pomodoro timer' },
      { text: 'Start a 15 minute sprint timer on mockups', desc: 'Initiates a short focus block' }
    ]
  },
  {
    category: 'Goals & Habits Logging',
    icon: Target,
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    items: [
      { text: 'Log reading habit today', desc: 'Finds or creates your reading habit and increments streak' },
      { text: 'Add goal to earn AWS Certification by October', desc: 'Registers a long-term goal with automatic milestone' }
    ]
  }
];

export default function VoiceCommandConsole({
  onAddTask,
  onLaunchFocus,
  onAddHabit,
  onAddGoal,
  onTriggerNotification
}: VoiceCommandConsoleProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState<'idle' | 'listening' | 'processing' | 'success' | 'error'>('idle');
  const [inputText, setInputText] = useState('');
  const [feedbackText, setFeedbackText] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  
  const [history, setHistory] = useState<CommandHistoryItem[]>(() => {
    const saved = localStorage.getItem('voice_command_history');
    return saved ? JSON.parse(saved) : [];
  });

  const recognitionRef = useRef<any>(null);
  const feedbackTimeoutRef = useRef<any>(null);

  useEffect(() => {
    localStorage.setItem('voice_command_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    };
  }, []);

  const speakText = (text: string) => {
    if (!ttsEnabled || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      // Remove emojis for cleaner TTS output
      const cleanText = text.replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD00-\uDFFF]/g, "");
      const utterance = new SpeechSynthesisUtterance(cleanText);
      
      const voices = window.speechSynthesis.getVoices();
      const englishVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Premium'))) 
        || voices.find(v => v.lang.startsWith('en-US')) 
        || voices.find(v => v.lang.startsWith('en'));
      
      if (englishVoice) {
        utterance.voice = englishVoice;
      }
      utterance.rate = 0.95;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('TTS error:', e);
    }
  };

  const executeCommand = async (commandText: string) => {
    if (!commandText.trim()) return;
    setStatus('processing');
    setErrorMessage(null);

    let parsedResult: any = null;
    let feedback = '';

    if (!navigator.onLine) {
      const localResult = parseLocalVoiceCommand(commandText);
      feedback = localResult.feedback;
      parsedResult = { ...localResult, isLocal: true };
    } else {
      try {
        const res = await fetch('/api/ai/voice-command', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: commandText }),
        });
        
        if (res.ok) {
          const data = await res.json();
          feedback = data.feedback;
          parsedResult = data;
        } else {
          const localResult = parseLocalVoiceCommand(commandText);
          feedback = localResult.feedback;
          parsedResult = { ...localResult, isLocal: true };
        }
      } catch (err) {
        console.warn('Voice parse server failed, falling back to local engine:', err);
        const localResult = parseLocalVoiceCommand(commandText);
        feedback = localResult.feedback;
        parsedResult = { ...localResult, isLocal: true };
      }
    }

    if (parsedResult && parsedResult.type !== 'unknown') {
      const { type, data } = parsedResult;
      
      // Auto-commit to appropriate data store
      if (type === 'task' && data) {
        onAddTask(data);
      } else if (type === 'focus' && data) {
        onLaunchFocus(data.durationMinutes || 25, data.focusType || 'pomodoro');
      } else if (type === 'habit' && data) {
        onAddHabit(data);
      } else if (type === 'goal' && data) {
        onAddGoal(data);
      }

      setFeedbackText(feedback);
      setStatus('success');
      speakText(feedback);
      onTriggerNotification(`Voice Executed: ${feedback}`, 'System');

      // Add to history
      const newHistoryItem: CommandHistoryItem = {
        id: 'hist-' + Date.now(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        transcript: commandText,
        type,
        feedback,
        success: true
      };
      setHistory(prev => [newHistoryItem, ...prev.slice(0, 19)]);
    } else {
      // Command understood but not mapped or unparseable
      const fallbackFeedback = feedback || "Sorry, I couldn't resolve that action. Please use one of the examples below as a semantic guideline.";
      setFeedbackText(fallbackFeedback);
      setStatus('success');
      speakText(fallbackFeedback);

      const newHistoryItem: CommandHistoryItem = {
        id: 'hist-' + Date.now(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        transcript: commandText,
        type: 'unknown',
        feedback: fallbackFeedback,
        success: false
      };
      setHistory(prev => [newHistoryItem, ...prev.slice(0, 19)]);
    }

    // Reset status after a delay
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    feedbackTimeoutRef.current = setTimeout(() => {
      setStatus('idle');
    }, 4000);
  };

  const handleStartRecording = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setErrorMessage("Speech recognition API is not supported on this browser.");
      setStatus('error');
      return;
    }

    const runRecognition = () => {
      const rec = new SpeechRecognition();
      recognitionRef.current = rec;
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onstart = () => {
        setIsRecording(true);
        setStatus('listening');
        setFeedbackText('');
        setErrorMessage(null);
      };

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        executeCommand(transcript);
      };

      rec.onerror = (event: any) => {
        console.error("Speech error:", event.error);
        setIsRecording(false);
        setErrorMessage(`Microphone error: ${event.error}. Please try typing the command instead.`);
        setStatus('error');
      };

      rec.onend = () => {
        setIsRecording(false);
      };

      try {
        rec.start();
      } catch (e) {
        setIsRecording(false);
        setStatus('idle');
      }
    };

    // Attempt explicit permission request
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then((stream) => {
          stream.getTracks().forEach(t => t.stop());
          runRecognition();
        })
        .catch((err) => {
          console.warn("Microphone access refused:", err);
          setErrorMessage("Microphone access was denied. You can still type commands in the input box below!");
          setStatus('error');
        });
    } else {
      runRecognition();
    }
  };

  const handleStopRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    setIsRecording(false);
    setStatus('idle');
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    const cmd = inputText;
    setInputText('');
    executeCommand(cmd);
  };

  return (
    <div className="space-y-6 text-left">
      {/* Upper Control Console & Sandbox */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Interactive Audio Commander Console */}
        <div className="lg:col-span-7">
          <GlassCard className="p-5 space-y-4 relative overflow-hidden h-full flex flex-col justify-between">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <div>
                <h3 className="font-bold text-theme-heading font-display text-sm flex items-center gap-2">
                  <Mic className="w-4 h-4 text-indigo-400" />
                  Voice Commander & Schedule Sandbox
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Microphone inputs are parsed using advanced natural language processing.</p>
              </div>

              <button
                onClick={() => setTtsEnabled(!ttsEnabled)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-950/20 border border-white/5 transition-colors cursor-pointer"
                title={ttsEnabled ? 'Mute voice feedback' : 'Unmute voice feedback'}
              >
                {ttsEnabled ? <Volume2 className="w-3.5 h-3.5 text-indigo-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-500" />}
              </button>
            </div>

            {/* Simulated Voice Waveform & Record Interface */}
            <div className="py-6 flex flex-col items-center justify-center gap-4 bg-slate-950/15 border border-white/5 rounded-2xl relative overflow-hidden my-2">
              <div className="absolute inset-0 bg-indigo-500/5 blur-3xl pointer-events-none rounded-2xl" />
              
              {isRecording ? (
                <div className="flex items-center gap-1.5 h-8">
                  <div className="w-1 bg-rose-500 rounded animate-pulse" style={{ height: '60%', animationDelay: '0.1s' }} />
                  <div className="w-1 bg-rose-500 rounded animate-pulse" style={{ height: '100%', animationDelay: '0.3s' }} />
                  <div className="w-1 bg-rose-500 rounded animate-pulse" style={{ height: '40%', animationDelay: '0.5s' }} />
                  <div className="w-1 bg-rose-500 rounded animate-pulse" style={{ height: '80%', animationDelay: '0.2s' }} />
                  <div className="w-1 bg-rose-500 rounded animate-pulse" style={{ height: '50%', animationDelay: '0.4s' }} />
                </div>
              ) : (
                <div className="h-8 flex items-center">
                  <span className="text-[10px] font-mono text-slate-500 font-bold uppercase tracking-wider">Console Input Idle</span>
                </div>
              )}

              <button
                onClick={isRecording ? handleStopRecording : handleStartRecording}
                className={`w-14 h-14 rounded-full flex items-center justify-center border transition-all duration-300 relative cursor-pointer shadow-lg group ${
                  isRecording 
                    ? 'bg-rose-600 border-rose-500 shadow-rose-500/20 hover:bg-rose-500' 
                    : 'bg-indigo-600 border-indigo-500 shadow-indigo-500/20 hover:bg-indigo-500'
                }`}
              >
                <Mic className={`w-6 h-6 text-white transition-transform ${isRecording ? 'scale-110 animate-bounce' : 'group-hover:scale-105'}`} />
                {isRecording && (
                  <span className="absolute -inset-1 rounded-full border border-rose-500 animate-ping opacity-30" />
                )}
              </button>

              <div className="text-center space-y-1">
                <p className="text-xs font-semibold text-theme-heading">
                  {status === 'listening' ? 'Listening carefully...' :
                   status === 'processing' ? 'AI is organizing request...' :
                   status === 'success' ? 'Command parsed successfully!' :
                   status === 'error' ? 'Microphone error occured' : 'Click microphone or type command below'}
                </p>
                <p className="text-[10px] text-slate-400 font-medium">
                  {status === 'listening' ? 'Say your schedule or task command now.' : 'Supports standard English sentences.'}
                </p>
              </div>
            </div>

            {/* Error or Success notification blocks */}
            {status === 'error' && errorMessage && (
              <div className="p-3 bg-rose-500/5 border border-rose-500/20 text-rose-400 rounded-xl text-xs flex gap-2 items-start leading-relaxed">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block uppercase text-[10px] tracking-wider mb-0.5">Microphone Access Error</span>
                  <p>{errorMessage}</p>
                </div>
              </div>
            )}

            {status === 'success' && feedbackText && (
              <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs flex gap-2 items-start leading-relaxed">
                <Check className="w-4 h-4 bg-emerald-500/10 p-0.5 rounded-full shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block uppercase text-[10px] tracking-wider mb-0.5">Executed Response</span>
                  <p className="italic">"{feedbackText}"</p>
                </div>
              </div>
            )}

            {/* Command typed entry box */}
            <form onSubmit={handleTextSubmit} className="flex gap-2 pt-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder='Type command: e.g. "Add task review slides tomorrow at 4 PM"...'
                className="flex-grow px-3.5 py-2.5 bg-slate-950/25 border border-white/5 rounded-xl text-xs text-theme-heading focus:outline-none placeholder-slate-500 focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1 transition-all cursor-pointer shadow-md shrink-0"
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          </GlassCard>
        </div>

        {/* Live Command Logs History */}
        <div className="lg:col-span-5">
          <GlassCard className="p-5 space-y-3 h-full flex flex-col justify-between">
            <h4 className="font-bold text-theme-heading font-display text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-2">
              <History className="w-4 h-4 text-indigo-400" />
              Commander Session History
            </h4>

            <div className="flex-1 bg-slate-950/25 border border-white/5 rounded-2xl p-3.5 max-h-[225px] overflow-y-auto space-y-2.5">
              {history.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-10">
                  <MessageSquare className="w-6 h-6 text-slate-600 mb-1" />
                  <p className="text-[10px] text-slate-500 font-mono">No voice or text commands executed in this session yet.</p>
                </div>
              ) : (
                history.map((item) => (
                  <div key={item.id} className="text-[10px] font-mono bg-white/5 border border-white/5 p-2.5 rounded-xl space-y-1.5">
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-indigo-400 font-bold uppercase text-[9px] tracking-wider">
                        [{item.type}]
                      </span>
                      <span className="text-slate-500 text-[9px] shrink-0 font-bold">{item.timestamp}</span>
                    </div>
                    <p className="text-theme-heading font-medium break-words">"{item.transcript}"</p>
                    <p className="text-slate-400 border-t border-white/5 pt-1 mt-1 text-[9px] italic">
                      AI response: {item.feedback}
                    </p>
                  </div>
                ))
              )}
            </div>

            <p className="text-[9px] text-slate-500 leading-normal text-center pt-2">
              * Voice history and parsed intents are securely processed server-side via the Gemini model, maintaining complete local synchronization.
            </p>
          </GlassCard>
        </div>
      </div>

      {/* Semantic Helper Guidelines Sheet */}
      <div className="space-y-3">
        <h4 className="font-bold text-theme-heading font-display text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-2">
          <BookOpen className="w-4 h-4 text-emerald-400" />
          Semantic Guideline Cheat Sheet
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {SAMPLE_COMMANDS.map((col) => {
            const Icon = col.icon;
            return (
              <GlassCard key={col.category} className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg border shrink-0 ${col.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <h5 className="text-xs font-bold text-theme-heading font-display">{col.category}</h5>
                </div>

                <div className="space-y-2">
                  {col.items.map((item) => (
                    <button
                      key={item.text}
                      onClick={() => setInputText(item.text)}
                      className="w-full text-left p-2 bg-slate-950/15 border border-white/5 hover:border-indigo-500/20 rounded-lg transition-all text-[10px] font-mono group cursor-pointer"
                    >
                      <span className="text-theme-heading block font-semibold group-hover:text-indigo-400 leading-normal mb-0.5">
                        "{item.text}"
                      </span>
                      <span className="text-slate-500 leading-none">{item.desc}</span>
                    </button>
                  ))}
                </div>
              </GlassCard>
            );
          })}
        </div>
      </div>
    </div>
  );
}
