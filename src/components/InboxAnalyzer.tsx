import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Task, Priority, EnergyLevel, SubTask } from '../types';
import { parseLocalInbox } from '../lib/localIntelligence';
import GlassCard from './GlassCard';
import CustomDropdown from './CustomDropdown';
import { 
  Sparkles, AlertCircle, Check, Clock, Clipboard, RotateCcw, Plus, Trash2, Info, Camera, ImageIcon
} from 'lucide-react';

interface InboxAnalyzerProps {
  onAddTask: (task: Partial<Task>) => void;
}

const analyzerPriorityOptions = [
  { value: 'critical', label: 'Critical Urgency', bulletColor: 'bg-rose-500' },
  { value: 'high', label: 'High Priority', bulletColor: 'bg-amber-500' },
  { value: 'medium', label: 'Medium Priority', bulletColor: 'bg-indigo-500' },
  { value: 'low', label: 'Low Priority', bulletColor: 'bg-emerald-500' }
];

const analyzerEnergyOptions = [
  { value: 'deep', label: 'Deep Focus', icon: '🧠' },
  { value: 'light', label: 'Light Effort', icon: '⚡' },
  { value: 'admin', label: 'Admin Task', icon: '📋' },
  { value: 'quick', label: 'Quick Win (< 15m)', icon: '⏱️' }
];

