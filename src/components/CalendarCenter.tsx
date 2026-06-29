import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar as CalendarIcon, 
  CalendarDays, 
  CalendarRange, 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Check, 
  Trash2, 
  RefreshCw, 
  AlertCircle, 
  Sparkles,
  Link,
  CheckCircle2,
  HelpCircle,
  X,
  Tag,
  Gauge
} from 'lucide-react';
import { Task, TaskStatus, Priority, EnergyLevel } from '../types';
import GlassCard from './GlassCard';

// Google Calendar Event simple structure
interface GoogleEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  isGoogle?: boolean;
}

interface CalendarCenterProps {
  tasks: Task[];
  onAddTask: (task: any) => void;
  onUpdateTask?: (task: Task) => void;
  onDeleteTask?: (taskId: string) => void;
  theme: 'light' | 'dark';
  googleToken: string | null;
  setGoogleToken: (token: string | null) => void;
  onLinkGoogleCalendar: () => Promise<void>;
}

type CalendarView = 'year' | 'month' | 'week' | 'day';

export default function CalendarCenter({
  tasks,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  theme,
  googleToken,
  setGoogleToken,
  onLinkGoogleCalendar,
}: CalendarCenterProps) {
  // Current active date reference
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date()); // Dynamic current date matching system clock
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [view, setView] = useState<CalendarView>('month');
  const [newEventTitle, setNewEventTitle] = useState('');
  const [googleEvents, setGoogleEvents] = useState<GoogleEvent[]>([]);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  // Modal states for interactive calendar block clicks
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalDesc, setModalDesc] = useState('');
  const [modalStatus, setModalStatus] = useState<TaskStatus>('todo');
  const [modalPriority, setModalPriority] = useState<Priority>('medium');
  const [modalEnergy, setModalEnergy] = useState<EnergyLevel>('admin');
  const [modalDuration, setModalDuration] = useState<number>(30);
  const [modalTags, setModalTags] = useState<string>('');
  const [modalTime, setModalTime] = useState<string>('09:00');

  const activeYear = currentDate.getFullYear();
  const activeMonth = currentDate.getMonth();

  // Load Google Calendar Events if token exists
  useEffect(() => {
    if (googleToken) {
      fetchGoogleEvents();
    } else {
      setGoogleEvents([]);
    }
  }, [googleToken, currentDate]);

  const fetchGoogleEvents = async () => {
    if (!googleToken) return;
    setLoadingGoogle(true);
    setGoogleError(null);
    try {
      // Fetch for active year/month range
      const startOfMonth = new Date(activeYear, activeMonth - 1, 1).toISOString();
      const endOfMonth = new Date(activeYear, activeMonth + 2, 0).toISOString();
      
      const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(startOfMonth)}&timeMax=${encodeURIComponent(endOfMonth)}&singleEvents=true&orderBy=startTime`;
      
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${googleToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const formatted = (data.items || []).map((item: any) => ({
          id: item.id,
          summary: item.summary || '(No Title)',
          description: item.description,
          start: item.start,
          end: item.end,
          isGoogle: true
        }));
        setGoogleEvents(formatted);
      } else {
        if (response.status === 401) {
          // Token expired, clear it
          setGoogleToken(null);
          setGoogleError('Google Calendar session expired. Please link again.');
        } else {
          setGoogleError('Failed to fetch Google Calendar events.');
        }
      }
    } catch (err) {
      console.error(err);
      setGoogleError('Network error connecting to Google Calendar.');
    } finally {
      setLoadingGoogle(false);
    }
  };

  const handleCreateGoogleEvent = async (title: string, date: Date, timeStr: string = '09:00') => {
    if (!googleToken) return;
    try {
      const [hours, minutes] = timeStr.split(':').map(Number);
      const startDateTime = new Date(date);
      startDateTime.setHours(hours || 9, minutes || 0, 0, 0);
      const endDateTime = new Date(date);
      endDateTime.setHours(hours || 9, (minutes || 0) + 30, 0, 0);

      const eventBody = {
        summary: title,
        description: 'Created via Last-Minute Life Saver Calendar',
        start: { dateTime: startDateTime.toISOString() },
        end: { dateTime: endDateTime.toISOString() },
      };

      const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${googleToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventBody),
      });

      if (response.ok) {
        fetchGoogleEvents();
      }
    } catch (err) {
      console.error('Error creating Google Calendar event:', err);
    }
  };

  // Combine Tasks & Google Events
  const allEvents = useMemo(() => {
    const localEvents = tasks.map(task => {
      const taskDate = task.deadline ? new Date(task.deadline) : new Date(task.createdAt);
      return {
        id: task.id,
        summary: task.title,
        description: task.description,
        start: { dateTime: taskDate.toISOString() },
        end: { dateTime: new Date(taskDate.getTime() + (task.estimatedDuration || 30) * 60000).toISOString() },
        taskRef: task,
        isGoogle: false
      };
    });

    return [...localEvents, ...googleEvents];
  }, [tasks, googleEvents]);

  // Group events by YYYY-MM-DD
  const eventsByDate = useMemo(() => {
    const groups: { [key: string]: typeof allEvents } = {};
    allEvents.forEach(evt => {
      const dateStr = evt.start.dateTime 
        ? evt.start.dateTime.split('T')[0] 
        : evt.start.date || '';
      if (dateStr) {
        if (!groups[dateStr]) groups[dateStr] = [];
        groups[dateStr].push(evt);
      }
    });
    return groups;
  }, [allEvents]);

  // Month navigation helpers
  const handlePrev = () => {
    if (view === 'year') {
      setCurrentDate(prev => new Date(prev.getFullYear() - 1, prev.getMonth(), 1));
    } else if (view === 'month') {
      setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    } else if (view === 'week') {
      setCurrentDate(prev => {
        const nextD = new Date(prev.getTime() - 7 * 24 * 60 * 60 * 1000);
        setSelectedDate(nextD);
        return nextD;
      });
    } else {
      setCurrentDate(prev => {
        const nextD = new Date(prev.getTime() - 24 * 60 * 60 * 1000);
        setSelectedDate(nextD);
        return nextD;
      });
    }
  };

  const handleNext = () => {
    if (view === 'year') {
      setCurrentDate(prev => new Date(prev.getFullYear() + 1, prev.getMonth(), 1));
    } else if (view === 'month') {
      setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    } else if (view === 'week') {
      setCurrentDate(prev => {
        const nextD = new Date(prev.getTime() + 7 * 24 * 60 * 60 * 1000);
        setSelectedDate(nextD);
        return nextD;
      });
    } else {
      setCurrentDate(prev => {
        const nextD = new Date(prev.getTime() + 24 * 60 * 60 * 1000);
        setSelectedDate(nextD);
        return nextD;
      });
    }
  };

  const handleToday = () => {
    const today = new Date(); // Dynamic current date matching system clock
    setCurrentDate(today);
    setSelectedDate(today);
  };

  // Add event/task handler
  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle.trim()) return;

    // Create deadline ISO string at 9:00 AM on the selected date
    const deadlineDate = new Date(selectedDate);
    deadlineDate.setHours(9, 0, 0, 0);

    const newTaskData = {
      title: newEventTitle,
      description: 'Quick task added from Calendar View',
      status: 'todo' as TaskStatus,
      priority: 'medium' as Priority,
      energyRequired: 'admin',
      deadline: deadlineDate.toISOString(),
      estimatedDuration: 30,
      subtasks: [],
      tags: ['Calendar-Quick'],
      contextTags: ['calendar']
    };

    onAddTask(newTaskData);

    // Sync to Google Calendar as well if linked!
    if (googleToken) {
      handleCreateGoogleEvent(newEventTitle, selectedDate);
    }

    setNewEventTitle('');
  };

  // Submission handler for interactive modal
  const handleModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalTitle.trim()) return;

    const deadlineDate = new Date(selectedDate);
    const [hours, minutes] = modalTime.split(':').map(Number);
    deadlineDate.setHours(hours || 9, minutes || 0, 0, 0);

    const newTaskData = {
      title: modalTitle.trim(),
      description: modalDesc.trim() || 'Added from Calendar Click',
      status: modalStatus,
      priority: modalPriority,
      energyRequired: modalEnergy,
      deadline: deadlineDate.toISOString(),
      estimatedDuration: modalDuration || 30,
      subtasks: [],
      tags: modalTags ? modalTags.split(',').map(t => t.trim()).filter(Boolean) : ['Calendar'],
      contextTags: ['calendar']
    };

    onAddTask(newTaskData);

    // Sync to Google Calendar if linked
    if (googleToken) {
      handleCreateGoogleEvent(modalTitle.trim(), selectedDate, modalTime);
    }

    // Reset states
    setModalTitle('');
    setModalDesc('');
    setModalStatus('todo');
    setModalPriority('medium');
    setModalEnergy('admin');
    setModalDuration(30);
    setModalTags('');
    setModalTime('09:00');
    setShowAddModal(false);
  };

  // Date helper formatter
  const formatDateString = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Week helper: get array of 7 dates for the week of currentDate
  const weekDates = useMemo(() => {
    const dates = [];
    const dayOfCurrent = currentDate.getDay();
    // Adjust so week starts on Monday (1) to Sunday (0)
    const mondayDiff = dayOfCurrent === 0 ? -6 : 1 - dayOfCurrent;
    const startOfWeek = new Date(currentDate.getTime() + mondayDiff * 24 * 60 * 60 * 1000);
    
    for (let i = 0; i < 7; i++) {
      dates.push(new Date(startOfWeek.getTime() + i * 24 * 60 * 60 * 1000));
    }
    return dates;
  }, [currentDate]);

  // Calendar View Rendering Functions
  const renderYearView = () => {
    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'
    ];

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-fade-in">
        {monthNames.map((name, mIdx) => {
          // Generate simplified calendar grid for mIdx month of activeYear
          const firstDay = new Date(activeYear, mIdx, 1).getDay();
          // Adjust first day offset for Monday-first layout
          const offset = firstDay === 0 ? 6 : firstDay - 1;
          const daysInMonth = new Date(activeYear, mIdx + 1, 0).getDate();
          
          const daysArray = Array.from({ length: offset }, (_, i) => null)
            .concat(Array.from({ length: daysInMonth }, (_, i) => i + 1));

          return (
            <GlassCard 
              key={name} 
              onClick={() => {
                setCurrentDate(new Date(activeYear, mIdx, 1));
                setView('month');
              }}
              className="p-4 hover:border-emerald-500/40 hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col h-fit"
            >
              <h4 className="text-sm font-bold text-center text-[var(--heading-text)] mb-2 font-display">
                {name}
              </h4>
              <div className="grid grid-cols-7 gap-1 text-[9px] text-center font-semibold uppercase text-slate-500 mb-1.5 font-mono">
                <span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span className="text-rose-500">S</span>
              </div>
              <div className="grid grid-cols-7 gap-1 text-[10px] text-center font-mono">
                {daysArray.map((day, dIdx) => {
                  if (day === null) return <span key={`empty-${dIdx}`}></span>;
                  const dateStr = `${activeYear}-${String(mIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const hasEvents = !!eventsByDate[dateStr];
                  const isSel = selectedDate.getDate() === day && selectedDate.getMonth() === mIdx && selectedDate.getFullYear() === activeYear;

                  return (
                    <span 
                      key={day} 
                      className={`p-0.5 rounded-md flex items-center justify-center relative ${
                        isSel 
                          ? 'bg-emerald-600 text-white font-bold' 
                          : hasEvents 
                            ? 'bg-emerald-600/15 text-emerald-500 font-semibold' 
                            : 'text-[var(--text-color)] opacity-70 hover:opacity-100 hover:bg-[var(--glass-highlight)]'
                      }`}
                    >
                      {day}
                      {hasEvents && !isSel && (
                        <span className="absolute bottom-0 w-1 h-1 bg-emerald-500 rounded-full"></span>
                      )}
                    </span>
                  );
                })}
              </div>
            </GlassCard>
          );
        })}
      </div>
    );
  };

  const renderMonthView = () => {
    // Standard Monthly View
    const firstDay = new Date(activeYear, activeMonth, 1).getDay();
    // Monday-first offset
    const offset = firstDay === 0 ? 6 : firstDay - 1;
    const daysInMonth = new Date(activeYear, activeMonth + 1, 0).getDate();
    
    // Previous month filler days
    const prevMonthDays = new Date(activeYear, activeMonth, 0).getDate();
    const fillerDays = Array.from({ length: offset }, (_, i) => {
      const dayNum = prevMonthDays - offset + i + 1;
      return { day: dayNum, monthOffset: -1 };
    });

    // Current month days
    const currentMonthDays = Array.from({ length: daysInMonth }, (_, i) => ({
      day: i + 1,
      monthOffset: 0
    }));

    // Next month filler days to complete 6 weeks (42 days grid)
    const remainingSlots = 42 - (fillerDays.length + currentMonthDays.length);
    const nextFillerDays = Array.from({ length: remainingSlots }, (_, i) => ({
      day: i + 1,
      monthOffset: 1
    }));

    const totalGridDays = [...fillerDays, ...currentMonthDays, ...nextFillerDays];

    return (
      <div className="space-y-4 animate-fade-in">
        {/* Weekly Header Days */}
        <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs uppercase tracking-wider text-slate-500 font-mono py-1">
          <span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span className="text-rose-500">S</span>
        </div>

        {/* 6x7 Calendar Grid */}
        <div className="grid grid-cols-7 gap-1.5 md:gap-2">
          {totalGridDays.map(({ day, monthOffset }, index) => {
            const gridYear = monthOffset === -1 && activeMonth === 0 ? activeYear - 1 : monthOffset === 1 && activeMonth === 11 ? activeYear + 1 : activeYear;
            const gridMonth = monthOffset === -1 ? (activeMonth === 0 ? 11 : activeMonth - 1) : monthOffset === 1 ? (activeMonth === 11 ? 0 : activeMonth + 1) : activeMonth;
            
            const dateStr = `${gridYear}-${String(gridMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayEvents = eventsByDate[dateStr] || [];
            
            const todayObj = new Date();
            const isToday = day === todayObj.getDate() && gridMonth === todayObj.getMonth() && gridYear === todayObj.getFullYear();
            const isSelected = selectedDate.getDate() === day && selectedDate.getMonth() === gridMonth && selectedDate.getFullYear() === gridYear;

            return (
              <GlassCard 
                key={index.toString()}
                onClick={() => {
                  const targetDate = new Date(gridYear, gridMonth, day);
                  setSelectedDate(targetDate);
                  setModalTime('09:00');
                  setShowAddModal(true);
                }}
                className={`min-h-[75px] md:min-h-[110px] p-1.5 md:p-2.5 flex flex-col justify-between transition-all duration-200 cursor-pointer border ${
                  isSelected 
                    ? 'border-emerald-500 shadow-md ring-1 ring-emerald-500/25 bg-emerald-500/5' 
                    : monthOffset !== 0
                      ? 'opacity-35 border-transparent'
                      : 'hover:border-[var(--glass-border-hover)] hover:bg-[var(--glass-highlight)]'
                }`}
              >
                {/* Day Number and status badge */}
                <div className="flex justify-between items-start">
                  <span className={`text-[10px] md:text-xs font-bold font-mono px-1.5 py-0.5 rounded-lg ${
                    isToday 
                      ? 'bg-rose-500 text-white font-bold shadow-sm' 
                      : isSelected 
                        ? 'text-emerald-500 bg-emerald-500/10' 
                        : 'text-[var(--text-color)] opacity-80'
                  }`}>
                    {day}
                  </span>
                  
                  {/* Subtle dots for mobile */}
                  <div className="flex gap-0.5 md:hidden">
                    {dayEvents.slice(0, 3).map((e, idx) => (
                      <span key={idx} className={`w-1.5 h-1.5 rounded-full ${e.isGoogle ? 'bg-indigo-500' : 'bg-emerald-500'}`} />
                    ))}
                  </div>
                </div>

                {/* Event list (desktop only) */}
                <div className="hidden md:flex flex-col gap-1 mt-2 flex-grow overflow-y-auto max-h-[70px] scrollbar-thin">
                  {dayEvents.map(evt => {
                    const isTask = !evt.isGoogle;
                    const isComp = isTask && evt.taskRef?.status === 'completed';

                    return (
                      <div 
                        key={evt.id} 
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent opening modal
                          if (isTask && onUpdateTask && evt.taskRef) {
                            onUpdateTask({
                              ...evt.taskRef,
                              status: evt.taskRef.status === 'completed' ? 'todo' : 'completed'
                            });
                          }
                        }}
                        className={`text-[9px] font-medium leading-none px-1.5 py-1 rounded-md truncate border ${
                          isGoogleEvent(evt)
                            ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                            : isComp
                              ? 'bg-slate-100/50 dark:bg-slate-900/40 text-slate-400 border-slate-200 dark:border-white/5 line-through'
                              : getPriorityClass(evt.taskRef?.priority)
                        }`}
                        title={evt.summary}
                      >
                        {isTask ? '• ' : '☁️ '}
                        {evt.summary}
                      </div>
                    );
                  })}
                </div>
              </GlassCard>
            );
          })}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    // Hourly range: 8 AM to 7 PM (12 hours)
    const hours = Array.from({ length: 12 }, (_, i) => i + 8);

    return (
      <div className="space-y-4 animate-fade-in overflow-x-auto">
        <div className="min-w-[650px] space-y-2">
          {/* Weekday columns header */}
          <div className="grid grid-cols-8 gap-2 pb-2 border-b border-slate-200 dark:border-white/5 text-center">
            {/* Hour spacer */}
            <div className="text-[10px] font-semibold text-slate-500 font-mono flex items-center justify-center">TIME</div>
            {weekDates.map((date, idx) => {
              const dateStr = formatDateString(date);
              const isToday = dateStr === formatDateString(new Date());
              const dayStr = date.toLocaleDateString('en-US', { weekday: 'short' });

              return (
                <div 
                  key={idx} 
                  onClick={() => {
                    setSelectedDate(date);
                    setModalTime('09:00');
                    setShowAddModal(true);
                  }}
                  className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                    isToday 
                      ? 'bg-rose-500/15 border border-rose-500/35 text-rose-500 font-bold' 
                      : selectedDate.toDateString() === date.toDateString()
                        ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-500'
                        : 'hover:bg-[var(--glass-highlight)]'
                  }`}
                >
                  <span className="text-[10px] block font-semibold uppercase text-slate-500">{dayStr}</span>
                  <span className="text-xs font-bold font-mono">{date.getDate()}</span>
                </div>
              );
            })}
          </div>

          {/* Hourly grid */}
          <div className="space-y-1 max-h-[480px] overflow-y-auto pr-1">
            {hours.map(hour => {
              const hourLabel = hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`;

              return (
                <div key={hour} className="grid grid-cols-8 gap-2 items-center min-h-[44px]">
                  {/* Time label */}
                  <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 text-right pr-2 font-mono">
                    {hourLabel}
                  </div>

                  {/* 7 column slots */}
                  {weekDates.map((date, dIdx) => {
                    const dateStr = formatDateString(date);
                    const dayEvents = eventsByDate[dateStr] || [];
                    
                    // Filter events occurring in this specific hour
                    const hourEvents = dayEvents.filter(evt => {
                      if (!evt.start.dateTime) return false;
                      const evtDate = new Date(evt.start.dateTime);
                      return evtDate.getHours() === hour;
                    });

                    return (
                      <div 
                        key={dIdx} 
                        onClick={() => {
                          setSelectedDate(date);
                          const formattedHour = hour < 10 ? `0${hour}:00` : `${hour}:00`;
                          setModalTime(formattedHour);
                          setShowAddModal(true);
                        }}
                        className="bg-slate-50/50 dark:bg-slate-950/15 border border-dashed border-slate-100 dark:border-white/5 rounded-lg p-1 min-h-[42px] flex flex-col gap-1 justify-center relative cursor-pointer hover:bg-slate-100/10 dark:hover:bg-white/5 transition-all"
                      >
                        {hourEvents.map(evt => {
                          const isTask = !evt.isGoogle;
                          const isComp = isTask && evt.taskRef?.status === 'completed';

                          return (
                            <div 
                              key={evt.id} 
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDate(date);
                                if (isTask && onUpdateTask && evt.taskRef) {
                                  onUpdateTask({
                                    ...evt.taskRef,
                                    status: evt.taskRef.status === 'completed' ? 'todo' : 'completed'
                                  });
                                }
                              }}
                              className={`text-[9px] font-semibold leading-tight px-1 py-0.5 rounded-md truncate border cursor-pointer hover:scale-[1.02] transition-transform ${
                                evt.isGoogle
                                  ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30 shadow-sm'
                                  : isComp
                                    ? 'bg-slate-100 dark:bg-slate-900/40 text-slate-400 line-through border-slate-200 dark:border-white/5'
                                    : getPriorityClass(evt.taskRef?.priority)
                              }`}
                              title={evt.summary}
                            >
                              {evt.summary}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    // Detailed hourly layout for selectedDate
    const hours = Array.from({ length: 15 }, (_, i) => i + 7); // 7 AM to 9 PM
    const dateStr = formatDateString(selectedDate);
    const dayEvents = eventsByDate[dateStr] || [];

    const formattedHeaderStr = selectedDate.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });

    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex justify-between items-center bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 p-3 rounded-2xl">
          <span className="text-xs md:text-sm font-bold text-theme-heading font-display">{formattedHeaderStr}</span>
          <span className="text-[10px] font-semibold font-mono uppercase text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
            {dayEvents.length} Events
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Left Side: Timeline (8 cols) */}
          <div className="md:col-span-8 bg-slate-50/20 dark:bg-slate-950/5 border border-slate-200 dark:border-white/5 rounded-2xl p-4 max-h-[480px] overflow-y-auto space-y-1">
            {hours.map(hour => {
              const hourLabel = hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`;
              const hourEvents = dayEvents.filter(evt => {
                if (!evt.start.dateTime) return false;
                const evtDate = new Date(evt.start.dateTime);
                return evtDate.getHours() === hour;
              });

              return (
                <div key={hour} className="flex gap-4 items-start min-h-[52px]">
                  {/* Timeline label */}
                  <div className="w-14 text-[10px] font-bold text-slate-400 dark:text-slate-500 text-right pt-1 font-mono shrink-0">
                    {hourLabel}
                  </div>
                  {/* Event slot block */}
                  <div 
                    onClick={() => {
                      const formattedHour = hour < 10 ? `0${hour}:00` : `${hour}:00`;
                      setModalTime(formattedHour);
                      setShowAddModal(true);
                    }}
                    className="flex-1 bg-slate-50/40 dark:bg-slate-950/20 hover:bg-slate-100/30 dark:hover:bg-white/5 border border-slate-100 dark:border-white/5 rounded-xl p-1.5 min-h-[44px] flex flex-col gap-1.5 justify-center relative cursor-pointer transition-all"
                  >
                    {hourEvents.length === 0 ? (
                      <span className="text-[9px] text-slate-400 dark:text-slate-500 opacity-50 pl-2">No Scheduled Task</span>
                    ) : (
                      hourEvents.map(evt => {
                        const isTask = !evt.isGoogle;
                        const isComp = isTask && evt.taskRef?.status === 'completed';

                        return (
                          <div 
                            key={evt.id} 
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent opening modal
                            }}
                            className={`flex justify-between items-center text-[11px] font-semibold p-2 rounded-lg border ${
                              evt.isGoogle
                                ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 shadow-sm'
                                : isComp
                                  ? 'bg-slate-100 dark:bg-slate-900/40 text-slate-400 line-through border-slate-200 dark:border-white/5'
                                  : getPriorityClass(evt.taskRef?.priority)
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span>{evt.isGoogle ? '☁️' : '•'}</span>
                              <span className="truncate">{evt.summary}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[9px] font-mono opacity-80">
                                {evt.isGoogle ? 'Google Calendar' : 'Local Task'}
                              </span>
                              {!evt.isGoogle && onUpdateTask && (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const t = evt.taskRef;
                                    if (t) {
                                      onUpdateTask({
                                        ...t,
                                        status: t.status === 'completed' ? 'todo' : 'completed'
                                      });
                                    }
                                  }}
                                  className="p-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded-md cursor-pointer transition-colors"
                                  title={evt.taskRef?.status === 'completed' ? "Mark Incomplete" : "Mark Completed"}
                                >
                                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                                </button>
                              )}
                              {!evt.isGoogle && onDeleteTask && (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (window.confirm(`Are you sure you want to delete "${evt.summary}"?`)) {
                                      onDeleteTask(evt.id);
                                    }
                                  }}
                                  className="p-1 hover:bg-rose-500/10 rounded-md cursor-pointer text-rose-500 transition-colors"
                                  title="Delete event"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Side: Quick view list for that day (4 cols) */}
          <div className="md:col-span-4 space-y-4">
            <GlassCard className="p-4 space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-theme-subtle">
                Agenda List
              </h4>
              <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                {dayEvents.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-500 dark:text-slate-400">
                    <p>Clean slate for today!</p>
                    <p className="text-[10px] opacity-75 mt-0.5">Ready to schedule high-priority tasks?</p>
                  </div>
                ) : (
                  dayEvents.map(evt => {
                    const isTask = !evt.isGoogle;
                    const isComp = isTask && evt.taskRef?.status === 'completed';

                    return (
                      <div 
                        key={evt.id} 
                        className={`p-3 rounded-xl border flex flex-col gap-1 ${
                          evt.isGoogle
                            ? 'bg-indigo-500/5 text-indigo-400 border-indigo-500/10'
                            : isComp
                              ? 'bg-slate-100 dark:bg-slate-900/20 text-slate-400 line-through border-slate-200 dark:border-white/5'
                              : getPriorityClass(evt.taskRef?.priority)
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <span className="font-bold text-xs line-clamp-1">{evt.summary}</span>
                          <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded-full ${
                            evt.isGoogle ? 'bg-indigo-500/15' : 'bg-emerald-500/15 text-emerald-500'
                          }`}>
                            {evt.isGoogle ? 'G-Cal' : 'Task'}
                          </span>
                        </div>
                        {evt.description && (
                          <p className="text-[10px] opacity-85 leading-snug line-clamp-2">{evt.description}</p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Tab/Navigation Header */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-slate-50/40 dark:bg-slate-950/15 border border-slate-200 dark:border-white/5 p-4 rounded-3xl backdrop-blur-md">
        {/* Nav Month Label */}
        <div className="flex items-center gap-3">
          <button 
            onClick={handlePrev}
            className="p-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl cursor-pointer text-[var(--text-color)] transition-all"
            title="Previous"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <div className="text-center md:text-left min-w-[120px]">
            <h2 className="text-sm md:text-base font-black tracking-tight text-[var(--heading-text)] uppercase font-display leading-none">
              {view === 'year' 
                ? activeYear 
                : currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h2>
            <span className="text-[9px] font-bold text-slate-500 uppercase font-mono tracking-widest mt-0.5 block">
              {view} view
            </span>
          </div>

          <button 
            onClick={handleNext}
            className="p-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl cursor-pointer text-[var(--text-color)] transition-all"
            title="Next"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Calendar View Selector tabs with Icons as requested */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-900/50 p-1 rounded-2xl border border-slate-200 dark:border-white/5 self-center">
          <button
            onClick={() => setView('year')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              view === 'year'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-500 hover:text-[var(--text-color)]'
            }`}
            title="Year View"
          >
            <CalendarRange className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Year</span>
          </button>
          <button
            onClick={() => setView('month')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              view === 'month'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-500 hover:text-[var(--text-color)]'
            }`}
            title="Month View"
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Month</span>
          </button>
          <button
            onClick={() => setView('week')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              view === 'week'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-500 hover:text-[var(--text-color)]'
            }`}
            title="Week View"
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Week</span>
          </button>
          <button
            onClick={() => setView('day')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              view === 'day'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-500 hover:text-[var(--text-color)]'
            }`}
            title="Day View"
          >
            <Clock className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Day</span>
          </button>
        </div>

        {/* Sync panel and quick link buttons */}
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={handleToday}
            className="px-3.5 py-2 text-xs font-bold bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-2xl cursor-pointer text-[var(--text-color)] border border-slate-200 dark:border-white/5 transition-all"
          >
            Today
          </button>
        </div>
      </div>

      {googleError && (
        <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-2.5 text-xs text-rose-500 dark:text-rose-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <p>{googleError}</p>
        </div>
      )}

      {/* Main Grid View */}
      <div>
        {view === 'year' && renderYearView()}
        {view === 'month' && renderMonthView()}
        {view === 'week' && renderWeekView()}
        {view === 'day' && renderDayView()}
      </div>

      {/* Modern Intake Input Box at Bottom (for Month/Week/Day view) */}
      {view !== 'year' && (
        <GlassCard className="p-4 flex flex-col md:flex-row items-stretch md:items-center gap-3 border-emerald-500/10 shadow-lg shadow-emerald-500/5">
          <div className="flex-grow flex items-center gap-2.5 bg-slate-50 dark:bg-slate-950/20 border border-slate-200 dark:border-white/5 px-4 py-2 rounded-2xl">
            <span className="text-[10px] font-bold text-slate-500 uppercase font-mono tracking-wider">
              Selected: {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
            <div className="w-px h-4 bg-slate-200 dark:bg-white/10" />
            <form onSubmit={handleAddEvent} className="flex-1 flex items-center gap-2">
              <input 
                type="text"
                placeholder={`+ Add task/event on ${selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}...`}
                value={newEventTitle}
                onChange={(e) => setNewEventTitle(e.target.value)}
                className="w-full bg-transparent text-xs text-[var(--heading-text)] font-sans focus:outline-none placeholder:text-slate-500 placeholder:opacity-75"
              />
              <button 
                type="submit"
                disabled={!newEventTitle.trim()}
                className="p-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            </form>
          </div>
          
          <div className="flex items-center justify-between px-2 text-[10px] text-slate-400 font-medium">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Smart Task</span>
            </div>
            {googleToken && (
              <div className="flex items-center gap-1.5 ml-4">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                <span>Google Calendar (Auto-Synced)</span>
              </div>
            )}
          </div>
        </GlassCard>
      )}

      {/* Interactive Modal Pop-up for Creating Task */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Modal Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-950/60 dark:bg-black/80 backdrop-blur-sm cursor-pointer"
              onClick={() => setShowAddModal(false)}
            />

            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-6 rounded-3xl shadow-2xl backdrop-blur-2xl text-slate-800 dark:text-white z-10 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center pb-4 border-b border-slate-200 dark:border-white/10">
                <div>
                  <h3 className="font-semibold text-slate-950 dark:text-white font-display text-lg flex items-center gap-2">
                    <Plus className="w-5 h-5 text-emerald-500" /> Add New Calendar Task
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                    Target Date: {selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white cursor-pointer p-1.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleModalSubmit} className="space-y-4 mt-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase font-mono tracking-wider">
                    Task Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Review app tomorrow, prep presentation..."
                    value={modalTitle}
                    onChange={(e) => setModalTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-white/5 rounded-2xl text-xs text-[var(--heading-text)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase font-mono tracking-wider">
                    Description
                  </label>
                  <textarea
                    placeholder="Add details, notes, or agenda..."
                    value={modalDesc}
                    onChange={(e) => setModalDesc(e.target.value)}
                    rows={2}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-white/5 rounded-2xl text-xs text-[var(--heading-text)] focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase font-mono tracking-wider flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 text-emerald-500" /> Priority
                    </label>
                    <select
                      value={modalPriority}
                      onChange={(e) => setModalPriority(e.target.value as Priority)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-2xl text-xs text-[var(--heading-text)] focus:outline-none"
                    >
                      <option value="low">Low Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="high">High Priority</option>
                      <option value="critical">Critical Priority</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase font-mono tracking-wider flex items-center gap-1">
                      <Clock className="w-3 h-3 text-emerald-500" /> Start Time
                    </label>
                    <input
                      type="time"
                      required
                      value={modalTime}
                      onChange={(e) => setModalTime(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-2xl text-xs text-[var(--heading-text)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase font-mono tracking-wider flex items-center gap-1">
                      <Clock className="w-3 h-3 text-emerald-500" /> Duration (mins)
                    </label>
                    <input
                      type="number"
                      min={5}
                      max={480}
                      value={modalDuration}
                      onChange={(e) => setModalDuration(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-white/5 rounded-2xl text-xs text-[var(--heading-text)] focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase font-mono tracking-wider flex items-center gap-1">
                      <Tag className="w-3 h-3 text-emerald-500" /> Tags
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., work, personal, health"
                      value={modalTags}
                      onChange={(e) => setModalTags(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-white/5 rounded-2xl text-xs text-[var(--heading-text)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-200 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 rounded-2xl transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl shadow-lg shadow-emerald-600/15 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Task</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Utility type check guards
function isGoogleEvent(evt: any): evt is GoogleEvent {
  return evt.isGoogle === true;
}

// Helper styling classes based on Task priority
function getPriorityClass(priority?: Priority) {
  switch (priority) {
    case 'critical':
      return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
    case 'high':
      return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    case 'medium':
      return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    default:
      return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
  }
}
