import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Task, Priority, EnergyLevel, SubTask } from '../types';
import { generateLocalTaskBreakdown, generateLocalPrioritization } from '../lib/localIntelligence';
import GlassCard from './GlassCard';
import CustomDropdown, { DropdownOption } from './CustomDropdown';
import { 
  Plus, Search, Sliders, Calendar, Zap, AlertCircle, Sparkles, 
  Trash2, CheckCircle, Clock, Battery, Tag, ChevronDown, CheckSquare, 
  Square, Edit3, AlertTriangle, X, Check, ArrowUpDown, Brain, ShieldAlert
} from 'lucide-react';

interface BulkDeleteButtonProps {
  onDelete: () => void;
  count: number;
}

function BulkDeleteButton({ onDelete, count }: BulkDeleteButtonProps) {
  const [confirming, setConfirming] = useState(false);
  
  React.useEffect(() => {
    if (confirming) {
      const timer = setTimeout(() => setConfirming(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [confirming]);

  if (confirming) {
    return (
      <button
        onClick={onDelete}
        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-xs text-white font-semibold rounded-xl flex items-center gap-1 transition-all cursor-pointer animate-pulse shadow-md shadow-rose-600/20"
      >
        <Trash2 className="w-3.5 h-3.5" /> Confirm Delete {count} Tasks?
      </button>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="px-3 py-1.5 bg-rose-600/10 border border-rose-500/20 text-rose-400 hover:bg-rose-600/20 text-xs font-semibold rounded-xl flex items-center gap-1 transition-all cursor-pointer"
    >
      <Trash2 className="w-3.5 h-3.5" /> Delete
    </button>
  );
}

const priorityFilterOptions: DropdownOption<Priority | 'all'>[] = [
  { value: 'all', label: 'All Priorities' },
  { value: 'critical', label: 'Critical', bulletColor: 'bg-rose-500' },
  { value: 'high', label: 'High', bulletColor: 'bg-amber-500' },
  { value: 'medium', label: 'Medium', bulletColor: 'bg-indigo-500' },
  { value: 'low', label: 'Low', bulletColor: 'bg-emerald-500' }
];

const priorityFormOptions: DropdownOption<Priority>[] = [
  { value: 'critical', label: 'Critical', bulletColor: 'bg-rose-500' },
  { value: 'high', label: 'High Priority', bulletColor: 'bg-amber-500' },
  { value: 'medium', label: 'Medium Priority', bulletColor: 'bg-indigo-500' },
  { value: 'low', label: 'Low Priority', bulletColor: 'bg-emerald-500' }
];

const energyFilterOptions: DropdownOption<EnergyLevel | 'all'>[] = [
  { value: 'all', label: 'All Energies' },
  { value: 'deep', label: 'Deep Work', icon: '🧠' },
  { value: 'light', label: 'Light Work', icon: '💡' },
  { value: 'admin', label: 'Admin Work', icon: '📋' },
  { value: 'quick', label: 'Quick Micro', icon: '⚡' }
];

const energyFormOptions: DropdownOption<EnergyLevel>[] = [
  { value: 'deep', label: 'Deep Work', icon: '🧠' },
  { value: 'light', label: 'Light Work', icon: '💡' },
  { value: 'admin', label: 'Quick Admin', icon: '📋' },
  { value: 'quick', label: 'Micro (< 5 min)', icon: '⚡' }
];

const statusFilterOptions: DropdownOption<'all' | 'todo' | 'completed'>[] = [
  { value: 'all', label: 'All Status' },
  { value: 'todo', label: 'Pending', icon: '⏳' },
  { value: 'completed', label: 'Completed', icon: '✅' }
];

const tagFilterOptions: DropdownOption<string | 'all'>[] = [
  { value: 'all', label: 'All Tags' },
  { value: 'Work', label: 'Work', icon: '💼' },
  { value: 'Study', label: 'Study', icon: '🎓' },
  { value: 'Personal', label: 'Personal', icon: '🏠' }
];

const sortByOptions: DropdownOption<string>[] = [
  { value: 'deadline-asc', label: 'Soonest First', icon: '⏳' },
  { value: 'deadline-desc', label: 'Latest First', icon: '📆' },
  { value: 'priority-desc', label: 'Highest Priority', icon: '🔥' },
  { value: 'energy-desc', label: 'Highest Energy', icon: '🧠' },
  { value: 'energy-asc', label: 'Lowest Energy', icon: '⚡' },
  { value: 'title-asc', label: 'Title A-Z', icon: '🔤' }
];

interface TaskCenterProps {
  tasks: Task[];
  onAddTask: (task: Partial<Task>) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;
}

export default function TaskCenter({ tasks, onAddTask, onUpdateTask, onDeleteTask }: TaskCenterProps) {
  // AI Advisor States
  const [showAdvisorModal, setShowAdvisorModal] = useState(false);
  const [isPrioritizing, setIsPrioritizing] = useState(false);
  const [advisorData, setAdvisorData] = useState<any | null>(null);
  const [advisorError, setAdvisorError] = useState<string | null>(null);
  const [overwriteManual, setOverwriteManual] = useState(true);

  const handleRunPrioritization = async () => {
    setIsPrioritizing(true);
    setAdvisorError(null);

    // If offline, use local adaptive engine instantly
    if (!navigator.onLine) {
      const localResult = generateLocalPrioritization(tasks);
      setAdvisorData({ ...localResult, isLocal: true });
      setIsPrioritizing(false);
      return;
    }

    try {
      const res = await fetch('/api/ai/prioritize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks, currentDate: new Date().toISOString() })
      });
      if (res.ok) {
        const data = await res.json();
        setAdvisorData(data);
      } else {
        console.warn('API prioritization failed, utilizing local intelligence engine.');
        const localResult = generateLocalPrioritization(tasks);
        setAdvisorData({ ...localResult, isLocal: true });
      }
    } catch (err) {
      console.warn('Network error in prioritization, utilizing local intelligence engine:', err);
      const localResult = generateLocalPrioritization(tasks);
      setAdvisorData({ ...localResult, isLocal: true });
    } finally {
      setIsPrioritizing(false);
    }
  };

  const handleApplyPriorities = () => {
    if (!advisorData || !advisorData.prioritizedTasks) return;

    advisorData.prioritizedTasks.forEach((pt: any) => {
      const updates: Partial<Task> = {
        aiPriorityScore: pt.aiPriorityScore,
        aiSuggestedPriority: pt.suggestedPriority,
        aiPriorityExplanation: pt.explanation,
        aiUrgencyStatus: pt.urgencyStatus
      };
      if (overwriteManual) {
        updates.priority = pt.suggestedPriority;
      }
      onUpdateTask(pt.id, updates);
    });

    setShowAdvisorModal(false);
  };

  const [search, setSearch] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<Priority | 'all'>('all');
  const [selectedEnergy, setSelectedEnergy] = useState<EnergyLevel | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'todo' | 'completed'>('todo');
  const [selectedTag, setSelectedTag] = useState<string | 'all'>('all');
  
  // Custom interactive stats filters
  const [quickFilter, setQuickFilter] = useState<'all' | 'overdue' | 'due-soon' | 'completed'>('all');
  const [sortBy, setSortBy] = useState<string>('deadline-asc');

  // Completed archive visibility state
  const [showCompletedArchive, setShowCompletedArchive] = useState(false);

  // Bulk selection states
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);

  // New task form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [energy, setEnergy] = useState<EnergyLevel>('light');
  const [deadline, setDeadline] = useState('');
  const [duration, setDuration] = useState(30);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Task Editing states
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPriority, setEditPriority] = useState<Priority>('medium');
  const [editEnergy, setEditEnergy] = useState<EnergyLevel>('light');
  const [editDeadline, setEditDeadline] = useState('');
  const [editDuration, setEditDuration] = useState(30);
  const [editTags, setEditTags] = useState<string[]>([]);

  // Manual Subtask state
  const [newSubtaskTitle, setNewSubtaskTitle] = useState<{ [taskId: string]: string }>({});

  // AI Breakdown states
  const [decomposingTaskId, setDecomposingTaskId] = useState<string | null>(null);

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    // Default deadline to tomorrow if empty
    const defaultDeadline = deadline || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16);

    onAddTask({
      title: title.trim(),
      description: description.trim(),
      priority,
      energyRequired: energy,
      deadline: defaultDeadline,
      estimatedDuration: Number(duration),
      status: 'todo',
      subtasks: [],
      tags: selectedTags,
      contextTags: []
    });

    // Reset
    setTitle('');
    setDescription('');
    setPriority('medium');
    setEnergy('light');
    setDeadline('');
    setDuration(30);
    setSelectedTags([]);
    setShowAddForm(false);
  };

  const handleDecomposeTask = async (task: Task) => {
    setDecomposingTaskId(task.id);

    // If offline, use local adaptive engine instantly
    if (!navigator.onLine) {
      const localResult = generateLocalTaskBreakdown(task.title, task.description || '');
      onUpdateTask(task.id, {
        subtasks: localResult.subtasks || [],
        aiPredictedDuration: localResult.aiPredictedDuration || task.estimatedDuration,
        procrastinationRisk: localResult.procrastinationRisk || 'medium'
      });
      setDecomposingTaskId(null);
      return;
    }

    try {
      const res = await fetch('/api/ai/breakdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: task.title, description: task.description })
      });
      if (res.ok) {
        const data = await res.json();
        onUpdateTask(task.id, {
          subtasks: data.subtasks || [],
          aiPredictedDuration: data.aiPredictedDuration || task.estimatedDuration,
          procrastinationRisk: data.procrastinationRisk || 'medium'
        });
      } else {
        console.warn('API Breakdown failed, utilizing local intelligence engine.');
        const localResult = generateLocalTaskBreakdown(task.title, task.description || '');
        onUpdateTask(task.id, {
          subtasks: localResult.subtasks || [],
          aiPredictedDuration: localResult.aiPredictedDuration || task.estimatedDuration,
          procrastinationRisk: localResult.procrastinationRisk || 'medium'
        });
      }
    } catch (err) {
      console.warn('Error breaking down task, utilizing local intelligence engine:', err);
      const localResult = generateLocalTaskBreakdown(task.title, task.description || '');
      onUpdateTask(task.id, {
        subtasks: localResult.subtasks || [],
        aiPredictedDuration: localResult.aiPredictedDuration || task.estimatedDuration,
        procrastinationRisk: localResult.procrastinationRisk || 'medium'
      });
    } finally {
      setDecomposingTaskId(null);
    }
  };

  const toggleSubtask = (task: Task, subtaskId: string) => {
    const updatedSubtasks = task.subtasks.map(sb => 
      sb.id === subtaskId ? { ...sb, completed: !sb.completed } : sb
    );
    onUpdateTask(task.id, { subtasks: updatedSubtasks });
  };

  const handleAddSubtask = (task: Task) => {
    const subTitle = newSubtaskTitle[task.id];
    if (!subTitle || !subTitle.trim()) return;
    
    const newSub: SubTask = {
      id: Math.random().toString(36).substring(2, 9),
      title: subTitle.trim(),
      completed: false,
      estimatedMinutes: 10
    };
    
    const updatedSubtasks = [...(task.subtasks || []), newSub];
    onUpdateTask(task.id, { subtasks: updatedSubtasks });
    setNewSubtaskTitle(prev => ({ ...prev, [task.id]: '' }));
  };

  const handleToggleTaskStatus = (task: Task) => {
    const newStatus = task.status === 'completed' ? 'todo' : 'completed';
    onUpdateTask(task.id, {
      status: newStatus,
      completedAt: newStatus === 'completed' ? new Date().toISOString() : undefined
    });
  };

  const startEditing = (task: Task) => {
    setEditingTaskId(task.id);
    setEditTitle(task.title);
    setEditDescription(task.description || '');
    setEditPriority(task.priority);
    setEditEnergy(task.energyRequired);
    setEditDeadline(task.deadline);
    setEditDuration(task.estimatedDuration);
    setEditTags(task.tags || []);
  };

  const handleSaveEdit = (taskId: string) => {
    if (!editTitle.trim()) return;
    onUpdateTask(taskId, {
      title: editTitle.trim(),
      description: editDescription.trim(),
      priority: editPriority,
      energyRequired: editEnergy,
      deadline: editDeadline,
      estimatedDuration: Number(editDuration),
      tags: editTags
    });
    setEditingTaskId(null);
  };

  // Due Status evaluator
  const getDueStatus = (task: Task) => {
    if (task.status === 'completed') return 'completed';
    const now = Date.now();
    const limit = new Date(task.deadline).getTime();
    const diff = limit - now;
    if (diff < 0) return 'overdue';
    const hoursRemaining = diff / (1000 * 60 * 60);
    if (hoursRemaining <= 24) return 'due-soon';
    return 'normal';
  };

  // Stats Calculations
  const totalPending = tasks.filter(t => t.status !== 'completed').length;
  const overdueCount = tasks.filter(t => t.status !== 'completed' && new Date(t.deadline).getTime() < Date.now()).length;
  const dueSoonCount = tasks.filter(t => {
    if (t.status === 'completed') return false;
    const diff = new Date(t.deadline).getTime() - Date.now();
    return diff >= 0 && diff <= 24 * 60 * 60 * 1000;
  }).length;
  const totalCompleted = tasks.filter(t => t.status === 'completed').length;

    // Filter tasks
    const filteredTasks = tasks.filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(search.toLowerCase()) || 
                            task.description.toLowerCase().includes(search.toLowerCase());
      const matchesPriority = selectedPriority === 'all' || task.priority === selectedPriority;
      const matchesEnergy = selectedEnergy === 'all' || task.energyRequired === selectedEnergy;
      const matchesTag = selectedTag === 'all' || (task.tags && task.tags.includes(selectedTag));
      
      // Dropdown Status Filter
      let matchesStatus = true;
      if (selectedStatus === 'todo') {
        matchesStatus = task.status !== 'completed';
      } else if (selectedStatus === 'completed') {
        matchesStatus = task.status === 'completed';
      }
  
      // Quick Metrics Filter
      let matchesQuickFilter = true;
      const dueStatus = getDueStatus(task);
      if (quickFilter === 'overdue') {
        matchesQuickFilter = task.status !== 'completed' && dueStatus === 'overdue';
      } else if (quickFilter === 'due-soon') {
        matchesQuickFilter = task.status !== 'completed' && dueStatus === 'due-soon';
      } else if (quickFilter === 'completed') {
        matchesQuickFilter = task.status === 'completed';
      }
  
      return matchesSearch && matchesPriority && matchesEnergy && matchesStatus && matchesQuickFilter && matchesTag;
    });

  // Sort tasks
  const priorityOrder: Record<Priority, number> = { critical: 4, high: 3, medium: 2, low: 1 };
  const energyOrder: Record<EnergyLevel, number> = { deep: 4, light: 3, admin: 2, quick: 1 };

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (sortBy === 'deadline-asc') {
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    }
    if (sortBy === 'deadline-desc') {
      return new Date(b.deadline).getTime() - new Date(a.deadline).getTime();
    }
    if (sortBy === 'priority-desc') {
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    }
    if (sortBy === 'energy-desc') {
      return energyOrder[b.energyRequired] - energyOrder[a.energyRequired];
    }
    if (sortBy === 'energy-asc') {
      return energyOrder[a.energyRequired] - energyOrder[b.energyRequired];
    }
    if (sortBy === 'title-asc') {
      return a.title.localeCompare(b.title);
    }
    return 0;
  });

  // Bulk selection operations
  const handleSelectAllVisible = () => {
    const allVisibleIds = filteredTasks.map(t => t.id);
    const areAllSelected = allVisibleIds.every(id => selectedTaskIds.includes(id));
    if (areAllSelected) {
      setSelectedTaskIds(prev => prev.filter(id => !allVisibleIds.includes(id)));
    } else {
      setSelectedTaskIds(prev => Array.from(new Set([...prev, ...allVisibleIds])));
    }
  };

  const handleBulkDelete = () => {
    selectedTaskIds.forEach(id => {
      onDeleteTask(id);
    });
    setSelectedTaskIds([]);
  };

  const handleBulkMarkComplete = () => {
    selectedTaskIds.forEach(id => {
      onUpdateTask(id, {
        status: 'completed',
        completedAt: new Date().toISOString()
      });
    });
    setSelectedTaskIds([]);
  };

  const handleBulkMarkPending = () => {
    selectedTaskIds.forEach(id => {
      onUpdateTask(id, {
        status: 'todo',
        completedAt: undefined
      });
    });
    setSelectedTaskIds([]);
  };

  const handleBulkReTag = (tag: string | null) => {
    selectedTaskIds.forEach(id => {
      onUpdateTask(id, {
        tags: tag === null ? [] : [tag]
      });
    });
    setSelectedTaskIds([]);
  };

  const getPriorityColor = (p: Priority) => {
    switch (p) {
      case 'critical': return 'text-rose-600 dark:text-rose-400 border-rose-500/30 bg-rose-500/10';
      case 'high': return 'text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10';
      case 'medium': return 'text-indigo-600 dark:text-indigo-400 border-indigo-500/30 bg-indigo-500/10';
      case 'low': return 'text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
    }
  };

  const getUrgencyScore = (task: Task) => {
    const now = new Date().getTime();
    const limit = new Date(task.deadline).getTime();
    const diff = limit - now;
    if (diff <= 0) return 100;
    const hoursRemaining = diff / (1000 * 60 * 60);
    if (hoursRemaining <= 2) return 95;
    if (hoursRemaining <= 8) return 85;
    if (hoursRemaining <= 24) return 70;
    return 40;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight text-theme-heading flex items-center gap-2">
            📋 Task Hub
          </h1>
          <p className="text-theme-subtle text-xs mt-0.5">Organize your priorities, estimate deadlines, and leverage AI breakdowns.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap ml-auto md:ml-0">
          <button
            onClick={() => {
              setShowAdvisorModal(true);
              if (!advisorData) {
                handleRunPrioritization();
              }
            }}
            className="px-4 py-2 bg-gradient-to-r from-emerald-600/10 to-teal-600/10 hover:from-emerald-600/15 hover:to-teal-600/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/30 font-semibold rounded-xl flex items-center gap-1.5 transition-all text-sm cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-emerald-500" /> AI Priority Advisor
          </button>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold rounded-xl flex items-center gap-1.5 transition-all shadow-lg shadow-indigo-600/20 text-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Smart Task
          </button>
        </div>
      </div>

      {/* Quick Interactive Metrics Summary Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={() => setQuickFilter('all')}
          className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden cursor-pointer ${
            quickFilter === 'all'
              ? 'bg-indigo-600/10 border-indigo-500/40 shadow-md'
              : 'bg-[var(--glass-bg)] border-[var(--glass-border)] hover:bg-[var(--glass-highlight)]'
          }`}
        >
          <div className="flex justify-between items-center">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">Total Pending</span>
            <span className="p-1 rounded-lg bg-indigo-500/10 text-indigo-400">
              <CheckSquare className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-theme-heading">{totalPending}</span>
            <span className="text-[10px] text-theme-subtle">tasks</span>
          </div>
        </button>

        <button
          onClick={() => setQuickFilter(quickFilter === 'overdue' ? 'all' : 'overdue')}
          className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden cursor-pointer ${
            quickFilter === 'overdue'
              ? 'bg-rose-600/20 border-rose-500/60 shadow-md shadow-rose-500/5'
              : 'bg-[var(--glass-bg)] border-[var(--glass-border)] hover:bg-[var(--glass-highlight)]'
          }`}
        >
          <div className="flex justify-between items-center">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">Overdue</span>
            <span className="p-1 rounded-lg bg-rose-500/10 text-rose-400">
              <AlertTriangle className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-rose-500 dark:text-rose-400">{overdueCount}</span>
            {overdueCount > 0 && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 font-bold uppercase animate-pulse">Action Req</span>
            )}
          </div>
        </button>

        <button
          onClick={() => setQuickFilter(quickFilter === 'due-soon' ? 'all' : 'due-soon')}
          className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden cursor-pointer ${
            quickFilter === 'due-soon'
              ? 'bg-amber-600/20 border-amber-500/60 shadow-md shadow-amber-500/5'
              : 'bg-[var(--glass-bg)] border-[var(--glass-border)] hover:bg-[var(--glass-highlight)]'
          }`}
        >
          <div className="flex justify-between items-center">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">Due Soon</span>
            <span className="p-1 rounded-lg bg-amber-500/10 text-amber-400">
              <Clock className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '6s' }} />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-500 dark:text-amber-400">{dueSoonCount}</span>
            <span className="text-[10px] text-theme-subtle">&lt; 24 Hours</span>
          </div>
        </button>

        <button
          onClick={() => setQuickFilter(quickFilter === 'completed' ? 'all' : 'completed')}
          className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden cursor-pointer ${
            quickFilter === 'completed'
              ? 'bg-emerald-600/10 border-emerald-500/40 shadow-md'
              : 'bg-[var(--glass-bg)] border-[var(--glass-border)] hover:bg-[var(--glass-highlight)]'
          }`}
        >
          <div className="flex justify-between items-center">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">Completed</span>
            <span className="p-1 rounded-lg bg-emerald-500/10 text-emerald-400">
              <CheckCircle className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-500 dark:text-emerald-400">{totalCompleted}</span>
            <span className="text-[10px] text-theme-subtle">tasks</span>
          </div>
        </button>
      </div>

      {/* Add Task Form Pop-up Modal */}
      <AnimatePresence>
        {showAddForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Modal Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/75 backdrop-blur-xs dark:backdrop-blur-md cursor-pointer"
              onClick={() => setShowAddForm(false)}
            />

            {/* Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-2xl bg-white dark:bg-slate-900/95 border border-slate-200 dark:border-white/10 p-6 rounded-3xl shadow-2xl backdrop-blur-2xl text-slate-800 dark:text-white z-10 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center pb-4 border-b border-slate-200 dark:border-white/10">
                <h3 className="font-semibold text-theme-heading font-display text-lg flex items-center gap-2">
                  <Plus className="w-5 h-5 text-indigo-500 dark:text-indigo-400" /> Add New Smart Task
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white cursor-pointer px-2.5 py-1 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg transition-colors"
                >
                  ✕ Close
                </button>
              </div>

              <form onSubmit={handleCreateTask} className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500 dark:text-slate-300 font-medium">Task Title</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Submit quarterly PR report"
                      required
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-slate-500 dark:text-slate-300 font-medium">Deadline (Date & Time)</label>
                    <input
                      type="datetime-local"
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm [color-scheme:light] dark:[color-scheme:dark]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-500 dark:text-slate-300 font-medium">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Details, specifications, or key deliverables..."
                    rows={3}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-500 dark:text-slate-300 font-medium">Categorical Tags</label>
                  <div className="flex flex-wrap gap-2">
                    {['Work', 'Study', 'Personal'].map((tag) => {
                      const isSelected = selectedTags.includes(tag);
                      return (
                        <button
                          type="button"
                          key={tag}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedTags(selectedTags.filter(t => t !== tag));
                            } else {
                              setSelectedTags([...selectedTags, tag]);
                            }
                          }}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg border flex items-center gap-1 cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/10'
                              : 'bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/40'
                          }`}
                        >
                          <Tag className="w-3 h-3" />
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1 flex flex-col">
                    <label className="text-xs text-slate-500 dark:text-slate-300 font-medium mb-1">Priority Level</label>
                    <CustomDropdown
                      value={priority}
                      onChange={setPriority}
                      options={priorityFormOptions}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-1 flex flex-col">
                    <label className="text-xs text-slate-500 dark:text-slate-300 font-medium mb-1">Energy Level</label>
                    <CustomDropdown
                      value={energy}
                      onChange={setEnergy}
                      options={energyFormOptions}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-slate-500 dark:text-slate-300 font-medium">Est. Duration (Min)</label>
                    <input
                      type="number"
                      value={duration}
                      onChange={(e) => setDuration(Number(e.target.value))}
                      min={5}
                      step={5}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-white/10 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-5 py-2 bg-slate-100 dark:bg-slate-950/30 hover:bg-slate-200 dark:hover:bg-slate-950/50 border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 text-xs text-slate-600 dark:text-slate-300 font-medium rounded-xl transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-xs text-white font-semibold rounded-xl transition-all cursor-pointer shadow-lg shadow-indigo-600/20"
                  >
                    Create Task
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Task Filters and Sorts */}
      <div className="space-y-3">
        {(quickFilter !== 'all' || selectedTag !== 'all' || selectedPriority !== 'all' || selectedEnergy !== 'all' || selectedStatus !== 'all') && (
          <div className="flex flex-wrap items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-xl text-xs text-indigo-400">
            <span className="font-semibold">Active Filters:</span>
            {quickFilter !== 'all' && (
              <span className="bg-indigo-500/20 px-2 py-0.5 rounded-md font-semibold text-[11px]">
                {quickFilter === 'due-soon' ? '⏳ Due Soon' : quickFilter === 'overdue' ? '⚠️ Overdue' : '✅ Completed'}
              </span>
            )}
            {selectedTag !== 'all' && (
              <span className="bg-indigo-500/20 px-2 py-0.5 rounded-md font-semibold text-[11px] flex items-center gap-1">
                <Tag className="w-2.5 h-2.5" /> {selectedTag}
              </span>
            )}
            {selectedPriority !== 'all' && (
              <span className="bg-indigo-500/20 px-2 py-0.5 rounded-md font-semibold text-[11px] capitalize">
                {selectedPriority} Priority
              </span>
            )}
            {selectedEnergy !== 'all' && (
              <span className="bg-indigo-500/20 px-2 py-0.5 rounded-md font-semibold text-[11px] capitalize">
                {selectedEnergy} Energy
              </span>
            )}
            {selectedStatus !== 'all' && (
              <span className="bg-indigo-500/20 px-2 py-0.5 rounded-md font-semibold text-[11px] capitalize">
                {selectedStatus === 'todo' ? 'Pending' : 'Completed'}
              </span>
            )}
            <span className="text-slate-400 dark:text-slate-500 font-medium ml-1">({sortedTasks.length} tasks)</span>
            <button
              onClick={() => {
                setQuickFilter('all');
                setSelectedTag('all');
                setSelectedPriority('all');
                setSelectedEnergy('all');
                setSelectedStatus('all');
                setSearch('');
              }}
              className="ml-auto text-xs hover:text-white font-bold cursor-pointer transition-colors text-indigo-400"
            >
              ✕ Clear All
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center bg-slate-950/10 dark:bg-white/5 p-3 rounded-2xl border border-[var(--glass-border)]">
          <div className="relative md:col-span-4">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks..."
              className="w-full pl-9 pr-4 py-1.5 bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
            />
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400 dark:text-slate-500" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 md:col-span-8">
            <CustomDropdown
              value={selectedPriority}
              onChange={setSelectedPriority}
              options={priorityFilterOptions}
              className="w-full"
            />

            <CustomDropdown
              value={selectedEnergy}
              onChange={setSelectedEnergy}
              options={energyFilterOptions}
              className="w-full"
            />

            <CustomDropdown
              value={selectedStatus}
              onChange={setSelectedStatus}
              options={statusFilterOptions}
              className="w-full"
            />

            <CustomDropdown
              value={selectedTag}
              onChange={setSelectedTag}
              options={tagFilterOptions}
              className="w-full"
            />

            <CustomDropdown
              value={sortBy}
              onChange={setSortBy}
              options={sortByOptions}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Bulk Action Mode Panel */}
      {isBulkMode && (
        <GlassCard className="p-4 border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/5 flex flex-col md:flex-row items-center justify-between gap-4 animate-fadeIn">
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleSelectAllVisible}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-900/40 hover:bg-slate-900/60 text-amber-500 border border-amber-500/20 rounded-xl cursor-pointer transition-all"
            >
              {sortedTasks.length > 0 && sortedTasks.every(t => selectedTaskIds.includes(t.id)) ? (
                <CheckSquare className="w-4 h-4 text-amber-500" />
              ) : (
                <Square className="w-4 h-4 text-slate-400" />
              )}
              {sortedTasks.length > 0 && sortedTasks.every(t => selectedTaskIds.includes(t.id)) ? 'Deselect All' : 'Select All Visible'}
            </button>
            <span className="text-xs text-slate-300 font-medium">
              <strong className="text-amber-500 font-bold">{selectedTaskIds.length}</strong> of {sortedTasks.length} tasks selected
            </span>
          </div>

          {selectedTaskIds.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleBulkMarkComplete}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-xs text-white font-semibold rounded-xl flex items-center gap-1 transition-all cursor-pointer shadow-md shadow-emerald-600/10"
              >
                <CheckCircle className="w-3.5 h-3.5" /> Mark Complete
              </button>
              
              <button
                onClick={handleBulkMarkPending}
                className="px-3 py-1.5 bg-indigo-600/20 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-600/30 text-xs font-semibold rounded-xl flex items-center gap-1 transition-all cursor-pointer"
              >
                <Clock className="w-3.5 h-3.5" /> Mark Pending
              </button>

              {/* Bulk Re-tag section */}
              <div className="relative group">
                <button
                  type="button"
                  className="px-3 py-1.5 bg-slate-900/40 hover:bg-slate-900/60 border border-white/5 text-xs text-slate-300 font-semibold rounded-xl flex items-center gap-1 transition-all cursor-pointer"
                >
                  <Tag className="w-3.5 h-3.5" /> Re-tag <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>
                <div className="absolute right-0 bottom-full mb-1 w-40 bg-slate-900 border border-white/10 rounded-xl shadow-xl py-1 z-50 hidden group-hover:block hover:block">
                  <div className="px-2 py-1 text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Assign Tag</div>
                  <button
                    type="button"
                    onClick={() => handleBulkReTag('Work')}
                    className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-white/5 flex items-center gap-1.5 cursor-pointer"
                  >
                    💼 Work
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBulkReTag('Study')}
                    className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-white/5 flex items-center gap-1.5 cursor-pointer"
                  >
                    🎓 Study
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBulkReTag('Personal')}
                    className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-white/5 flex items-center gap-1.5 cursor-pointer"
                  >
                    🏠 Personal
                  </button>
                  <div className="border-t border-white/5 my-1"></div>
                  <button
                    type="button"
                    onClick={() => handleBulkReTag(null)}
                    className="w-full text-left px-3 py-1.5 text-xs text-rose-400 hover:bg-white/5 flex items-center gap-1.5 cursor-pointer"
                  >
                    ❌ Clear Tags
                  </button>
                </div>
              </div>

              {/* Delete with inline confirm state */}
              <BulkDeleteButton onDelete={handleBulkDelete} count={selectedTaskIds.length} />
            </div>
          )}
        </GlassCard>
      )}

      {/* Task List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {sortedTasks.length === 0 ? (
          <GlassCard className="text-center py-12 border-dashed border-white/5">
            <p className="text-slate-400 text-sm font-medium">No tasks found matching your filters. Great job!</p>
            <button
              onClick={() => {
                setSearch('');
                setSelectedPriority('all');
                setSelectedEnergy('all');
                setSelectedStatus('all');
                setQuickFilter('all');
              }}
              className="mt-3 inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
            >
              Reset Filters
            </button>
          </GlassCard>
        ) : (
          sortedTasks.map((task) => {
            const urgency = getUrgencyScore(task);
            const dueStatus = getDueStatus(task);
            
            const isOverdue = dueStatus === 'overdue';
            const isDueSoon = dueStatus === 'due-soon';
            const isUrgent = (urgency >= 85 || isOverdue) && task.status !== 'completed';

            const progressPercent = task.status === 'completed'
              ? 100
              : (task.subtasks && task.subtasks.length > 0 
                ? Math.round((task.subtasks.filter(sb => sb.completed).length / task.subtasks.length) * 100) 
                : 0);

            // Render Editing Form inline for this specific task
            if (editingTaskId === task.id) {
              return (
                <GlassCard key={task.id} className="border-indigo-500/30 p-5 space-y-4 animate-fadeIn">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-white/5">
                    <h4 className="text-sm font-bold text-indigo-500 dark:text-indigo-400 font-display flex items-center gap-1.5">
                      <Edit3 className="w-4 h-4" /> Edit Smart Task
                    </h4>
                    <button 
                      type="button" 
                      onClick={() => setEditingTaskId(null)}
                      className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white text-xs cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">Task Title</label>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          required
                          className="w-full px-3 py-1.5 bg-white dark:bg-slate-950/40 border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">Deadline</label>
                        <input
                          type="datetime-local"
                          value={editDeadline}
                          onChange={(e) => setEditDeadline(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white dark:bg-slate-950/40 border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 [color-scheme:light] dark:[color-scheme:dark]"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">Description</label>
                      <textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        rows={2}
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-950/40 border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">Categorical Tags</label>
                      <div className="flex flex-wrap gap-2">
                        {['Work', 'Study', 'Personal'].map((tag) => {
                          const isSelected = editTags.includes(tag);
                          return (
                            <button
                              type="button"
                              key={tag}
                              onClick={() => {
                                if (isSelected) {
                                  setEditTags(editTags.filter(t => t !== tag));
                                } else {
                                  setEditTags([...editTags, tag]);
                                }
                              }}
                              className={`px-2.5 py-1 text-[11px] font-medium rounded-lg border flex items-center gap-1 cursor-pointer transition-all ${
                                isSelected
                                  ? 'bg-indigo-600 text-white border-indigo-500'
                                  : 'bg-white dark:bg-slate-950/40 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
                              }`}
                            >
                              <Tag className="w-2.5 h-2.5" />
                              {tag}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1 flex flex-col">
                        <label className="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider mb-1">Priority</label>
                        <CustomDropdown
                          value={editPriority}
                          onChange={setEditPriority}
                          options={priorityFormOptions}
                          className="w-full animate-fadeIn"
                        />
                      </div>

                      <div className="space-y-1 flex flex-col">
                        <label className="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider mb-1">Energy Required</label>
                        <CustomDropdown
                          value={editEnergy}
                          onChange={setEditEnergy}
                          options={energyFormOptions}
                          className="w-full animate-fadeIn"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">Est. Duration (Min)</label>
                        <input
                          type="number"
                          value={editDuration}
                          onChange={(e) => setEditDuration(Number(e.target.value))}
                          min={5}
                          step={5}
                          className="w-full px-2 py-1.5 bg-white dark:bg-slate-950/40 border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setEditingTaskId(null)}
                        className="px-3 py-1.5 bg-slate-100 dark:bg-slate-950/30 border border-slate-200 dark:border-white/5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-lg transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(task.id)}
                        className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-xs text-white font-semibold rounded-lg transition-all cursor-pointer shadow-md shadow-indigo-600/20"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </GlassCard>
              );
            }

            // Decide styling class based on urgency or "Due Soon" approaching status
            let cardStyle = 'border-slate-200 dark:border-white/10 bg-slate-950/10 dark:bg-white/5';
            if (task.status !== 'completed') {
              if (isOverdue) {
                cardStyle = 'animate-urgency-pulse border-rose-500/30 bg-rose-950/10 dark:bg-rose-950/5';
              } else if (isDueSoon) {
                cardStyle = 'animate-due-soon-pulse border-amber-500/30 bg-amber-950/10 dark:bg-amber-950/5';
              }
            }

            const isSelected = selectedTaskIds.includes(task.id);
            const bulkStyle = isBulkMode && isSelected 
              ? 'border-amber-500/60 dark:border-amber-500/60 bg-amber-500/10 dark:bg-amber-500/5 ring-1 ring-amber-500/20 shadow-lg shadow-amber-500/5' 
              : '';

            return (
              <GlassCard 
                key={task.id} 
                className={`transition-all duration-300 relative overflow-hidden ${cardStyle} ${bulkStyle}`}
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0 flex-grow">
                    {isBulkMode && (
                      <button
                        onClick={() => {
                          if (isSelected) {
                            setSelectedTaskIds(selectedTaskIds.filter(id => id !== task.id));
                          } else {
                            setSelectedTaskIds([...selectedTaskIds, task.id]);
                          }
                        }}
                        className="mt-1 flex-shrink-0 text-amber-500 hover:text-amber-400 transition-colors cursor-pointer mr-1"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 text-amber-500 animate-scaleIn" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-400 dark:text-white/20" />
                        )}
                      </button>
                    )}

                    <button
                      onClick={() => handleToggleTaskStatus(task)}
                      className="mt-1 flex-shrink-0 text-slate-400 hover:text-indigo-400 transition-colors cursor-pointer"
                    >
                      {task.status === 'completed' ? (
                        <CheckCircle className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-slate-300 dark:border-white/30 hover:border-indigo-400 flex items-center justify-center transition-all"></div>
                      )}
                    </button>

                    <div className="space-y-1 min-w-0 flex-grow">
                      <div className="flex flex-wrap gap-2 items-center">
                        <h4 className={`font-semibold font-display text-sm md:text-base leading-tight ${
                          task.status === 'completed' ? 'text-slate-500 line-through' : 'text-theme-heading'
                        }`}>
                          {task.title}
                        </h4>
                        
                        {task.status !== 'completed' && (
                          <>
                            {isOverdue && (
                              <span className="px-1.5 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/20 text-[10px] font-mono text-rose-400 flex items-center gap-1 animate-pulse">
                                <AlertTriangle className="w-2.5 h-2.5" /> OVERDUE
                              </span>
                            )}
                            {isDueSoon && (
                              <span className="px-1.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-[10px] font-mono text-amber-500 dark:text-amber-400 flex items-center gap-1 animate-pulse">
                                <Clock className="w-2.5 h-2.5" /> DUE SOON
                              </span>
                            )}
                            {!isOverdue && !isDueSoon && isUrgent && (
                              <span className="px-1.5 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/20 text-[10px] font-mono text-rose-400 flex items-center gap-1 animate-pulse">
                                <AlertCircle className="w-2.5 h-2.5" /> URGENT
                              </span>
                            )}
                          </>
                        )}
                      </div>
                      
                      <p className={`text-xs ${
                        task.status === 'completed' ? 'text-slate-500' : 'text-theme-text'
                      }`}>
                        {task.description || 'No description provided.'}
                      </p>

                      {task.aiPriorityExplanation && (
                        <div className="mt-2.5 p-3 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 text-xs text-indigo-600 dark:text-indigo-400 leading-relaxed flex items-start gap-2 max-w-xl">
                          <span className="text-sm shrink-0 leading-none">🧠</span>
                          <div>
                            <span className="font-semibold block text-[10px] uppercase tracking-wider text-indigo-500 mb-0.5">AI Strategic Assessment</span>
                            <span>{task.aiPriorityExplanation}</span>
                          </div>
                        </div>
                      )}

                      {/* Chips/Badges */}
                      <div className="flex flex-wrap gap-1.5 pt-2">
                        <span className={`px-2 py-0.5 rounded-full border text-[9px] font-mono capitalize ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                        {task.tags && task.tags.map((tag) => (
                          <span key={tag} className="px-2 py-0.5 rounded-full border border-indigo-500/20 bg-indigo-500/10 text-[9px] font-mono text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                            <Tag className="w-2.5 h-2.5" /> {tag}
                          </span>
                        ))}
                        <span className="px-2 py-0.5 rounded-full border border-slate-200 dark:border-white/5 bg-slate-950/10 dark:bg-slate-950/40 text-[9px] font-mono text-theme-text flex items-center gap-1">
                          <Battery className="w-2.5 h-2.5" /> {task.energyRequired}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full border text-[9px] font-mono flex items-center gap-1 ${
                          isOverdue ? 'border-rose-500/20 bg-rose-500/5 text-rose-400' :
                          isDueSoon ? 'border-amber-500/20 bg-amber-500/5 text-amber-500 dark:text-amber-400' :
                          'border-slate-200 dark:border-white/5 bg-slate-950/10 dark:bg-slate-950/40 text-theme-text'
                        }`}>
                          <Calendar className="w-2.5 h-2.5" /> {new Date(task.deadline).toLocaleString(undefined, {
                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}
                        </span>
                        <span className="px-2 py-0.5 rounded-full border border-slate-200 dark:border-white/5 bg-slate-950/10 dark:bg-slate-950/40 text-[9px] font-mono text-theme-text flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" /> {task.estimatedDuration}m
                          {task.aiPredictedDuration && (
                            <span className="text-indigo-600 dark:text-indigo-400 font-semibold ml-1">
                              (AI: {task.aiPredictedDuration}m)
                            </span>
                          )}
                        </span>
                        {task.procrastinationRisk && (
                          <span className={`px-2 py-0.5 rounded-full border text-[9px] font-mono uppercase ${
                            task.procrastinationRisk === 'high' ? 'border-rose-500/20 bg-rose-500/5 text-rose-400' :
                            task.procrastinationRisk === 'medium' ? 'border-amber-500/20 bg-amber-500/5 text-amber-400' :
                            'border-emerald-500/20 bg-emerald-500/5 text-emerald-400'
                          }`}>
                            Risk: {task.procrastinationRisk}
                          </span>
                        )}
                        {task.aiPriorityScore !== undefined && (
                          <span className="px-2 py-0.5 rounded-full border border-indigo-500/20 bg-indigo-500/5 text-[9px] font-mono text-indigo-600 dark:text-indigo-400 flex items-center gap-1 font-semibold">
                            <Sparkles className="w-2.5 h-2.5" /> AI Score: {task.aiPriorityScore}/100
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-start shrink-0">
                    {task.status !== 'completed' && (
                      <button
                        onClick={() => handleDecomposeTask(task)}
                        disabled={decomposingTaskId === task.id}
                        className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all disabled:opacity-50"
                        title="Analyze and decompose using AI"
                      >
                        <Zap className="w-3.5 h-3.5" /> 
                        {decomposingTaskId === task.id ? '...' : 'AI Breakdown'}
                      </button>
                    )}
                    <button
                      onClick={() => startEditing(task)}
                      className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-950/20 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 border border-slate-200 dark:border-white/5 hover:border-indigo-300 dark:hover:border-indigo-500/20 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition-all"
                      title="Edit task metadata"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteTask(task.id)}
                      className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-950/20 hover:bg-rose-50 dark:hover:bg-rose-500/10 border border-slate-200 dark:border-white/5 hover:border-rose-300 dark:hover:border-rose-500/20 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer transition-all"
                      title="Delete task"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Subtask Section */}
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 font-display flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Subtask Checklist
                    </span>
                    {(task.subtasks && task.subtasks.length > 0) ? (
                      <span className="text-[10px] font-mono text-slate-600 dark:text-slate-400">{progressPercent}% complete</span>
                    ) : null}
                  </div>

                  {/* Progress Bar */}
                  {task.subtasks && task.subtasks.length > 0 && (
                    <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-950/40 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                      ></div>
                    </div>
                  )}

                  {/* Subtask List */}
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
                    {task.subtasks && task.subtasks.map((sub) => (
                      <div 
                        key={sub.id} 
                        className="p-2 bg-slate-100 dark:bg-slate-950/20 hover:bg-slate-200 dark:hover:bg-slate-950/40 border border-slate-200 dark:border-white/5 rounded-xl flex items-center justify-between gap-2 text-xs transition-all group/sub text-slate-800 dark:text-slate-200"
                      >
                        <div 
                          onClick={() => toggleSubtask(task, sub.id)}
                          className="flex items-center gap-2 min-w-0 flex-grow cursor-pointer"
                        >
                          <span className="text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 flex-shrink-0 transition-colors">
                            {sub.completed ? (
                              <CheckSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <Square className="w-3.5 h-3.5 text-slate-400 dark:text-white/30 hover:text-indigo-500" />
                            )}
                          </span>
                          <span className={`truncate ${sub.completed ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-800 dark:text-slate-200'}`}>
                            {sub.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {sub.estimatedMinutes && (
                            <span className="text-[9px] font-mono text-slate-500 dark:text-slate-400">{sub.estimatedMinutes}m</span>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const updated = task.subtasks.filter(s => s.id !== sub.id);
                              onUpdateTask(task.id, { subtasks: updated });
                            }}
                            className="opacity-0 group-hover/sub:opacity-100 p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-500/10 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition-all cursor-pointer"
                            title="Delete subtask"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add manual subtask inline */}
                  <div className="flex gap-2 pt-1">
                    <input
                      type="text"
                      value={newSubtaskTitle[task.id] || ''}
                      onChange={(e) => setNewSubtaskTitle(prev => ({ ...prev, [task.id]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddSubtask(task);
                        }
                      }}
                      placeholder="➕ Add custom checklist item..."
                      className="flex-grow px-3 py-1.5 bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-white/5 rounded-lg text-xs text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <button
                      onClick={() => handleAddSubtask(task)}
                      className="px-3 py-1.5 bg-slate-100 dark:bg-slate-950/20 hover:bg-indigo-50 dark:hover:bg-indigo-600/20 border border-slate-200 dark:border-white/5 hover:border-indigo-300 dark:hover:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-semibold cursor-pointer transition-all shrink-0"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </GlassCard>
            );
          })
        )}
      </div>

      {/* Collapsible Completed Tasks Archive */}
      {tasks.filter(t => t.status === 'completed').length > 0 && (
        <GlassCard className="p-4 border-emerald-500/10 dark:border-emerald-500/5 hover:border-emerald-500/25 transition-all">
          <button
            onClick={() => setShowCompletedArchive(!showCompletedArchive)}
            className="w-full flex items-center justify-between font-semibold text-sm text-slate-800 dark:text-slate-200 cursor-pointer py-1 group"
          >
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CheckCircle className="w-4 h-4" />
              </span>
              <span>Completed Tasks Archive</span>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                {tasks.filter(t => t.status === 'completed').length} Tasks Saved
              </span>
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-white transition-transform duration-200 ${showCompletedArchive ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {showCompletedArchive && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden mt-3 pt-3 border-t border-slate-200 dark:border-white/5 space-y-3"
              >
                {/* Scrollable list */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[350px] overflow-y-auto pr-1">
                  {tasks.filter(t => t.status === 'completed').map(task => (
                    <div
                      key={task.id}
                      className="p-3 bg-slate-50 dark:bg-slate-950/25 border border-slate-200/60 dark:border-white/5 rounded-xl flex items-center justify-between gap-3 hover:bg-slate-100 dark:hover:bg-slate-950/45 transition-all"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <button
                          onClick={() => handleToggleTaskStatus(task)}
                          className="flex-shrink-0 text-emerald-500 hover:text-slate-400 transition-colors cursor-pointer"
                          title="Mark task as active"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <div className="truncate">
                          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 line-through truncate block">
                            {task.title}
                          </span>
                          {task.completedAt && (
                            <span className="text-[9px] text-slate-400 font-mono block">
                              Completed: {new Date(task.completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          if (window.confirm('Delete this completed task permanently?')) {
                            onDeleteTask(task.id);
                          }
                        }}
                        className="p-1.5 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer shrink-0"
                        title="Delete permanently"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>
      )}

      {/* AI Priority & Urgency Advisor Modal */}
      <AnimatePresence>
        {showAdvisorModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!isPrioritizing) setShowAdvisorModal(false);
              }}
              className="absolute inset-0 bg-black/75 backdrop-blur-sm cursor-pointer"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 250 }}
              className="relative w-full max-w-2xl max-h-[85vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-slate-800 dark:text-slate-100 z-10"
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-emerald-500/10 to-teal-500/10 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                    <Brain className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold font-display text-slate-900 dark:text-white text-lg">AI Priority & Urgency Advisor</h3>
                      {advisorData?.isLocal && (
                        <span className="px-1.5 py-0.5 text-[8px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold rounded-full font-mono uppercase tracking-wider">⚡ Local</span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">LANGCHAIN STRATEGIC TASK ASSESSMENT</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAdvisorModal(false)}
                  disabled={isPrioritizing}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable Content Container */}
              <div className="p-6 overflow-y-auto space-y-6 flex-grow">
                {isPrioritizing ? (
                  /* Loading State */
                  <div className="py-12 flex flex-col items-center justify-center space-y-6 text-center">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin"></div>
                      <Brain className="w-8 h-8 text-indigo-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">Analyzing tasks with LangChain...</p>
                      <p className="text-xs text-slate-400 max-w-sm">Evaluating due dates, volume of work, and mental energy levels to generate tailored urgencies.</p>
                    </div>
                  </div>
                ) : advisorError ? (
                  /* Error State */
                  <div className="p-4 bg-rose-500/5 border border-rose-500/20 rounded-2xl flex items-start gap-3">
                    <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-rose-500">Analysis Failed</p>
                      <p className="text-xs text-rose-400/90 leading-relaxed">{advisorError}</p>
                      <button
                        onClick={handleRunPrioritization}
                        className="mt-2 px-3 py-1 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 rounded-lg text-[11px] font-semibold cursor-pointer transition-colors"
                      >
                        Try Again
                      </button>
                    </div>
                  </div>
                ) : !advisorData ? (
                  /* Initial State (If auto-run was canceled or failed) */
                  <div className="py-12 text-center space-y-4">
                    <Sparkles className="w-12 h-12 text-indigo-400 mx-auto animate-bounce" />
                    <div className="space-y-1 max-w-md mx-auto">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">Optimize Your Priority Queue</p>
                      <p className="text-xs text-slate-400">Run the AI analysis to get exact strategic recommendations, custom urgency alerts, and calculated mental load scores.</p>
                    </div>
                    <button
                      onClick={handleRunPrioritization}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 mx-auto shadow-lg shadow-indigo-600/25 cursor-pointer transition-all"
                    >
                      <Brain className="w-4 h-4" /> Run AI Assessment
                    </button>
                  </div>
                ) : (
                  /* Results View */
                  <div className="space-y-6">
                    {/* Global Recommendation Card */}
                    {advisorData.globalRecommendation && (
                      <div className="p-4 bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 rounded-2xl space-y-1.5">
                        <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block font-mono">💡 AI Strategic Advice</span>
                        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                          {advisorData.globalRecommendation}
                        </p>
                      </div>
                    )}

                    {/* Alerts/Notifications section */}
                    {advisorData.alerts && advisorData.alerts.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">⚠️ High Urgency Alerts</h4>
                        <div className="space-y-2">
                          {advisorData.alerts.map((alert: any, idx: number) => (
                            <div
                              key={idx}
                              className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                                alert.type === 'critical'
                                  ? 'bg-rose-500/5 border-rose-500/20 text-rose-500'
                                  : 'bg-amber-500/5 border-amber-500/20 text-amber-500'
                              }`}
                            >
                              <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
                              <p className="text-xs leading-relaxed font-semibold">
                                {alert.message}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Task Breakdown list */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">🔄 Recommended Adjustments</h4>
                      <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                        {advisorData.prioritizedTasks.map((pt: any) => {
                          const origTask = tasks.find(t => t.id === pt.id);
                          if (!origTask) return null;

                          return (
                            <div key={pt.id} className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 space-y-2.5 hover:border-indigo-500/20 transition-colors">
                              <div className="flex items-start justify-between gap-4">
                                <div>
                                  <span className="text-xs font-semibold text-slate-900 dark:text-white line-clamp-1">{origTask.title}</span>
                                  <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">{origTask.description || 'No description'}</p>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="px-2 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-500 text-[10px] font-mono font-bold">
                                    AI Score: {pt.aiPriorityScore}/100
                                  </span>
                                </div>
                              </div>

                              {/* Progress bar representing urgency score */}
                              <div className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    pt.aiPriorityScore >= 80 ? 'bg-rose-500' :
                                    pt.aiPriorityScore >= 60 ? 'bg-amber-500' :
                                    pt.aiPriorityScore >= 40 ? 'bg-indigo-500' : 'bg-emerald-500'
                                  }`}
                                  style={{ width: `${pt.aiPriorityScore}%` }}
                                ></div>
                              </div>

                              <div className="flex flex-wrap gap-2 items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/60 text-[11px]">
                                <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                                  <span>Priority:</span>
                                  <span className="capitalize line-through text-[10px]">{origTask.priority}</span>
                                  <span className="text-emerald-500">➔</span>
                                  <span className="font-bold text-emerald-500 capitalize">{pt.suggestedPriority}</span>
                                </div>
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                                  pt.urgencyStatus === 'immediate' ? 'bg-rose-500/10 text-rose-500' :
                                  pt.urgencyStatus === 'high' ? 'bg-amber-500/10 text-amber-500' : 'bg-slate-500/10 text-slate-400'
                                }`}>
                                  {pt.urgencyStatus}
                                </span>
                              </div>

                              <p className="text-[11px] text-slate-500 dark:text-slate-400 italic bg-white dark:bg-slate-950/20 p-2 rounded-lg border border-slate-100 dark:border-slate-800/40">
                                "{pt.explanation}"
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              {!isPrioritizing && advisorData && (
                <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
                  <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={overwriteManual}
                      onChange={(e) => setOverwriteManual(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-white dark:bg-slate-950"
                    />
                    <span>Automatically overwrite manual priorities with AI suggested levels</span>
                  </label>

                  <div className="flex items-center gap-2 justify-end">
                    <button
                      onClick={() => setShowAdvisorModal(false)}
                      className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold cursor-pointer transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleApplyPriorities}
                      className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold rounded-xl text-xs shadow-lg shadow-emerald-600/20 cursor-pointer transition-all"
                    >
                      Apply AI Priorities
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