export default function InboxAnalyzer({ onAddTask }: InboxAnalyzerProps) {
  const [content, setContent] = useState('');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [sourceType] = useState<'auto' | 'email' | 'chat' | 'sms'>('auto');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  // Extracted Task States for Preview & Edit
  const [extractedTask, setExtractedTask] = useState<{
    title: string;
    description: string;
    priority: Priority;
    energyRequired: EnergyLevel;
    deadline: string;
    estimatedDuration: number;
    subtasks: { title: string; estimatedMinutes: number }[];
    aiRationale: string;
  } | null>(null);

  const [importSuccess, setImportSuccess] = useState(false);

  // Steps for loading simulation
  const loadingSteps = [
    'Deconstructing raw text input...',
    'Scanning dates, times and urgency signals...',
    'Mapping cognitive energy requirements...',
    'Structuring tactical action-item subtasks...',
    'Finalizing parameters...'
  ];

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (PNG, JPG, etc.).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image is too large. Please select an image smaller than 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setUploadedImage(reader.result as string);
      setError(null);
    };
    reader.onerror = () => {
      setError('Failed to read image file.');
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (!content.trim() && !uploadedImage) {
      setError('Please paste some text content or upload an image/screenshot first.');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setExtractedTask(null);
    setImportSuccess(false);

    // Run a staggered step interval to show professional loading feedback
    setLoadingStep(0);
    const stepInterval = setInterval(() => {
      setLoadingStep(prev => {
        if (prev < loadingSteps.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 400); // Speed up slightly for instant feel when using local heuristics

    // If offline, bypass and use local intelligence instantly
    if (!navigator.onLine) {
      clearInterval(stepInterval);
      const localResult = parseLocalInbox(content || 'Screenshot Analysis', sourceType);
      setExtractedTask({ ...localResult, isLocal: true } as any);
      setIsAnalyzing(false);
      return;
    }

    try {
      const response = await fetch('/api/ai/analyze-inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content, 
          sourceType: uploadedImage ? 'screenshot' : sourceType,
          image: uploadedImage
        })
      });

      if (!response.ok) {
        throw new Error('Analysis failed or server unavailable');
      }

      const data = await response.json();
      setExtractedTask(data);
    } catch (err: any) {
      console.error(err);
      console.warn('API inbox extraction failed, utilizing local intelligence engine.');
      const localResult = parseLocalInbox(content || 'Screenshot Analysis', sourceType);
      setExtractedTask({ ...localResult, isLocal: true } as any);
    } finally {
      clearInterval(stepInterval);
      setIsAnalyzing(false);
    }
  };

  const handleUpdateExtractedField = (field: string, value: any) => {
    if (!extractedTask) return;
    setExtractedTask({
      ...extractedTask,
      [field]: value
    });
  };

  const handleUpdateSubtaskTitle = (idx: number, newTitle: string) => {
    if (!extractedTask) return;
    const updated = [...extractedTask.subtasks];
    updated[idx].title = newTitle;
    handleUpdateExtractedField('subtasks', updated);
  };

  const handleUpdateSubtaskMinutes = (idx: number, minutes: number) => {
    if (!extractedTask) return;
    const updated = [...extractedTask.subtasks];
    updated[idx].estimatedMinutes = minutes;
    handleUpdateExtractedField('subtasks', updated);
  };

  const handleAddSubtask = () => {
    if (!extractedTask) return;
    handleUpdateExtractedField('subtasks', [
      ...extractedTask.subtasks,
      { title: '', estimatedMinutes: 15 }
    ]);
  };

  const handleRemoveSubtask = (idx: number) => {
    if (!extractedTask) return;
    handleUpdateExtractedField('subtasks', extractedTask.subtasks.filter((_, i) => i !== idx));
  };

  const handleImportTask = () => {
    if (!extractedTask) return;

    // Convert extracted task format into a standard new Task object structure
    const formattedSubtasks: SubTask[] = extractedTask.subtasks.map((st, i) => ({
      id: `sub-${Math.random().toString(36).substring(2, 11)}`,
      title: st.title || 'Action step',
      completed: false,
      estimatedMinutes: st.estimatedMinutes || 15
    }));

    onAddTask({
      title: extractedTask.title,
      description: extractedTask.description,
      priority: extractedTask.priority,
      energyRequired: extractedTask.energyRequired,
      deadline: extractedTask.deadline,
      estimatedDuration: extractedTask.estimatedDuration,
      subtasks: formattedSubtasks,
      contextTags: ['inbox-intake', uploadedImage ? 'screenshot' : sourceType],
      tags: ['AI-Intake']
    });

    setImportSuccess(true);
    // Auto clear after 3 seconds
    setTimeout(() => {
      setImportSuccess(false);
      setExtractedTask(null);
      setContent('');
      setUploadedImage(null);
    }, 3500);
  };

  const handleReset = () => {
    setContent('');
    setUploadedImage(null);
    setExtractedTask(null);
    setImportSuccess(false);
    setError(null);
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div>
        <h1 className="text-2xl font-bold font-display tracking-tight text-theme-heading flex items-center gap-2">
          📥 AI Inbox & Message Intake
        </h1>
        <p className="text-theme-subtle text-xs mt-0.5">
          Paste incoming messages, Slack alerts, or emails, or upload screenshots. Our AI companion will instantly analyze, extract critical parameters, formulate deadlines, and construct subtasks.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Left Column: Intake Controls & Paste Input */}
        <div className="flex flex-col h-full">
          <GlassCard className="p-5 flex flex-col justify-between h-full min-h-[400px]">
            <div className="space-y-4 flex-1 flex flex-col">
              <h3 className="font-bold text-xs uppercase tracking-wider text-theme-subtle">
                Source Input
              </h3>

              {/* Paste Input Text Area */}
              <div className="space-y-1.5 flex-1 flex flex-col">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                    Paste Raw Content
                  </label>
                  {content && (
                    <button
                      onClick={handleReset}
                      className="text-[10px] text-rose-500 hover:text-rose-400 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" /> Clear Content
                    </button>
                  )}
                </div>
                <div className="relative flex-1 flex flex-col min-h-[180px]">
                  <textarea
                    value={content}
                    onChange={(e) => { setContent(e.target.value); setError(null); }}
                    placeholder="Paste an email thread, instant message conversation, assignment specifications, or raw tasks details here..."
                    className="w-full h-full flex-1 p-3.5 bg-slate-50 dark:bg-slate-950/25 border border-slate-200 dark:border-white/5 rounded-2xl text-xs text-theme-heading focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-slate-500/80 leading-relaxed font-sans resize-none"
                  />
                  {!content && (
                    <div className="absolute top-3 right-3 text-slate-600 dark:text-slate-500 pointer-events-none">
                      <Clipboard className="w-4 h-4 opacity-30" />
                    </div>
                  )}
                </div>
                <div className="flex justify-between text-[10px] text-theme-subtle">
                  <span>{content.length} characters</span>
                  <span>Minimum 15 recommended</span>
                </div>
              </div>

              {uploadedImage && (
                <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 p-1.5 bg-slate-50 dark:bg-slate-950/20 flex items-center justify-between gap-3 animate-fade-in">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img src={uploadedImage} alt="Uploaded screenshot" className="w-12 h-12 object-cover rounded-lg border border-slate-200 dark:border-white/10 shadow-sm" referrerPolicy="no-referrer" />
                    <div className="truncate">
                      <span className="text-xs font-semibold text-theme-heading block">Screenshot Selected</span>
                      <span className="text-[10px] text-theme-subtle block font-mono">Ready for AI extraction</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setUploadedImage(null)}
                    className="p-1.5 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer mr-1 shrink-0"
                    title="Remove Image"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}

              {error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-2 text-[11px] text-rose-500 dark:text-rose-400">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p className="leading-snug">{error}</p>
                </div>
              )}
            </div>

            {/* Submit Action and Image Upload */}
            <div className="flex gap-2.5 mt-4">
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing || (!content.trim() && !uploadedImage)}
                className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/15 text-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Sparkles className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
                {isAnalyzing ? (uploadedImage ? 'Dissecting Screenshot...' : 'Dissecting Message...') : (uploadedImage ? 'Analyze Screenshot & Extract' : 'Analyze Message & Extract')}
              </button>
              
              <label className="p-3 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 rounded-2xl flex items-center justify-center cursor-pointer transition-all aspect-square shrink-0 group relative overflow-hidden" title="Upload Image / Screenshot">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={isAnalyzing}
                  className="hidden"
                />
                <Camera className="w-5 h-5 text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-white transition-colors" />
              </label>
            </div>
          </GlassCard>
        </div>

        {/* Right Column: AI Extraction Output Preview & Form */}
        <div className="flex flex-col h-full">
          <AnimatePresence mode="wait">
            {isAnalyzing && (
              <motion.div
                key="analyzing-state"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="w-full h-full min-h-[400px] flex flex-col items-center justify-center text-center p-8 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-3xl space-y-6"
              >
                <div className="relative">
                  <div className="w-16 h-16 rounded-full border-4 border-indigo-500/10 border-t-indigo-500 animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-indigo-500 animate-pulse" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h3 className="font-bold text-theme-heading text-sm font-display animate-pulse">Running Cognitive AI Extraction</h3>
                  <p className="text-theme-subtle text-xs max-w-sm leading-relaxed">
                    Analyzing communication language, mapping time schedules, and synthesizing structured steps.
                  </p>
                </div>

                {/* Staggered progress steps */}
                <div className="px-4 py-2 bg-slate-900/40 rounded-2xl border border-white/5 max-w-xs w-full">
                  <p className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-widest block text-center mb-1">
                    System State
                  </p>
                  <p className="text-[11px] text-theme-heading font-medium truncate text-center">
                    {loadingSteps[loadingStep]}
                  </p>
                </div>
              </motion.div>
            )}

            {!isAnalyzing && !extractedTask && !importSuccess && (
              <motion.div
                key="empty-state"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-full h-full min-h-[400px] flex flex-col items-center justify-center text-center p-8 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-3xl space-y-4 opacity-80"
              >
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 flex items-center justify-center text-indigo-500 text-lg">
                  📥
                </div>
                <div className="space-y-1">
                  <h3 className="font-semibold text-theme-heading text-sm">No Extracted Preview</h3>
                  <p className="text-theme-subtle text-xs max-w-xs leading-relaxed">
                    Paste content on the left or upload a task checklist screenshot, then click "Analyze" to see parsed task results.
                  </p>
                </div>
                <div className="pt-2 flex items-center gap-1.5 text-[10px] text-theme-subtle bg-slate-100 dark:bg-slate-900/50 px-3 py-1 rounded-full border border-slate-200 dark:border-white/5">
                  <Info className="w-3.5 h-3.5 text-indigo-500" />
                  <span>The AI maps deadlines automatically matching today's date!</span>
                </div>
              </motion.div>
            )}

            {importSuccess && (
              <motion.div
                key="success-state"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="w-full h-full min-h-[400px] flex flex-col items-center justify-center text-center p-8 bg-emerald-500/5 border border-emerald-500/20 rounded-3xl space-y-4"
              >
                <div className="w-14 h-14 rounded-full bg-emerald-500 text-white flex items-center justify-center text-2xl shadow-lg shadow-emerald-500/20 animate-bounce">
                  <Check className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-emerald-500 text-base font-display">Task Successfully Extracted!</h3>
                  <p className="text-theme-text text-xs max-w-xs leading-relaxed">
                    The task, complete with customized descriptions, priority indicators, timelines, and action subtasks, has been integrated into your core Smart Task list.
                  </p>
                </div>
                <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
                  Redirecting & resetting workspace...
                </div>
              </motion.div>
            )}

            {!isAnalyzing && extractedTask && !importSuccess && (
              <motion.div
                key="preview-form-state"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {/* Visual feedback glow based on extracted priority */}
                <div className={`p-5 bg-[var(--glass-bg)] border rounded-3xl shadow-xl transition-all duration-300 relative overflow-hidden ${
                  extractedTask.priority === 'critical' ? 'border-rose-500/30 bg-rose-500/5 shadow-rose-500/5' :
                  extractedTask.priority === 'high' ? 'border-amber-500/30 bg-amber-500/5 shadow-amber-500/5' :
                  extractedTask.priority === 'medium' ? 'border-indigo-500/30 bg-indigo-500/5 shadow-indigo-500/5' :
                  'border-emerald-500/30 bg-emerald-500/5 shadow-emerald-500/5'
                }`}>
                  <div className="absolute top-0 right-0 p-3 bg-indigo-500/10 rounded-bl-2xl text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1 select-none">
                    <Sparkles className="w-3 h-3 animate-pulse" /> {(extractedTask as any)?.isLocal ? '⚡ Local Extraction Draft' : 'AI Extraction Draft'}
                  </div>

                  <h3 className="font-bold text-sm text-theme-heading font-display pb-3 border-b border-slate-200 dark:border-white/5 flex items-center gap-1.5">
                    ⚙️ Configure & Confirm Extracted Task
                  </h3>

                  {/* Form fields */}
                  <div className="space-y-4 pt-4">
                    {/* Task Title */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">Task Title</label>
                      <input
                        type="text"
                        value={extractedTask.title}
                        onChange={(e) => handleUpdateExtractedField('title', e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950/20 border border-slate-200 dark:border-white/5 rounded-xl text-xs text-theme-heading focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                        placeholder="Task title"
                      />
                    </div>

                    {/* Task Description */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">Description & Refined Context</label>
                      <textarea
                        value={extractedTask.description}
                        onChange={(e) => handleUpdateExtractedField('description', e.target.value)}
                        rows={3}
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950/20 border border-slate-200 dark:border-white/5 rounded-xl text-xs text-theme-heading focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed font-sans"
                        placeholder="Context / notes details"
                      />
                    </div>

                    {/* Horizontal split options */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Priority */}
                      <div className="space-y-1 flex flex-col">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Priority Level</label>
                        <CustomDropdown
                          value={extractedTask.priority}
                          onChange={(val) => handleUpdateExtractedField('priority', val)}
                          options={analyzerPriorityOptions}
                          className="w-full"
                        />
                      </div>

                      {/* Energy level */}
                      <div className="space-y-1 flex flex-col">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Cognitive Energy Required</label>
                        <CustomDropdown
                          value={extractedTask.energyRequired}
                          onChange={(val) => handleUpdateExtractedField('energyRequired', val)}
                          options={analyzerEnergyOptions}
                          className="w-full"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Deadline picker */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">Formulated Deadline</label>
                        <input
                          type="datetime-local"
                          value={extractedTask.deadline.substring(0, 16)}
                          onChange={(e) => handleUpdateExtractedField('deadline', e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950/25 border border-slate-200 dark:border-white/5 rounded-xl text-xs text-theme-heading focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                        />
                      </div>

                      {/* Estimate duration */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">Total Time Budget (mins)</label>
                        <input
                          type="number"
                          value={extractedTask.estimatedDuration}
                          onChange={(e) => handleUpdateExtractedField('estimatedDuration', parseInt(e.target.value) || 30)}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950/25 border border-slate-200 dark:border-white/5 rounded-xl text-xs text-theme-heading focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                        />
                      </div>
                    </div>

                    {/* Subtasks Extraction Box */}
                    <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-white/5">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">
                          Tactical Action Steps ({extractedTask.subtasks.length})
                        </label>
                        <button
                          onClick={handleAddSubtask}
                          className="text-[10px] text-indigo-500 hover:text-indigo-400 font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add Step
                        </button>
                      </div>

                      <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                        {extractedTask.subtasks.map((st, idx) => (
                          <div 
                            key={idx} 
                            className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-950/15 border border-slate-200 dark:border-white/5 rounded-xl text-xs hover:border-slate-300 dark:hover:border-white/10"
                          >
                            <span className="text-[10px] font-mono text-indigo-400 font-bold ml-1">#{idx + 1}</span>
                            <input
                              type="text"
                              value={st.title}
                              onChange={(e) => handleUpdateSubtaskTitle(idx, e.target.value)}
                              placeholder="Action title"
                              className="flex-1 bg-transparent border-none outline-none focus:ring-0 text-[11px] text-theme-heading px-1 font-medium"
                            />
                            <div className="flex items-center gap-1 border-l border-slate-200 dark:border-white/5 pl-2">
                              <input
                                type="number"
                                value={st.estimatedMinutes}
                                onChange={(e) => handleUpdateSubtaskMinutes(idx, parseInt(e.target.value) || 0)}
                                className="w-12 bg-transparent text-center border-none outline-none focus:ring-0 font-mono text-[11px] text-indigo-400"
                                placeholder="mins"
                              />
                              <span className="text-[9px] text-theme-subtle">m</span>
                            </div>
                            <button
                              onClick={() => handleRemoveSubtask(idx)}
                              className="p-1 rounded text-slate-500 hover:text-rose-500 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* AI Rationale explanation */}
                    {extractedTask.aiRationale && (
                      <div className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl flex items-start gap-2 text-[10px] leading-relaxed text-indigo-600 dark:text-indigo-400">
                        <span className="text-xs">💡</span>
                        <p><strong>AI Extraction Logic:</strong> {extractedTask.aiRationale}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Import Action */}
                <div className="flex gap-3 justify-end pt-2">
                  <button
                    onClick={handleReset}
                    className="px-5 py-2.5 bg-slate-200 dark:bg-white/5 hover:bg-slate-300 dark:hover:bg-white/10 text-theme-heading text-xs font-bold rounded-2xl transition-all cursor-pointer"
                  >
                    Reset Form
                  </button>
                  <button
                    onClick={handleImportTask}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-2xl flex items-center gap-1.5 transition-all shadow-lg shadow-emerald-600/15 cursor-pointer"
                  >
                    <Check className="w-4 h-4" /> Import Actionable Task
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
