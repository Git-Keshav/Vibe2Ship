import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  db, auth
} from './firebase';
import {
  GoogleAuthProvider, signInWithPopup
} from 'firebase/auth';
import {
  collection, query, where, onSnapshot, addDoc, updateDoc, doc, deleteDoc, setDoc, getDoc
} from 'firebase/firestore';
import {
  Task, Habit, Goal, FocusSession, AIAnalysis, UserPreferences, MorningBrief, AppNotification
} from './types';

// Importing custom components
import AuthScreen from './components/AuthScreen';
import GlassCard from './components/GlassCard';
import CustomDropdown from './components/CustomDropdown';
import TaskCenter from './components/TaskCenter';
import FocusMode from './components/FocusMode';
import GoalCenter from './components/GoalCenter';
import InsightsCenter from './components/InsightsCenter';
import VoiceAssistant from './components/VoiceAssistant';
import InboxAnalyzer from './components/InboxAnalyzer';
import RecommendationsCard from './components/RecommendationsCard';
import CalendarCenter from './components/CalendarCenter';
import AppLogo from './components/AppLogo';
import FlipClock from './components/FlipClock';
import { generateLocalMorningBrief } from './lib/localIntelligence';

// Icons
import {
  Home, CheckSquare, Timer, Target, BarChart2, Sparkles, Inbox, Calendar, Link,
  Settings, LogOut, Bell, Flame, User, AlertTriangle, Sparkle, RefreshCw,
  Sun, Moon, Menu, X, ChevronLeft, ChevronRight, ChevronDown, Square, Check, Info,
  Award, Clock
} from 'lucide-react';

const MONTH_BADGES = [
  { month: 0, name: 'Jan Horizon', icon: '❄️', desc: 'Complete a task in January', color: 'from-blue-400 to-cyan-500' },
  { month: 1, name: 'Feb Valentine', icon: '💖', desc: 'Complete a task in February', color: 'from-pink-400 to-rose-500' },
  { month: 2, name: 'Mar Renewal', icon: '🌱', desc: 'Complete a task in March', color: 'from-emerald-400 to-green-500' },
  { month: 3, name: 'Apr Cascade', icon: '☔', desc: 'Complete a task in April', color: 'from-sky-400 to-indigo-500' },
  { month: 4, name: 'May Blossom', icon: '🌸', desc: 'Complete a task in May', color: 'from-purple-400 to-pink-500' },
  { month: 5, name: 'Jun Solstice', icon: '☀️', desc: 'Complete a task in June', color: 'from-amber-400 to-orange-500' },
  { month: 6, name: 'Jul Jubilee', icon: '🎆', desc: 'Complete a task in July', color: 'from-red-400 to-orange-500' },
  { month: 7, name: 'Aug Zephyr', icon: '🍃', desc: 'Complete a task in August', color: 'from-teal-400 to-emerald-500' },
  { month: 8, name: 'Sep Harvest', icon: '🍁', desc: 'Complete a task in September', color: 'from-orange-400 to-amber-600' },
  { month: 9, name: 'Oct Spectre', icon: '🎃', desc: 'Complete a task in October', color: 'from-orange-500 to-purple-600' },
  { month: 10, name: 'Nov Kinship', icon: '🦃', desc: 'Complete a task in November', color: 'from-amber-600 to-yellow-600' },
  { month: 11, name: 'Dec Solace', icon: '🎄', desc: 'Complete a task in December', color: 'from-red-500 to-green-600' },
];

const aiPersonalityOptions = [
  { value: 'mentor', label: 'Wise Mentor', icon: '🧘' },
  { value: 'coach', label: 'Direct Coach', icon: '💪' },
  { value: 'friendly', label: 'Friendly Assistant', icon: '🤝' },
  { value: 'strict', label: 'Strict Taskmaster', icon: '📋' }
];

const nudgeFrequencyOptions = [
  { value: 'low', label: 'Low - Less noise, deep focus', icon: '🌱' },
  { value: 'medium', label: 'Medium - Standard pings', icon: '⚡' },
  { value: 'high', label: 'High - Firm accountability', icon: '🔥' }
];

const sanitizePreferences = (p: any): UserPreferences => {
  return {
    aiPersonality: p?.aiPersonality || 'mentor',
    nudgeFrequency: p?.nudgeFrequency || 'medium',
    wakeTime: p?.wakeTime || '07:00',
    sleepTime: p?.sleepTime || '23:00',
    notificationsEnabled: p?.notificationsEnabled !== false,
    deviceNotificationsEnabled: !!p?.deviceNotificationsEnabled,
  };
};

export default function App() {
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('student');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [preferences, setPreferences] = useState<UserPreferences>({
    aiPersonality: 'mentor',
    nudgeFrequency: 'medium',
    wakeTime: '07:00',
    sleepTime: '23:00',
    notificationsEnabled: true,
    deviceNotificationsEnabled: false,
  });

  const [initialized, setInitialized] = useState(false);
  const [onboarded, setOnboarded] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return 'dark';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light');
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Tracks standard browser notification permission status
  const [browserNotificationPermission, setBrowserNotificationPermission] = useState<NotificationPermission>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  });

  // Keep track of banner dismissal
  const [isNotificationBannerDismissed, setIsNotificationBannerDismissed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('notification_banner_dismissed') === 'true';
    }
    return false;
  });

  const requestNotificationPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      addNotification('Standard device notifications are not supported in this environment.', 'System');
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      setBrowserNotificationPermission(permission);
      if (permission === 'granted') {
        addNotification('Device standard notifications enabled successfully!', 'System');
      } else if (permission === 'denied') {
        addNotification('Device standard notifications were blocked/denied.', 'System');
      }
    } catch (err) {
      console.warn('Error requesting notification permission:', err);
    }
  };

  // App core state
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoaded, setTasksLoaded] = useState(false);
  const [unlockedMonthIndices, setUnlockedMonthIndices] = useState<number[]>([]);
  const [newlyUnlockedMonthIndices, setNewlyUnlockedMonthIndices] = useState<number[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>([]);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [morningBrief, setMorningBrief] = useState<MorningBrief | null>(null);
  const [briefError, setBriefError] = useState<string | null>(null);
  const [loadingBrief, setLoadingBrief] = useState(false);
  const [showAiSummary, setShowAiSummary] = useState(true);

  // UI state
  const [bounceActive, setBounceActive] = useState(false);
  const [activeTab, setActiveTab] = useState<'home' | 'tasks' | 'inbox' | 'focus' | 'goals' | 'insights' | 'calendar'>('home');
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showBadgesModal, setShowBadgesModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showFlipClock, setShowFlipClock] = useState(false);
  const [isFocusSessionActive, setIsFocusSessionActive] = useState(false);
  const [currentFocusTaskTitle, setCurrentFocusTaskTitle] = useState<string | undefined>(undefined);
  const [notifications, setNotifications] = useState<AppNotification[]>([
    {
      id: 'init-1',
      message: '🌱 Welcome to Last-Minute Life Saver!',
      category: 'System',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    },
    {
      id: 'init-2',
      message: '🤖 AI personality Mentor has been set.',
      category: 'System',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const addNotification = (message: string, category: AppNotification['category']) => {
    // If notifications are explicitly disabled in settings, do absolutely nothing
    if (preferences && preferences.notificationsEnabled === false) {
      return;
    }

    const newNotif: AppNotification = {
      id: Math.random().toString(36).substring(2, 9),
      message,
      category,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setNotifications(prev => [newNotif, ...prev.slice(0, 4)]);

    // Check standard browser permission. If granted, show browser standard device notification
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(`💡 LMLS ${category} Alert`, {
          body: message,
          icon: '/favicon.ico',
        });
      } catch (err) {
        console.warn('Browser standard Notification creation failed:', err);
      }
    }
  };

  const settingsRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // Check if click is outside settings panel
      if (
        showSettings &&
        settingsRef.current &&
        !settingsRef.current.contains(target) &&
        !target.closest('[data-toggle-settings]')
      ) {
        setShowSettings(false);
      }

      // Check if click is outside notifications panel
      if (
        showNotifications &&
        notificationsRef.current &&
        !notificationsRef.current.contains(target) &&
        !target.closest('[data-toggle-notifications]')
      ) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSettings, showNotifications]);

  // Close badges modal and scroll back to top when activeTab changes
  useEffect(() => {
    setShowBadgesModal(false);
    
    // Ensure both standard window and document level scroll containers are reset to top
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    if (document.body) {
      document.body.scrollTop = 0;
    }
  }, [activeTab]);

  const hasDoneInitialBadgeCheckRef = useRef(false);

  useEffect(() => {
    if (!initialized || !tasksLoaded) return;

    // Calculate currently unlocked months
    const currentUnlocked: number[] = [];
    MONTH_BADGES.forEach(badge => {
      const isUnlocked = tasks.some(t => {
        if (t.status !== 'completed') return false;
        const dateStr = t.completedAt || t.updatedAt;
        if (!dateStr) return false;
        const d = new Date(dateStr);
        return d.getMonth() === badge.month;
      });
      if (isUnlocked) {
        currentUnlocked.push(badge.month);
      }
    });

    if (!hasDoneInitialBadgeCheckRef.current) {
      // First time we loaded the user's tasks, we just memorize what was already unlocked
      setUnlockedMonthIndices(currentUnlocked);
      hasDoneInitialBadgeCheckRef.current = true;
    } else {
      // We've already completed the initial check, so any new unlocks are real transitions!
      const newlyUnlocked = currentUnlocked.filter(m => !unlockedMonthIndices.includes(m));
      if (newlyUnlocked.length > 0) {
        setNewlyUnlockedMonthIndices(prev => {
          const toAdd = newlyUnlocked.filter(m => !prev.includes(m));
          return [...prev, ...toAdd];
        });
        setUnlockedMonthIndices(currentUnlocked);

        // Notify the user
        newlyUnlocked.forEach(month => {
          const badge = MONTH_BADGES.find(b => b.month === month);
          if (badge) {
            addNotification(`🏆 Achievement Unlocked: ${badge.name}! ${badge.icon}`, 'System');
          }
        });

        // Automatically trigger the Achievements modal to celebrate!
        setTimeout(() => {
          setShowBadgesModal(true);
        }, 800);
      }
    }
  }, [tasks, initialized, tasksLoaded, unlockedMonthIndices]);
  
  // Reset the bounceActive state back to false after 500ms when it is true
  useEffect(() => {
    if (bounceActive) {
      const timer = setTimeout(() => {
        setBounceActive(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [bounceActive]);

  useEffect(() => {
    const triggerBounce = () => {
      setBounceActive(true);
    };

    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const clientHeight = document.documentElement.clientHeight;

      // Detect bottom of scrollable area with tolerance
      if (scrollTop + clientHeight >= scrollHeight - 6) {
        triggerBounce();
      }
    };

    const handleWheel = (e: WheelEvent) => {
      const scrollHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const clientHeight = document.documentElement.clientHeight;
      
      // If user scrolls down and is at or very close to bottom boundary
      if (e.deltaY > 0 && (scrollTop + clientHeight >= scrollHeight - 10)) {
        triggerBounce();
      }
    };

    let touchStartY = 0;
    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      const scrollHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const clientHeight = document.documentElement.clientHeight;
      
      const currentY = e.touches[0].clientY;
      const deltaY = touchStartY - currentY; // positive delta means scrolling down (swipe up)
      
      if (deltaY > 5 && (scrollTop + clientHeight >= scrollHeight - 10)) {
        triggerBounce();
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('wheel', handleWheel, { passive: true });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  const prevUserRef = useRef<{ uid: string | null; isAnonymous: boolean | null }>({ uid: null, isAnonymous: null });

  const migrateLocalDataToFirestore = async (newUserId: string, oldUserId: string) => {
    // 1. Migrate tasks
    let guestTasks: Task[] = [];
    try {
      const savedTasks = localStorage.getItem(`tasks_${oldUserId}`);
      if (savedTasks) guestTasks = JSON.parse(savedTasks);
    } catch (e) {
      console.warn(e);
    }
    if (guestTasks.length === 0) {
      guestTasks = [...tasks];
    }

    for (const t of guestTasks) {
      const migratedTask: Task = { ...t, userId: newUserId, updatedAt: new Date().toISOString() };
      try {
        await setDoc(doc(db, 'tasks', t.id), migratedTask);
      } catch (err) {
        console.error("Failed to migrate task to Firestore:", err);
      }
    }

    // 2. Migrate habits
    let guestHabits: Habit[] = [];
    try {
      const savedHabits = localStorage.getItem(`habits_${oldUserId}`);
      if (savedHabits) guestHabits = JSON.parse(savedHabits);
    } catch (e) {
      console.warn(e);
    }
    if (guestHabits.length === 0) {
      guestHabits = [...habits];
    }

    for (const h of guestHabits) {
      const migratedHabit: Habit = { ...h, userId: newUserId };
      try {
        await setDoc(doc(db, 'habits', h.id), migratedHabit);
      } catch (err) {
        console.error("Failed to migrate habit to Firestore:", err);
      }
    }

    // 3. Migrate goals
    let guestGoals: Goal[] = [];
    try {
      const savedGoals = localStorage.getItem(`goals_${oldUserId}`);
      if (savedGoals) guestGoals = JSON.parse(savedGoals);
    } catch (e) {
      console.warn(e);
    }
    if (guestGoals.length === 0) {
      guestGoals = [...goals];
    }

    for (const g of guestGoals) {
      const migratedGoal: Goal = { ...g, userId: newUserId };
      try {
        await setDoc(doc(db, 'goals', g.id), migratedGoal);
      } catch (err) {
        console.error("Failed to migrate goal to Firestore:", err);
      }
    }

    // Clear old guest data from localStorage to keep it clean
    localStorage.removeItem(`tasks_${oldUserId}`);
    localStorage.removeItem(`habits_${oldUserId}`);
    localStorage.removeItem(`goals_${oldUserId}`);
    localStorage.removeItem(`profile_${oldUserId}`);
  };

  const performAutoOnboard = async (uid: string, anon: boolean, email?: string | null) => {
    const rawPrefix = email ? email.split('@')[0] : 'User';
    const cleanName = anon ? 'Guest User' : (rawPrefix.charAt(0).toUpperCase() + rawPrefix.slice(1));
    const defaultRole = 'student';
    const defaultPrefs: UserPreferences = {
      aiPersonality: 'mentor',
      nudgeFrequency: 'medium',
      wakeTime: '07:00',
      sleepTime: '23:00',
      notificationsEnabled: true,
      deviceNotificationsEnabled: false,
    };

    setUserName(cleanName);
    setUserRole(defaultRole);
    setPreferences(defaultPrefs);
    setOnboarded(true);

    const profileData = {
      userId: uid,
      name: cleanName,
      role: defaultRole,
      preferences: defaultPrefs
    };

    localStorage.setItem(`profile_${uid}`, JSON.stringify(profileData));

    try {
      await setDoc(doc(db, 'profiles', uid), profileData);
    } catch (err) {
      console.warn("Could not save profile to Firestore:", err);
    }
  };

  // Auth recovery on mount
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const wasAnonymous = prevUserRef.current.isAnonymous;
        const prevUid = prevUserRef.current.uid;

        setUserId(user.uid);
        setIsAnonymous(user.isAnonymous);

        if (wasAnonymous && !user.isAnonymous && prevUid) {
          // Perform migration of local data to their new permanent account in Firestore
          await migrateLocalDataToFirestore(user.uid, prevUid);
        }

        prevUserRef.current = { uid: user.uid, isAnonymous: user.isAnonymous };

        // Try to recover user profiles if stored in Firestore first, or fallback
        try {
          const profileDoc = await getDoc(doc(db, 'profiles', user.uid));
          if (profileDoc.exists()) {
            const profile = profileDoc.data();
            setUserName(profile.name || '');
            setUserRole(profile.role || 'student');
            setPreferences(sanitizePreferences(profile.preferences));
            setOnboarded(true);

            localStorage.setItem(`profile_${user.uid}`, JSON.stringify(profile));
          } else {
            // Fallback to local storage
            const savedProfile = localStorage.getItem(`profile_${user.uid}`);
            if (savedProfile) {
              const profile = JSON.parse(savedProfile);
              setUserName(profile.name);
              setUserRole(profile.role);
              setPreferences(sanitizePreferences(profile.preferences));
              setOnboarded(true);

              await setDoc(doc(db, 'profiles', user.uid), {
                userId: user.uid,
                name: profile.name,
                role: profile.role,
                preferences: profile.preferences
              });
            } else {
              await performAutoOnboard(user.uid, user.isAnonymous, user.email);
            }
          }
        } catch (err) {
          console.error("Error loading profile from Firestore:", err);
          const savedProfile = localStorage.getItem(`profile_${user.uid}`);
          if (savedProfile) {
            const profile = JSON.parse(savedProfile);
            setUserName(profile.name);
            setUserRole(profile.role);
            setPreferences(sanitizePreferences(profile.preferences));
            setOnboarded(true);
          } else {
            await performAutoOnboard(user.uid, user.isAnonymous, user.email);
          }
        }
      } else {
        setUserId(null);
        setOnboarded(false);
        prevUserRef.current = { uid: null, isAnonymous: null };
      }
      setInitialized(true);
    });

    return unsubscribe;
  }, []);

  // Syncing with Firestore / LocalStorage
  useEffect(() => {
    if (!userId) return;

    setTasksLoaded(false);
    hasDoneInitialBadgeCheckRef.current = false;

    if (isAnonymous) {
      // LocalStorage Sync for Guests
      const savedTasks = localStorage.getItem(`tasks_${userId}`);
      const savedHabits = localStorage.getItem(`habits_${userId}`);
      const savedGoals = localStorage.getItem(`goals_${userId}`);
      const savedSessions = localStorage.getItem(`sessions_${userId}`);
      const savedAnalysis = localStorage.getItem(`analysis_${userId}`);

      if (savedTasks) setTasks(JSON.parse(savedTasks));
      if (savedHabits) setHabits(JSON.parse(savedHabits));
      if (savedGoals) setGoals(JSON.parse(savedGoals));
      if (savedSessions) setFocusSessions(JSON.parse(savedSessions));
      if (savedAnalysis) setAnalysis(JSON.parse(savedAnalysis));
      setTasksLoaded(true);
    } else {
      // Real-time Firestore Sync for Authenticated Users
      try {
        const tasksQuery = query(collection(db, 'tasks'), where('userId', '==', userId));
        const unsubscribeTasks = onSnapshot(tasksQuery, (snapshot) => {
          const list: Task[] = [];
          snapshot.forEach((doc) => {
            list.push({ id: doc.id, ...doc.data() } as Task);
          });
          setTasks(list);
          setTasksLoaded(true);
        }, (err) => console.warn('Tasks offline fallback', err));

        const habitsQuery = query(collection(db, 'habits'), where('userId', '==', userId));
        const unsubscribeHabits = onSnapshot(habitsQuery, (snapshot) => {
          const list: Habit[] = [];
          snapshot.forEach((doc) => {
            list.push({ id: doc.id, ...doc.data() } as Habit);
          });
          setHabits(list);
        }, (err) => console.warn('Habits offline fallback', err));

        const goalsQuery = query(collection(db, 'goals'), where('userId', '==', userId));
        const unsubscribeGoals = onSnapshot(goalsQuery, (snapshot) => {
          const list: Goal[] = [];
          snapshot.forEach((doc) => {
            list.push({ id: doc.id, ...doc.data() } as Goal);
          });
          setGoals(list);
        }, (err) => console.warn('Goals offline fallback', err));

        // Sync focus sessions locally for simpler schema
        const savedSessions = localStorage.getItem(`sessions_${userId}`);
        if (savedSessions) setFocusSessions(JSON.parse(savedSessions));

        const savedAnalysis = localStorage.getItem(`analysis_${userId}`);
        if (savedAnalysis) setAnalysis(JSON.parse(savedAnalysis));

        return () => {
          unsubscribeTasks();
          unsubscribeHabits();
          unsubscribeGoals();
        };
      } catch (err) {
        console.error('Firestore connection issue:', err);
      }
    }
  }, [userId, isAnonymous]);

  // Persist guest data or focus stats whenever they change
  useEffect(() => {
    if (!userId) return;
    if (isAnonymous) {
      localStorage.setItem(`tasks_${userId}`, JSON.stringify(tasks));
      localStorage.setItem(`habits_${userId}`, JSON.stringify(habits));
      localStorage.setItem(`goals_${userId}`, JSON.stringify(goals));
    }
    localStorage.setItem(`sessions_${userId}`, JSON.stringify(focusSessions));
    if (analysis) {
      localStorage.setItem(`analysis_${userId}`, JSON.stringify(analysis));
    }
  }, [tasks, habits, goals, focusSessions, analysis, userId, isAnonymous]);

  // Persist user profile and preferences to localStorage and Firestore on change
  useEffect(() => {
    if (!userId || !onboarded) return;

    const profileData = {
      userId,
      name: userName,
      role: userRole,
      preferences
    };

    localStorage.setItem(`profile_${userId}`, JSON.stringify(profileData));

    const saveProfile = async () => {
      try {
        await setDoc(doc(db, 'profiles', userId), profileData);
      } catch (err) {
        console.warn('Failed to persist profile to Firestore', err);
      }
    };
    saveProfile();
  }, [userId, userName, userRole, preferences, onboarded]);

  // Desktop notification & App fallback for unchecked habits 2 hours before sleep time
  useEffect(() => {
    const checkHabitNotifications = () => {
      if (!preferences || !preferences.sleepTime || habits.length === 0) return;

      const [sleepHourStr, sleepMinStr] = preferences.sleepTime.split(':');
      const sleepHour = parseInt(sleepHourStr, 10);
      const sleepMin = parseInt(sleepMinStr, 10);
      if (isNaN(sleepHour) || isNaN(sleepMin)) return;

      // Calculate target trigger time (2 hours before sleep time)
      let triggerHour = sleepHour - 2;
      let triggerMin = sleepMin;
      if (triggerHour < 0) {
        triggerHour += 24;
      }

      const now = new Date();
      const currentHour = now.getHours();
      const currentMin = now.getMinutes();
      const todayStr = now.toISOString().slice(0, 10);

      // Check if we already notified today
      const lastNotifiedDate = localStorage.getItem('last_habit_notification_date');
      if (lastNotifiedDate === todayStr) return;

      // We trigger the notification if the current time matches the trigger hour and minute (within a 5 minute window on or after)
      const nowInMinutes = currentHour * 60 + currentMin;
      const triggerInMinutes = triggerHour * 60 + triggerMin;

      if (nowInMinutes >= triggerInMinutes && nowInMinutes < triggerInMinutes + 5) {
        // Find if there are any unchecked habits today
        const uncheckedHabits = habits.filter(h => !h.history.includes(todayStr));

        if (uncheckedHabits.length > 0) {
          const habitNames = uncheckedHabits.map(h => h.name).join(', ');

          // Sidebar / In-App Notification List and browser standard push
          addNotification(`Pending habits: ${habitNames}! Check them off before sleeping!`, 'Habits');

          // Mark as notified today
          localStorage.setItem('last_habit_notification_date', todayStr);
        }
      }
    };

    // Run check immediately on mount/update, and every 30 seconds
    checkHabitNotifications();
    const intervalId = setInterval(checkHabitNotifications, 30000);

    return () => clearInterval(intervalId);
  }, [preferences, habits]);

  // Fetch morning brief when tasks/onboarding complete
  const triggerMorningBrief = async () => {
    if (!userId || !userName) return;
    setLoadingBrief(true);
    setBriefError(null);

    // Minor visual transition delay to give a smooth loaded feel
    await new Promise(resolve => setTimeout(resolve, 350));

    try {
      const localData = generateLocalMorningBrief(userName, tasks, habits, goals, preferences.aiPersonality);
      setMorningBrief({ ...localData, isLocal: true } as any);
    } catch (err: any) {
      console.warn('Error in morning brief local generation:', err);
      setBriefError('Failed to generate local morning brief.');
    } finally {
      setLoadingBrief(false);
    }
  };

  useEffect(() => {
    if (onboarded && tasks.length >= 0) {
      triggerMorningBrief();
    }
  }, [onboarded]);

  const handleAuthSuccess = async (uid: string, anon: boolean) => {
    setUserId(uid);
    setIsAnonymous(anon);
  };

  const handleLinkGoogleCalendar = async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/calendar');
      provider.setCustomParameters({
        prompt: 'consent'
      });
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setGoogleToken(credential.accessToken);
        addNotification('Google Calendar linked and synced successfully!', 'System');
      }
    } catch (err: any) {
      console.error('Google Calendar link failed:', err);
      addNotification('Failed to link Google Calendar.', 'System');
    }
  };

  // Database mutations (Wrapper matching Firestore & fallback Guest arrays)
  const cleanDataForFirestore = (obj: any): any => {
    if (obj === null || obj === undefined) return obj;
    if (Array.isArray(obj)) {
      return obj.map(item => cleanDataForFirestore(item));
    }
    if (typeof obj === 'object') {
      const cleaned: any = {};
      Object.keys(obj).forEach(key => {
        if (obj[key] !== undefined) {
          cleaned[key] = cleanDataForFirestore(obj[key]);
        }
      });
      return cleaned;
    }
    return obj;
  };

  const handleAddTask = async (taskData: Partial<Task>) => {
    if (!userId) return;

    const newTask: Task = {
      id: 'task-' + Math.random().toString(36).substr(2, 9),
      userId,
      title: taskData.title || 'Untitled Task',
      description: taskData.description || '',
      status: 'todo',
      priority: taskData.priority || 'medium',
      energyRequired: taskData.energyRequired || 'light',
      deadline: taskData.deadline || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      estimatedDuration: taskData.estimatedDuration || 30,
      aiPredictedDuration: taskData.aiPredictedDuration,
      subtasks: taskData.subtasks || [],
      procrastinationRisk: taskData.procrastinationRisk || 'medium',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: taskData.tags || [],
      contextTags: taskData.contextTags || []
    };

    if (isAnonymous) {
      setTasks((prev) => [newTask, ...prev]);
    } else {
      try {
        await setDoc(doc(db, 'tasks', newTask.id), cleanDataForFirestore(newTask));
      } catch (err) {
        console.error('Firestore save failed. Falling back to local state:', err);
        setTasks((prev) => [newTask, ...prev]);
      }
    }

    addNotification(`Task added: ${newTask.title}`, 'Tasks');
  };

  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    if (isAnonymous) {
      setTasks((prev) => prev.map(t => t.id === taskId ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t));
    } else {
      try {
        setTasks((prev) => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));
        await updateDoc(doc(db, 'tasks', taskId), cleanDataForFirestore({ ...updates, updatedAt: new Date().toISOString() }));
      } catch (err) {
        console.error('Firestore update failed:', err);
      }
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (isAnonymous) {
      setTasks((prev) => prev.filter(t => t.id !== taskId));
    } else {
      try {
        setTasks((prev) => prev.filter(t => t.id !== taskId));
        await deleteDoc(doc(db, 'tasks', taskId));
      } catch (err) {
        console.error('Firestore delete failed:', err);
      }
    }
  };

  const handleAddGoal = async (goalData: Partial<Goal>) => {
    if (!userId) return;

    const newGoal: Goal = {
      id: 'goal-' + Math.random().toString(36).substr(2, 9),
      userId,
      title: goalData.title || 'Untitled Goal',
      description: goalData.description || '',
      targetDate: goalData.targetDate || new Date().toISOString().slice(0, 10),
      category: goalData.category || 'work',
      progress: goalData.progress || 0,
      healthScore: goalData.healthScore || 80,
      createdAt: new Date().toISOString(),
    };

    if (isAnonymous) {
      setGoals((prev) => [newGoal, ...prev]);
    } else {
      try {
        await setDoc(doc(db, 'goals', newGoal.id), cleanDataForFirestore(newGoal));
      } catch (err) {
        console.error('Firestore save failed:', err);
        setGoals((prev) => [newGoal, ...prev]);
      }
    }
  };

  const handleUpdateGoal = async (goalId: string, updates: Partial<Goal>) => {
    if (isAnonymous) {
      setGoals((prev) => prev.map(g => g.id === goalId ? { ...g, ...updates } : g));
    } else {
      try {
        setGoals((prev) => prev.map(g => g.id === goalId ? { ...g, ...updates } : g));
        await updateDoc(doc(db, 'goals', goalId), cleanDataForFirestore(updates));
      } catch (err) {
        console.error('Firestore update failed:', err);
      }
    }
  };

  const handleAddHabit = async (habitData: Partial<Habit>) => {
    if (!userId) return;

    const newHabit: Habit = {
      id: 'habit-' + Math.random().toString(36).substr(2, 9),
      userId,
      name: habitData.name || 'Untitled Habit',
      description: habitData.description || '',
      streakDays: habitData.streakDays || 0,
      longestStreak: habitData.longestStreak || 0,
      category: habitData.category || 'health',
      history: habitData.history || [],
      createdAt: new Date().toISOString(),
    };

    if (isAnonymous) {
      setHabits((prev) => [newHabit, ...prev]);
    } else {
      try {
        await setDoc(doc(db, 'habits', newHabit.id), cleanDataForFirestore(newHabit));
      } catch (err) {
        console.error('Firestore save failed:', err);
        setHabits((prev) => [newHabit, ...prev]);
      }
    }
  };

  const handleUpdateHabit = async (habitId: string, updates: Partial<Habit>) => {
    if (isAnonymous) {
      setHabits((prev) => prev.map(h => h.id === habitId ? { ...h, ...updates } : h));
    } else {
      try {
        setHabits((prev) => prev.map(h => h.id === habitId ? { ...h, ...updates } : h));
        await updateDoc(doc(db, 'habits', habitId), cleanDataForFirestore(updates));
      } catch (err) {
        console.error('Firestore update failed:', err);
      }
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (isAnonymous) {
      setGoals((prev) => prev.filter(g => g.id !== goalId));
    } else {
      try {
        setGoals((prev) => prev.filter(g => g.id !== goalId));
        await deleteDoc(doc(db, 'goals', goalId));
      } catch (err) {
        console.error('Firestore goal delete failed:', err);
      }
    }
  };

  const handleDeleteHabit = async (habitId: string) => {
    if (isAnonymous) {
      setHabits((prev) => prev.filter(h => h.id !== habitId));
    } else {
      try {
        setHabits((prev) => prev.filter(h => h.id !== habitId));
        await deleteDoc(doc(db, 'habits', habitId));
      } catch (err) {
        console.error('Firestore habit delete failed:', err);
      }
    }
  };


  const handleAddSession = (sessionData: Partial<FocusSession>) => {
    if (!userId) return;
    const newSession: FocusSession = {
      id: 'session-' + Date.now(),
      userId,
      taskId: sessionData.taskId,
      taskTitle: sessionData.taskTitle,
      durationMinutes: sessionData.durationMinutes || 25,
      type: sessionData.type || 'pomodoro',
      completedAt: sessionData.completedAt || new Date().toISOString(),
      distractionsCount: sessionData.distractionsCount || 0,
      subtasksCompleted: sessionData.subtasksCompleted || 0
    };

    setFocusSessions((prev) => [newSession, ...prev]);
    addNotification(`Deep focus complete: +${newSession.durationMinutes} minutes`, 'Focus');
  };

  const handleLogout = async () => {
    await auth.signOut();
    setUserId(null);
    setOnboarded(false);
    setTasksLoaded(false);
    hasDoneInitialBadgeCheckRef.current = false;
    setUnlockedMonthIndices([]);
    setNewlyUnlockedMonthIndices([]);
  };

  // Launch focus from Voice commander
  const handleLaunchFocusFromVoice = (minutes: number, type: any) => {
    setActiveTab('focus');
    addNotification(`Focus session initialized for ${minutes} min`, 'Focus');
  };

  const isMonthUnlocked = (monthIndex: number) => {
    return tasks.some(t => {
      if (t.status !== 'completed') return false;
      const dateStr = t.completedAt || t.updatedAt;
      if (!dateStr) return false;
      const d = new Date(dateStr);
      return d.getMonth() === monthIndex;
    });
  };

  if (!initialized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg-color)] space-y-4">
        <div className="w-12 h-12 rounded-full border-t-2 border-indigo-500 animate-spin"></div>
        <p className="text-[var(--text-color)] opacity-60 font-mono text-xs tracking-wider">LOADING SECURE INSTANCE...</p>
      </div>
    );
  }

  if (!userId) {
    return (
      <AuthScreen
        onSuccess={handleAuthSuccess}
        theme={theme}
        onToggleTheme={() => setTheme(theme === 'light' ? 'dark' : 'light')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-color)] text-[var(--text-color)] flex flex-col md:flex-row font-sans relative transition-colors duration-300">
      {/* Animated Mesh Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] bg-purple-600/25 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/15 rounded-full blur-[150px] pointer-events-none"></div>
      <div className="absolute top-[20%] right-[10%] w-[35%] h-[35%] bg-pink-500/10 rounded-full blur-[100px] pointer-events-none"></div>

      {/* =============================== */}
      {/* DESKTOP SIDEBAR                 */}
      {/* =============================== */}
      {/* Placeholder spacer to take up space in the flex layout */}
      <motion.div
        animate={{ width: isSidebarCollapsed ? 80 : 256 }}
        transition={{ type: 'spring', damping: 28, stiffness: 200 }}
        className="hidden md:block shrink-0"
      />
      <motion.aside
        animate={{ width: isSidebarCollapsed ? 80 : 256 }}
        transition={{ type: 'spring', damping: 28, stiffness: 200 }}
        className="hidden md:flex flex-col bg-[var(--glass-bg)] border-r border-[var(--glass-border)] h-screen fixed left-0 top-0 p-4 z-40 backdrop-blur-2xl shrink-0 justify-between overflow-y-auto"
      >
        <div className="space-y-6">
          {/* Logo, Brand & Collapse Toggle */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <AppLogo size={42} className="shadow-md rounded-xl shrink-0" />
              {!isSidebarCollapsed && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden whitespace-nowrap"
                >
                  <h2 className="text-sm font-bold tracking-tight font-display text-[var(--heading-text)]">Done Before Due</h2>
                  <span className="text-[9px] font-mono text-emerald-500 dark:text-emerald-400 uppercase tracking-widest block font-bold leading-none mt-0.5">LMLS AI Companion</span>
                </motion.div>
              )}
            </div>

            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-1.5 rounded-lg text-[var(--text-color)] opacity-60 hover:opacity-100 hover:bg-[var(--glass-highlight)] transition-all cursor-pointer shrink-0"
              title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Quick stats streak */}
          <div className="flex items-center p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl overflow-hidden min-h-[46px]">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-500 fill-orange-500/10 shrink-0" />
              {!isSidebarCollapsed && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-left overflow-hidden whitespace-nowrap"
                >
                  <span className="text-[10px] uppercase font-mono text-slate-400 font-semibold block leading-none">Habit Streak</span>
                  <span className="text-sm font-mono font-bold text-[var(--heading-text)] block leading-none mt-1">{habits.reduce((acc, h) => Math.max(acc, h.streakDays), 0)} Days</span>
                </motion.div>
              )}
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {[
              { id: 'home', icon: Home, label: 'Home Dashboard' },
              { id: 'tasks', icon: CheckSquare, label: 'Smart Tasks' },
              { id: 'calendar', icon: Calendar, label: 'Intelligent Calendar' },
              { id: 'inbox', icon: Inbox, label: 'Inbox Intake' },
              { id: 'focus', icon: Timer, label: 'Focus Space' },
              { id: 'goals', icon: Target, label: 'Goals & Habits' },
              { id: 'insights', icon: BarChart2, label: 'AI Intelligence' }
            ].map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    setShowSettings(false);
                    setShowNotifications(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer overflow-hidden ${active
                      ? 'bg-emerald-600/10 text-emerald-600 border border-emerald-600/20 shadow-sm'
                      : 'text-[var(--text-color)] opacity-70 hover:opacity-100 hover:bg-[var(--glass-highlight)] border border-transparent'
                    }`}
                  title={isSidebarCollapsed ? tab.label : undefined}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-emerald-500' : 'text-[var(--text-color)]/60'}`} />
                  {!isSidebarCollapsed && (
                    <motion.span
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="whitespace-nowrap"
                    >
                      {tab.label}
                    </motion.span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Flip Clock Sidebar Button (Triggered from blue region in layout) */}
          <div className="pt-2">
            <button
              onClick={() => setShowFlipClock(true)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide text-indigo-500 hover:text-indigo-400 bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/10 hover:border-indigo-500/20 shadow-sm transition-all cursor-pointer overflow-hidden"
              title={isSidebarCollapsed ? "Start Full Screen Flip Clock" : undefined}
            >
              <Clock className="w-4 h-4 shrink-0 text-indigo-500" />
              {!isSidebarCollapsed && (
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="whitespace-nowrap font-bold"
                >
                  Start Flip Clock
                </motion.span>
              )}
            </button>
          </div>
        </div>

        {/* Bottom controls inside Desktop Sidebar */}
        <div className="space-y-4 pt-4 border-t border-[var(--glass-border)]">
          {/* Notifications */}
          <div className="relative">
            <button
              data-toggle-notifications="true"
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowSettings(false);
              }}
              className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[var(--glass-bg)] hover:bg-[var(--glass-highlight)] border border-[var(--glass-border)] text-[var(--text-color)] transition-all cursor-pointer text-xs font-semibold overflow-hidden"
              title="View Notification Logs"
            >
              <span className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-emerald-500 shrink-0" />
                {!isSidebarCollapsed && <span>Notifications</span>}
              </span>
              {notifications.length > 0 && (
                <span className="px-1.5 py-0.5 text-[9px] bg-indigo-500 text-white rounded-full font-mono shrink-0">{notifications.length}</span>
              )}
            </button>
          </div>

          <div className={`flex ${isSidebarCollapsed ? 'flex-col gap-1.5' : 'flex-row gap-2'}`}>
            {/* Theme selector */}
            <button
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="flex-1 flex justify-center items-center py-2 rounded-xl bg-[var(--glass-bg)] hover:bg-[var(--glass-highlight)] border border-[var(--glass-border)] text-[var(--text-color)] transition-all cursor-pointer"
              title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
            >
              {theme === 'light' ? <Moon className="w-4 h-4 text-indigo-500 fill-indigo-500/10" /> : <Sun className="w-4 h-4 text-amber-400 fill-amber-400/10" />}
            </button>

            {/* Settings button */}
            <button
              data-toggle-settings="true"
              onClick={() => {
                setShowSettings(!showSettings);
                setShowNotifications(false);
              }}
              className="flex-1 flex justify-center items-center py-2 rounded-xl bg-[var(--glass-bg)] hover:bg-[var(--glass-highlight)] border border-[var(--glass-border)] text-[var(--text-color)] transition-all cursor-pointer"
              title="Preferences"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>

          {/* User profile / Log out */}
          <div className={`flex items-center justify-between p-2 rounded-xl bg-black/5 dark:bg-black/20 border border-[var(--glass-border)] text-xs overflow-hidden ${isSidebarCollapsed ? 'flex-col gap-2' : ''}`}>
            <div 
              onClick={() => setShowBadgesModal(true)}
              className="flex items-center gap-2 max-w-[150px] truncate cursor-pointer hover:opacity-80 transition-all"
              title="Click to view achievements & badges"
            >
              <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px] uppercase font-mono shrink-0">
                {isAnonymous ? 'G' : (userName ? userName[0] : 'U')}
              </div>
              {!isSidebarCollapsed && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-left leading-tight truncate"
                >
                  <span className="font-semibold text-[var(--heading-text)] block truncate">{isAnonymous ? 'Guest User' : userName || 'User'}</span>
                  <span className="text-[9px] text-slate-400 capitalize truncate block">{userRole}</span>
                </motion.div>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-[var(--text-color)] hover:text-rose-500 hover:bg-rose-500/10 transition-all cursor-pointer shrink-0"
              title="Logout Session"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </motion.aside>

      {/* =============================== */}
      {/* MOBILE TOP BAR                  */}
      {/* =============================== */}
      <div className="flex md:hidden flex-col w-full sticky top-0 z-40 bg-[var(--bg-color)]/80 backdrop-blur-md border-b border-[var(--glass-border)]">
        <header className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <AppLogo size={32} className="shadow-sm rounded-lg shrink-0" />
            <div>
              <h2 className="text-xs font-bold tracking-tight font-display text-[var(--heading-text)]">Done Before Due</h2>
              <span className="text-[8px] font-mono text-emerald-500 dark:text-emerald-400 uppercase font-bold tracking-wider block leading-none">LMLS AI Companion</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Flame */}
            <div className="flex items-center gap-1 px-2.5 py-0.5 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-full text-[10px] font-mono font-bold">
              <Flame className="w-3 h-3 text-orange-500 fill-orange-500/10" />
              <span>{habits.reduce((acc, h) => Math.max(acc, h.streakDays), 0)}d</span>
            </div>

            {/* Menu Toggle */}
            <button
              onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
              className="p-2 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-color)] cursor-pointer hover:bg-[var(--glass-highlight)] transition-all"
            >
              {isMobileSidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </header>
      </div>

      {/* =============================== */}
      {/* MOBILE DRAWER/SIDEBAR OVERLAY   */}
      {/* =============================== */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <motion.div
            initial="closed"
            animate="open"
            exit="closed"
            className="fixed inset-0 z-50 md:hidden flex"
          >
            {/* Backdrop */}
            <motion.div
              variants={{
                open: { opacity: 1 },
                closed: { opacity: 0 }
              }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs cursor-pointer"
              onClick={() => setIsMobileSidebarOpen(false)}
            />

            {/* Drawer Panel */}
            <motion.div
              variants={{
                open: { x: 0 },
                closed: { x: '-100%' }
              }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative w-72 max-w-[80vw] bg-[var(--bg-color)] border-r border-[var(--glass-border)] p-5 flex flex-col justify-between z-10 h-full"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <AppLogo size={36} className="shadow-sm rounded-lg shrink-0" />
                    <div>
                      <h2 className="text-xs font-bold tracking-tight font-display text-[var(--heading-text)]">Done Before Due</h2>
                      <span className="text-[8px] font-mono text-emerald-500 dark:text-emerald-400 uppercase font-bold tracking-wider block">LMLS AI Companion</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsMobileSidebarOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Navigation Links */}
                <nav className="space-y-1">
                  {[
                    { id: 'home', icon: Home, label: 'Home Dashboard' },
                    { id: 'tasks', icon: CheckSquare, label: 'Smart Tasks' },
                    { id: 'calendar', icon: Calendar, label: 'Intelligent Calendar' },
                    { id: 'inbox', icon: Inbox, label: 'Inbox Intake' },
                    { id: 'focus', icon: Timer, label: 'Focus Space' },
                    { id: 'goals', icon: Target, label: 'Goals & Habits' },
                    { id: 'insights', icon: BarChart2, label: 'AI Intelligence' }
                  ].map((tab) => {
                    const Icon = tab.icon;
                    const active = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setActiveTab(tab.id as any);
                          setShowSettings(false);
                          setShowNotifications(false);
                          setIsMobileSidebarOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${active
                            ? 'bg-emerald-600/10 text-emerald-600 border border-emerald-600/20 shadow-sm'
                            : 'text-[var(--text-color)] opacity-70 hover:opacity-100 hover:bg-[var(--glass-highlight)] border border-transparent'
                          }`}
                      >
                        <Icon className={`w-4 h-4 ${active ? 'text-emerald-500' : 'text-[var(--text-color)]/60'}`} />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </nav>

                {/* Mobile Flip Clock Button */}
                <div className="pt-2">
                  <button
                    onClick={() => {
                      setShowFlipClock(true);
                      setIsMobileSidebarOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide text-indigo-500 hover:text-indigo-400 bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/10 hover:border-indigo-500/20 shadow-sm transition-all cursor-pointer overflow-hidden"
                  >
                    <Clock className="w-4 h-4 shrink-0 text-indigo-500" />
                    <span className="font-bold">Start Flip Clock</span>
                  </button>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-[var(--glass-border)]">
                {/* Controls */}
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    {/* Theme Selector */}
                    <button
                      onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                      className="flex-1 flex justify-center items-center py-2 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-color)] text-xs gap-1.5 cursor-pointer"
                    >
                      {theme === 'light' ? <Moon className="w-4 h-4 text-indigo-500" /> : <Sun className="w-4 h-4 text-amber-400" />}
                      <span>{theme === 'light' ? 'Dark' : 'Light'}</span>
                    </button>

                    {/* Settings Toggle */}
                    <button
                      data-toggle-settings="true"
                      onClick={() => {
                        setShowSettings(!showSettings);
                        setShowNotifications(false);
                        setIsMobileSidebarOpen(false);
                      }}
                      className="flex-1 flex justify-center items-center py-2 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-color)] text-xs gap-1.5 cursor-pointer"
                    >
                      <Settings className="w-4 h-4" />
                      <span>Rules</span>
                    </button>
                  </div>

                  {/* Notifications Toggle */}
                  <button
                    data-toggle-notifications="true"
                    onClick={() => {
                      setShowNotifications(!showNotifications);
                      setShowSettings(false);
                      setIsMobileSidebarOpen(false);
                    }}
                    className="w-full flex justify-center items-center py-2 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-color)] text-xs gap-1.5 cursor-pointer"
                  >
                    <div className="relative">
                      <Bell className="w-4 h-4 text-emerald-500" />
                      {notifications.length > 0 && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
                      )}
                    </div>
                    <span>Notifications ({notifications.length})</span>
                  </button>
                </div>

                {/* User profile */}
                <div className="flex items-center justify-between p-2 rounded-xl bg-black/10 dark:bg-black/20 border border-[var(--glass-border)] text-xs">
                  <div 
                    onClick={() => {
                      setShowBadgesModal(true);
                      setIsMobileSidebarOpen(false);
                    }}
                    className="flex items-center gap-2 max-w-[150px] truncate cursor-pointer hover:opacity-80 transition-all"
                    title="Click to view achievements & badges"
                  >
                    <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px] uppercase font-mono shrink-0">
                      {isAnonymous ? 'G' : (userName ? userName[0] : 'U')}
                    </div>
                    <div className="text-left leading-tight truncate">
                      <span className="font-semibold text-[var(--heading-text)] block truncate">{isAnonymous ? 'Guest User' : userName || 'User'}</span>
                      <span className="text-[9px] text-slate-400 capitalize truncate block">{userRole}</span>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-1.5 rounded-lg text-[var(--text-color)] hover:text-rose-500 hover:bg-rose-500/10 transition-all cursor-pointer shrink-0"
                    title="Logout Session"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =============================== */}
      {/* RIGHT CONTENT CONTAINER         */}
      {/* =============================== */}
      <div className="flex-1 flex flex-col min-h-[calc(100vh-56px)] md:min-h-screen overflow-x-hidden pb-0 md:pb-0 relative z-10">

        {/* Main Content Area with elegant scroll boundary bounce */}
        <motion.main
          animate={bounceActive ? {
            y: [0, -10, 6, -2, 0],
            scale: [1, 0.995, 1.002, 1]
          } : { y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="w-full px-2 sm:px-4 py-1 md:py-1 pb-0 md:pb-0 flex-grow relative max-w-full"
        >

          {/* Settings Modal Slider */}
          <AnimatePresence>
            {showSettings && (
              <motion.div
                ref={settingsRef}
                initial={{ opacity: 0, x: -20, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -20, scale: 0.95 }}
                transition={{ type: "spring", damping: 25, stiffness: 220 }}
                className={`fixed z-50 border border-[var(--glass-border)] border-indigo-500/20 p-6 space-y-4 shadow-2xl backdrop-blur-2xl bg-[var(--glass-bg)] rounded-3xl text-[var(--text-color)] transition-all duration-300 bottom-4 left-4 right-4 max-w-[calc(100vw-32px)] md:right-auto md:max-w-sm md:bottom-20 max-h-[85vh] overflow-y-auto ${isSidebarCollapsed ? 'md:left-[96px]' : 'md:left-[272px]'}`}
              >
                <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-white/5">
                  <h3 className="font-bold font-display text-theme-heading text-base">Applet Rules & Settings</h3>
                  <button
                    onClick={() => setShowSettings(false)}
                    className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                  >
                    ✕ Close
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1 flex flex-col">
                    <label className="text-xs text-slate-400 font-semibold block mb-1">AI PERSONALITY</label>
                    <CustomDropdown
                      value={preferences.aiPersonality}
                      onChange={(val) => {
                        setPreferences({ ...preferences, aiPersonality: val as any });
                        addNotification(`AI Personality updated to ${val}`, 'System');
                      }}
                      options={aiPersonalityOptions}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-1 flex flex-col">
                    <label className="text-xs text-slate-400 font-semibold block mb-1">NUDGE ALERT FREQUENCY</label>
                    <CustomDropdown
                      value={preferences.nudgeFrequency}
                      onChange={(val) => setPreferences({ ...preferences, nudgeFrequency: val as any })}
                      options={nudgeFrequencyOptions}
                      className="w-full"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 font-semibold">WAKE TIME</label>
                      <input
                        type="time"
                        value={preferences.wakeTime}
                        onChange={(e) => setPreferences({ ...preferences, wakeTime: e.target.value })}
                        className="w-full px-2 py-1 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl text-xs text-[var(--input-text)] focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 font-semibold">SLEEP TIME</label>
                      <input
                        type="time"
                        value={preferences.sleepTime}
                        onChange={(e) => setPreferences({ ...preferences, sleepTime: e.target.value })}
                        className="w-full px-2 py-1 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl text-xs text-[var(--input-text)] focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200 dark:border-white/5 space-y-3">
                    <label className="text-xs text-slate-400 font-semibold block">NOTIFICATION PREFERENCES</label>
                    <div className="flex items-center justify-between p-2 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)]">
                      <div className="space-y-0.5 text-left">
                        <span className="text-xs font-semibold text-theme-heading block">Enable Notifications</span>
                        <span className="text-[10px] text-slate-400 block leading-tight">Mute or show all logs, sounds, and reminders in the app.</span>
                      </div>
                      <button
                        onClick={() => {
                          const val = preferences.notificationsEnabled !== false ? false : true;
                          setPreferences({ ...preferences, notificationsEnabled: val });
                          if (val) {
                            addNotification('Applet notifications enabled!', 'System');
                          }
                        }}
                        className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer focus:outline-none shrink-0 ${
                          preferences.notificationsEnabled !== false ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full bg-white transition-transform ${
                            preferences.notificationsEnabled !== false ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Browser/Device Notification Permission */}
                    <div className="p-3 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] space-y-2 text-left">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-theme-heading">Device Standard Status</span>
                        <span className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded-full ${
                          browserNotificationPermission === 'granted' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                          browserNotificationPermission === 'denied' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' :
                          'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                        }`}>
                          {browserNotificationPermission}
                        </span>
                      </div>
                      
                      {browserNotificationPermission === 'default' && (
                        <button
                          onClick={requestNotificationPermission}
                          className="w-full py-1.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-bold transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Bell className="w-3.5 h-3.5" />
                          <span>Request Browser Permission</span>
                        </button>
                      )}
                      
                      {browserNotificationPermission === 'denied' && (
                        <p className="text-[10px] text-slate-400 leading-tight">
                          Blocked. Please reset permission in your browser address bar to allow standard alerts.
                        </p>
                      )}

                      {browserNotificationPermission === 'granted' && (
                        <p className="text-[10px] text-emerald-500 font-semibold leading-tight flex items-center gap-1">
                          ✓ Device standard notifications are enabled.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200 dark:border-white/5 space-y-2">
                    <label className="text-xs text-slate-400 font-semibold block mb-1">GOOGLE CALENDAR SYNC</label>
                    {googleToken ? (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-500 font-semibold">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span>Connected & Synced</span>
                        </div>
                        <button
                          onClick={() => {
                            setGoogleToken(null);
                            addNotification('Google Calendar unlinked successfully.', 'System');
                          }}
                          className="w-full py-1.5 text-[10px] text-center font-bold text-rose-500 hover:text-white hover:bg-rose-600 rounded-xl border border-rose-500/20 transition-all cursor-pointer"
                        >
                          Unlink Google Calendar
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={handleLinkGoogleCalendar}
                        className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
                      >
                        <Link className="w-4 h-4" />
                        <span>Link Google Calendar</span>
                      </button>
                    )}
                  </div>




                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Notifications Modal Slider */}
          <AnimatePresence>
            {showNotifications && (
              <motion.div
                ref={notificationsRef}
                initial={{ opacity: 0, x: -20, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -20, scale: 0.95 }}
                transition={{ type: "spring", damping: 25, stiffness: 220 }}
                className={`fixed z-50 border border-[var(--glass-border)] border-emerald-500/20 p-6 space-y-4 shadow-2xl backdrop-blur-2xl bg-[var(--glass-bg)] rounded-3xl text-[var(--text-color)] transition-all duration-300 bottom-4 left-4 right-4 max-w-[calc(100vw-32px)] md:right-auto md:max-w-sm md:bottom-20 ${isSidebarCollapsed ? 'md:left-[96px]' : 'md:left-[272px]'}`}
              >
                <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-white/5">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-emerald-500" />
                    <h3 className="font-bold font-display text-theme-heading text-base">Notification Logs</h3>
                  </div>
                  <div className="flex items-center gap-3">
                    {notifications.length > 0 && (
                      <button
                        onClick={() => setNotifications([])}
                        className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 font-semibold cursor-pointer"
                      >
                        Clear All
                      </button>
                    )}
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                    >
                      ✕ Close
                    </button>
                  </div>
                </div>

                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                  {notifications.map((notif, idx) => {
                    const getCategoryConfig = (cat: AppNotification['category']) => {
                      switch (cat) {
                        case 'Habits':
                          return {
                            icon: Flame,
                            bgClass: 'bg-amber-50 dark:bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400',
                            badgeBg: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
                            label: 'Habits'
                          };
                        case 'Tasks':
                          return {
                            icon: CheckSquare,
                            bgClass: 'bg-sky-50 dark:bg-sky-500/10 border-sky-500/20 text-sky-600 dark:text-sky-400',
                            badgeBg: 'bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
                            label: 'Tasks'
                          };
                        case 'Focus':
                          return {
                            icon: Timer,
                            bgClass: 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400',
                            badgeBg: 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
                            label: 'Focus'
                          };
                        case 'Inbox':
                          return {
                            icon: Inbox,
                            bgClass: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400',
                            badgeBg: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
                            label: 'Inbox'
                          };
                        case 'System':
                        default:
                          return {
                            icon: Info,
                            bgClass: 'bg-purple-50 dark:bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400',
                            badgeBg: 'bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
                            label: 'System'
                          };
                      }
                    };

                    const config = getCategoryConfig(notif.category);
                    const IconComponent = config.icon;

                    return (
                      <div
                        key={notif.id || idx}
                        className="p-3 rounded-2xl bg-slate-100/80 dark:bg-white/5 border border-slate-200 dark:border-white/5 hover:bg-slate-200/80 dark:hover:bg-white/10 transition-all flex items-start gap-3 relative group"
                      >
                        <div className={`p-1.5 rounded-lg border ${config.bgClass} shrink-0 mt-0.5`}>
                          <IconComponent className="w-3.5 h-3.5" />
                        </div>

                        <div className="flex-1 min-w-0 pr-10">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md border ${config.badgeBg}`}>
                              {config.label}
                            </span>
                          </div>
                          <p className="text-xs text-[var(--text-color)] opacity-95 leading-relaxed font-medium break-words">
                            {notif.message}
                          </p>
                        </div>

                        <span className="absolute top-3 right-3 text-[9px] font-mono font-medium text-slate-500 dark:text-slate-400">
                          {notif.timestamp}
                        </span>
                      </div>
                    );
                  })}
                  {notifications.length === 0 && (
                    <div className="text-center py-8 space-y-2">
                      <Bell className="w-8 h-8 text-slate-500 mx-auto opacity-30 animate-pulse" />
                      <p className="text-xs text-[var(--text-color)] opacity-40">No notification logs</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tab Routing renderers */}
          {activeTab === 'home' && (
            <div className="space-y-6">
              {/* Real Device Notification Permission Banner */}
              {preferences.notificationsEnabled !== false && browserNotificationPermission === 'default' && !isNotificationBannerDismissed && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-4 rounded-2xl bg-gradient-to-r from-indigo-900/60 to-violet-900/60 border border-indigo-500/30 text-white flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg backdrop-blur-md"
                >
                  <div className="flex items-center gap-3 text-left">
                    <div className="p-2.5 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-300">
                      <Bell className="w-5 h-5 animate-bounce" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold font-display text-white">Enable Device Notifications</h4>
                      <p className="text-xs text-slate-300 leading-normal">
                        Receive immediate, real-time alerts on your device for deep focus timers, habit milestones, and context reminders.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end">
                    <button
                      onClick={() => {
                        setIsNotificationBannerDismissed(true);
                        localStorage.setItem('notification_banner_dismissed', 'true');
                      }}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
                    >
                      Dismiss
                    </button>
                    <button
                      onClick={requestNotificationPermission}
                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Allow Notifications</span>
                    </button>
                  </div>
                </motion.div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Left/Middle Column (A companion morning briefs, priority stack, voice commands) */}
              <div className="lg:col-span-2 space-y-6">

                {/* GOOD MORNING BRIEF */}
                <GlassCard className="p-6 relative overflow-hidden flex flex-col space-y-4">
                  {/* Custom glowing background decoration */}
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-b from-indigo-500/10 to-transparent pointer-events-none"></div>

                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 uppercase tracking-widest font-bold">Good morning, {userName} ☀️</span>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-theme-heading font-display text-lg">AI Daily Outlook Summary</h3>
                        {(morningBrief as any)?.isLocal && (
                          <span className="px-2 py-0.5 text-[8px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-bold rounded-full font-mono uppercase tracking-wider">⚡ Local Intelligence</span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={triggerMorningBrief}
                      disabled={loadingBrief}
                      className="p-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 transition-all cursor-pointer"
                    >
                      <RefreshCw className={`w-4 h-4 ${loadingBrief ? 'animate-spin' : ''}`} />
                    </button>
                  </div>

                  <div className="p-4 bg-slate-950/10 dark:bg-slate-950/30 rounded-2xl border border-slate-200 dark:border-white/5 text-theme-text">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <AnimatePresence mode="wait">
                          {showAiSummary ? (
                            <motion.div
                              key="expanded"
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="overflow-hidden"
                            >
                              {loadingBrief ? (
                                <div className="space-y-2 py-2">
                                  <div className="h-3 bg-slate-950/10 dark:bg-white/5 rounded-full w-3/4 animate-pulse"></div>
                                  <div className="h-3 bg-slate-950/10 dark:bg-white/5 rounded-full w-1/2 animate-pulse"></div>
                                </div>
                              ) : briefError ? (
                                <div className="py-2">
                                  <p className="text-xs text-rose-500 dark:text-rose-400 leading-snug">{briefError}</p>
                                </div>
                              ) : morningBrief ? (
                                <div className="space-y-3">
                                  <p className="text-xs leading-relaxed italic">"{morningBrief.todaySummary}"</p>

                                  <div className="pt-2 border-t border-slate-200 dark:border-white/5 grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                                    <div>
                                      <span className="block text-[9px] text-theme-subtle font-bold uppercase mb-1">Energy Match Suggestion</span>
                                      <p className="text-theme-text font-medium">{morningBrief.energyPrediction}</p>
                                    </div>
                                    <div>
                                      <span className="block text-[9px] text-theme-subtle font-bold uppercase mb-1">Daily Nudge Alert</span>
                                      <p className="text-theme-text font-medium">{morningBrief.nudge}</p>
                                    </div>
                                  </div>

                                  <div className="pt-2.5 flex justify-center text-center">
                                    <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold italic">"{morningBrief.quote}"</p>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-xs text-theme-subtle leading-snug">Click the refresh icon to load your personalized morning brief summary!</p>
                              )}
                            </motion.div>
                          ) : (
                            <motion.div
                              key="collapsed"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="text-xs text-theme-subtle italic cursor-pointer line-clamp-1"
                              onClick={() => setShowAiSummary(true)}
                            >
                              {loadingBrief ? (
                                <span className="animate-pulse">Analyzing schedule...</span>
                              ) : briefError ? (
                                <span className="text-rose-500">{briefError}</span>
                              ) : morningBrief ? (
                                <span>"{morningBrief.todaySummary}"</span>
                              ) : (
                                <span>Click the refresh icon to load your personalized morning brief summary!</span>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      <button
                        onClick={() => setShowAiSummary(!showAiSummary)}
                        className="p-1.5 rounded bg-slate-200/50 dark:bg-slate-800/50 hover:bg-slate-300 dark:hover:bg-slate-800 border border-slate-200 dark:border-white/5 text-theme-subtle hover:text-theme-heading transition-colors shrink-0"
                      >
                        <ChevronDown className={`w-4 h-4 transition-transform ${showAiSummary ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                  </div>
                </GlassCard>

                {/* TODAY PRIORITY STACK */}
                <GlassCard className="p-5 space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-white/5">
                    <h3 className="font-bold text-theme-heading font-display text-sm">Today's Priority Stack</h3>
                    <button
                      onClick={() => setActiveTab('tasks')}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 font-semibold cursor-pointer"
                    >
                      Manage all
                    </button>
                  </div>

                  <div className="space-y-3">
                    {(() => {
                      const isToday = (dateStr?: string) => {
                        if (!dateStr) return false;
                        try {
                          const d = new Date(dateStr);
                          const today = new Date();
                          return d.getDate() === today.getDate() &&
                                 d.getMonth() === today.getMonth() &&
                                 d.getFullYear() === today.getFullYear();
                        } catch (e) {
                          return false;
                        }
                      };

                      const todaysPending = tasks.filter(t => {
                        if (t.status === 'completed') return false;
                        const isCreatedToday = isToday(t.createdAt);
                        const isDueToday = isToday(t.deadline);
                        const isOverdue = new Date(t.deadline).getTime() < Date.now();
                        return isCreatedToday || isDueToday || isOverdue;
                      });

                      if (todaysPending.slice(0, 3).length === 0) {
                        return (
                          <div className="text-center py-6">
                            <p className="text-theme-subtle text-xs">No pending tasks for today. Great job staying ahead of deadlines!</p>
                          </div>
                        );
                      }

                      return todaysPending.slice(0, 3).map((task) => {
                        const priorityColor =
                          task.priority === 'critical' ? 'bg-rose-500' :
                            task.priority === 'high' ? 'bg-amber-500' :
                              task.priority === 'medium' ? 'bg-indigo-500' : 'bg-emerald-500';

                        return (
                          <div
                            key={task.id}
                            className="p-3 bg-slate-950/10 dark:bg-slate-950/25 border border-slate-200 dark:border-white/5 rounded-2xl flex items-center justify-between gap-4 hover:bg-slate-950/20 dark:hover:bg-slate-950/45 transition-all"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              {/* Complete Task Checkbox */}
                              <button
                                onClick={async () => {
                                  await handleUpdateTask(task.id, { status: 'completed' });
                                  addNotification(`Task completed: ${task.title}`, 'Tasks');
                                }}
                                className="w-5 h-5 rounded-lg border border-slate-300 dark:border-white/20 flex items-center justify-center hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all cursor-pointer shrink-0 group/btn"
                                title="Mark task as complete"
                              >
                                <div className="w-2.5 h-2.5 rounded bg-transparent group-hover/btn:bg-emerald-500 transition-colors"></div>
                              </button>

                              <span className={`w-2 h-2 rounded-full shrink-0 ${priorityColor}`}></span>
                              <div className="truncate">
                                <h4 className="font-semibold text-theme-heading text-xs truncate">{task.title}</h4>
                                <span className="text-[9px] text-theme-subtle font-mono block">
                                  Due: {new Date(task.deadline).toLocaleString(undefined, {
                                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                  })}
                                </span>
                              </div>
                            </div>

                            <button
                              onClick={() => {
                                setActiveTab('focus');
                              }}
                              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold rounded-xl transition-all cursor-pointer shrink-0"
                            >
                              Focus Now
                            </button>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </GlassCard>

                {/* DAILY HABITS STACK */}
                <GlassCard className="p-5 space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-white/5">
                    <h3 className="font-bold text-theme-heading font-display text-sm">Daily Habit Consistency</h3>
                    <button
                      onClick={() => setActiveTab('goals')}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 font-semibold cursor-pointer"
                    >
                      Manage all
                    </button>
                  </div>

                  <div className="space-y-3">
                    {habits.length === 0 ? (
                      <div className="text-center py-6">
                        <p className="text-theme-subtle text-xs">No active habits. Create some in Goals & Habits tab to build your streak!</p>
                      </div>
                    ) : (
                      habits.slice(0, 4).map((habit) => {
                        const todayStr = new Date().toISOString().slice(0, 10);
                        const completedToday = habit.history.includes(todayStr);

                        return (
                          <div
                            key={habit.id}
                            className="p-3 bg-slate-950/10 dark:bg-slate-950/25 border border-slate-200 dark:border-white/5 rounded-2xl flex items-center justify-between gap-4 hover:bg-slate-950/20 dark:hover:bg-slate-950/45 transition-all"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              {/* Checkbox for completing today's habit */}
                              <button
                                onClick={() => {
                                  const completedToday = habit.history.includes(todayStr);
                                  let updatedHistory = [...habit.history];
                                  let newStreak = habit.streakDays;

                                  if (completedToday) {
                                    updatedHistory = updatedHistory.filter((d) => d !== todayStr);
                                    newStreak = Math.max(0, newStreak - 1);
                                  } else {
                                    updatedHistory.push(todayStr);
                                    newStreak += 1;
                                  }

                                  const newLongest = Math.max(habit.longestStreak, newStreak);

                                  handleUpdateHabit(habit.id, {
                                    history: updatedHistory,
                                    streakDays: newStreak,
                                    longestStreak: newLongest,
                                  });

                                  addNotification(
                                    completedToday
                                      ? `Habit unchecked: ${habit.name}`
                                      : `Habit checked: ${habit.name}! Streak: ${newStreak} days`,
                                    'Habits'
                                  );
                                }}
                                className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all cursor-pointer shrink-0 ${completedToday
                                    ? 'bg-emerald-500 border-emerald-600 text-white shadow-sm'
                                    : 'border-slate-300 dark:border-white/20 hover:bg-emerald-500/10 hover:border-emerald-500/30'
                                  }`}
                                title={completedToday ? "Mark as incomplete for today" : "Mark as complete for today"}
                              >
                                {completedToday && <Check className="w-3.5 h-3.5 text-white" />}
                              </button>

                              <div className="truncate">
                                <h4 className="font-semibold text-theme-heading text-xs truncate">{habit.name}</h4>
                                <p className="text-[10px] text-theme-subtle truncate">{habit.description || 'Compound daily habit.'}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-full">
                              <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500/20" />
                              <span className="text-[10px] font-mono font-bold text-orange-600 dark:text-orange-400">{habit.streakDays}d</span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </GlassCard>

              </div>

              {/* Right Column (Achievements, Streak trackers, User Bio card) */}
              <div className="space-y-6">

                {/* USER PROFILE & SUMMARY */}
                <GlassCard 
                  onClick={() => setShowBadgesModal(true)}
                  className="hidden md:flex p-5 items-center gap-4 border-indigo-500/10 cursor-pointer hover:border-indigo-500/30 transition-all"
                  hoverEffect={true}
                >
                  <div className="w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-lg font-display">
                    {userName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-theme-heading text-sm font-display">{userName}</h3>
                    <span className="text-[10px] text-indigo-600 dark:text-indigo-400 capitalize font-mono font-bold tracking-wider">{userRole}</span>
                  </div>
                </GlassCard>

                {/* ACHIEVEMENT CORNER */}
                <GlassCard className="p-4 space-y-3 relative overflow-hidden group/corner">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-theme-heading font-display text-xs uppercase tracking-wider">Unlocked Badges</h4>
                    <button
                      onClick={() => setShowBadgesModal(true)}
                      className="p-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-400 hover:text-indigo-300 transition-all cursor-pointer flex items-center justify-center"
                      title="View all badges"
                    >
                      <Award className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {(() => {
                      const currentMonth = new Date().getMonth();
                      const activeBadgeIndexes = [
                        currentMonth,
                        (currentMonth + 1) % 12,
                        (currentMonth + 2) % 12,
                      ];
                      const displayBadges = activeBadgeIndexes.map(idx => MONTH_BADGES[idx]);
                      
                      return displayBadges.map((badge) => {
                        const unlocked = isMonthUnlocked(badge.month);
                        return (
                          <div
                            key={badge.name}
                            onClick={() => setShowBadgesModal(true)}
                            className={`p-2 bg-slate-950/10 dark:bg-slate-950/20 border transition-all cursor-pointer rounded-xl text-center space-y-1 relative overflow-hidden ${
                              unlocked
                                ? `border-indigo-500/40 bg-gradient-to-br ${badge.color}/10 hover:border-indigo-500/60 scale-100 shadow-[0_0_12px_rgba(99,102,241,0.12)]`
                                : 'border-slate-200 dark:border-white/5 grayscale opacity-35 hover:opacity-60'
                            }`}
                            title={badge.desc + (unlocked ? ' (Unlocked!)' : ' (Locked)')}
                          >
                            <span className="text-lg block">{badge.icon}</span>
                            <span className="text-[9px] text-theme-text font-medium block truncate">{badge.name}</span>
                            <span className="text-[7px] text-theme-subtle block font-mono">
                              {unlocked ? 'Unlocked' : 'Locked'}
                            </span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </GlassCard>


                {/* ACCOUNTABILITY STREAK CHECKS */}
                <GlassCard className="p-5 space-y-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-orange-500/5 rounded-full blur-xl"></div>

                  <div className="flex items-center gap-2">
                    <Flame className="w-5 h-5 text-orange-500 fill-orange-500/10 animate-bounce" />
                    <div>
                      <h4 className="font-semibold text-theme-heading text-xs">Accountability Streak</h4>
                      <p className="text-[10px] text-theme-subtle">Track continuous task completions.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="bg-slate-950/10 dark:bg-slate-950/20 p-3 rounded-xl border border-slate-200 dark:border-white/5">
                      <span className="block text-[10px] text-theme-subtle font-semibold uppercase">Daily Score</span>
                      <span className="text-xl font-bold font-mono text-theme-heading mt-1 block">
                        {(() => {
                          const isToday = (dateStr?: string) => {
                            if (!dateStr) return false;
                            try {
                              const d = new Date(dateStr);
                              const today = new Date();
                              return d.getDate() === today.getDate() &&
                                     d.getMonth() === today.getMonth() &&
                                     d.getFullYear() === today.getFullYear();
                            } catch (e) {
                              return false;
                            }
                          };
                          const todaysTasks = tasks.filter(t => {
                            const isCreatedToday = isToday(t.createdAt);
                            const isDueToday = isToday(t.deadline);
                            const isCompletedToday = t.status === 'completed' && isToday(t.completedAt || t.updatedAt);
                            return isCreatedToday || isDueToday || isCompletedToday;
                          });
                          const completedToday = todaysTasks.filter(t => t.status === 'completed').length;
                          return `${completedToday} / ${todaysTasks.length}`;
                        })()}
                      </span>
                    </div>

                    <div className="bg-slate-950/10 dark:bg-slate-950/20 p-3 rounded-xl border border-slate-200 dark:border-white/5">
                      <span className="block text-[10px] text-theme-subtle font-semibold uppercase">Streaks</span>
                      <span className="text-xl font-bold font-mono text-orange-600 dark:text-orange-400 mt-1 block">
                        {habits.reduce((acc, h) => Math.max(acc, h.streakDays), 0)} days
                      </span>
                    </div>
                  </div>
                </GlassCard>


                {/* PERSONALIZED PRODUCTIVITY RECOMMENDATIONS */}
                <RecommendationsCard
                  tasks={tasks}
                  habits={habits}
                  focusSessions={focusSessions}
                />

              </div>
            </div>
            </div>
          )}

          {activeTab === 'tasks' && (
            <TaskCenter
              tasks={tasks}
              onAddTask={handleAddTask}
              onUpdateTask={handleUpdateTask}
              onDeleteTask={handleDeleteTask}
            />
          )}

          {activeTab === 'calendar' && (
            <CalendarCenter
              tasks={tasks}
              onAddTask={handleAddTask}
              onUpdateTask={(task) => handleUpdateTask(task.id, task)}
              onDeleteTask={handleDeleteTask}
              theme={theme}
              googleToken={googleToken}
              setGoogleToken={setGoogleToken}
              onLinkGoogleCalendar={handleLinkGoogleCalendar}
            />
          )}

          {activeTab === 'inbox' && (
            <InboxAnalyzer
              onAddTask={(taskData) => {
                handleAddTask(taskData);
                addNotification(`Task extracted from Inbox: ${taskData.title}`, 'Inbox');
              }}
            />
          )}

          {activeTab === 'focus' && (
            <FocusMode
              tasks={tasks}
              onAddSession={handleAddSession}
              onUpdateTask={handleUpdateTask}
              onActiveChange={(active, title) => {
                setIsFocusSessionActive(active);
                setCurrentFocusTaskTitle(title);
              }}
            />
          )}

          {activeTab === 'goals' && (
            <GoalCenter
              goals={goals}
              habits={habits}
              onAddGoal={handleAddGoal}
              onAddHabit={handleAddHabit}
              onUpdateGoal={handleUpdateGoal}
              onUpdateHabit={handleUpdateHabit}
              onDeleteGoal={handleDeleteGoal}
              onDeleteHabit={handleDeleteHabit}
            />
          )}

          {activeTab === 'insights' && (
            <InsightsCenter
              tasks={tasks}
              focusSessions={focusSessions}
              habits={habits}
              goals={goals}
              analysis={analysis}
              onUpdateAnalysis={setAnalysis}
              onTriggerNotification={(message, category) => addNotification(message, category)}
              isFocusSessionActive={isFocusSessionActive}
              currentTaskTitle={currentFocusTaskTitle}
              onAddTask={handleAddTask}
              onUpdateTask={handleUpdateTask}
              onLaunchFocus={handleLaunchFocusFromVoice}
              onAddHabit={handleAddHabit}
              onUpdateHabit={handleUpdateHabit}
              onAddGoal={handleAddGoal}
            />
          )}
          
          {/* Monthly Achievements Docket Popup Modal */}
          <AnimatePresence>
            {showBadgesModal && (
              <div 
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
                onClick={() => setShowBadgesModal(false)}
              >
                {/* Modal Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-slate-950/70 backdrop-blur-md cursor-pointer"
                  onClick={() => setShowBadgesModal(false)}
                />

                {/* Modal Card */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  onClick={(e) => e.stopPropagation()}
                  className="relative w-full max-w-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-white/10 p-6 rounded-3xl shadow-2xl backdrop-blur-2xl text-slate-800 dark:text-white z-10 max-h-[85vh] overflow-y-auto"
                >
                  {/* Header */}
                  <div className="flex justify-between items-center pb-4 border-b border-slate-200 dark:border-white/10">
                    <div className="flex items-center gap-2">
                      <Award className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
                      <h3 className="font-bold font-display text-lg text-theme-heading">Monthly Achievements Docket</h3>
                    </div>
                    <button
                      onClick={() => setShowBadgesModal(false)}
                      className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white cursor-pointer px-2.5 py-1 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg transition-colors"
                    >
                      ✕ Close
                    </button>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-theme-subtle leading-relaxed my-4">
                    Unlock monthly badges by completing tasks during each respective calendar month. Keep checking off your items on time to light up your entire calendar in full color!
                  </p>

                  {/* Visual Progress Bar */}
                  {(() => {
                    const unlockedCount = MONTH_BADGES.filter(b => isMonthUnlocked(b.month)).length;
                    const percentage = Math.round((unlockedCount / 12) * 100);
                    return (
                      <div className="bg-slate-50 dark:bg-slate-950/20 border border-slate-150 dark:border-white/5 p-4 rounded-2xl mb-6 space-y-2.5 shadow-sm">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">12-Month Goal Progress</span>
                          <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono bg-indigo-500/10 px-2 py-0.5 rounded-full">
                            {unlockedCount} / 12 Unlocked ({percentage}%)
                          </span>
                        </div>
                        <div className="w-full h-3.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden relative p-[2px]">
                          <motion.div
                            className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            transition={{ duration: 1.2, ease: 'easeOut' }}
                          />
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-theme-subtle">
                          <span className="font-medium">
                            {percentage === 0 ? "Complete tasks in any month to begin your journey! 🌱" :
                             percentage < 25 ? "Off to a great start! Keep it up! 🚀" :
                             percentage < 50 ? "Making steady progress! Quarter-way there! ✨" :
                             percentage < 75 ? "Over halfway! You are doing amazing! 🌟" :
                             percentage < 100 ? "So close to a perfect year! Just a few more! 🔥" :
                             "Incredible! 12-Month Year fully completed! 🏆 Certified Master Organizer!"}
                          </span>
                          <span className="text-indigo-500 dark:text-indigo-400 font-bold uppercase tracking-wider font-mono">
                            {percentage === 100 ? "COMPLETED" : `${12 - unlockedCount} remaining`}
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Grid of 12 Month Badges */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {MONTH_BADGES.map((badge) => {
                      const unlocked = isMonthUnlocked(badge.month);
                      const isNewlyUnlocked = newlyUnlockedMonthIndices.includes(badge.month);
                      const CONFETTI_COLORS = ['bg-pink-500', 'bg-purple-500', 'bg-blue-500', 'bg-emerald-500', 'bg-yellow-500', 'bg-rose-500'];
                      return (
                        <motion.div
                          key={badge.name}
                          initial={isNewlyUnlocked ? { scale: 0.85, rotate: -3 } : { scale: 1, rotate: 0 }}
                          animate={isNewlyUnlocked ? {
                            scale: [1, 1.25, 1.05, 1],
                            rotate: [0, 8, -8, 0],
                            boxShadow: [
                              "0 0 0px rgba(99,102,241,0)",
                              "0 0 35px rgba(99,102,241,0.6)",
                              "0 0 20px rgba(99,102,241,0.35)",
                              "0 0 15px rgba(99,102,241,0.15)"
                            ]
                          } : { scale: 1, rotate: 0 }}
                          transition={isNewlyUnlocked ? {
                            duration: 1.2,
                            ease: "easeInOut",
                            times: [0, 0.3, 0.6, 1]
                          } : {}}
                          className={`p-4 bg-slate-50 dark:bg-slate-950/40 border transition-all rounded-2xl text-center space-y-2 relative group overflow-hidden ${
                            unlocked
                              ? `border-indigo-500/30 bg-gradient-to-br ${badge.color}/10 shadow-[0_0_15px_rgba(99,102,241,0.15)]`
                              : 'border-slate-150 dark:border-white/5 grayscale opacity-30 hover:opacity-50'
                          }`}
                        >
                          {unlocked && (
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-shimmer" />
                          )}
                          
                          {/* Circular Burst Confetti Particle System */}
                          {isNewlyUnlocked && (
                            <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
                              {Array.from({ length: 16 }).map((_, i) => {
                                const angle = (i / 16) * 2 * Math.PI;
                                const distance = 35 + Math.random() * 35;
                                const x = Math.cos(angle) * distance;
                                const y = Math.sin(angle) * distance;
                                const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
                                const size = 4 + Math.random() * 4;
                                return (
                                  <motion.div
                                    key={i}
                                    className={`absolute left-1/2 top-1/2 rounded-full ${color}`}
                                    style={{
                                      width: size,
                                      height: size,
                                      x: "-50%",
                                      y: "-50%"
                                    }}
                                    initial={{ opacity: 1, scale: 0, x: "-50%", y: "-50%" }}
                                    animate={{
                                      opacity: [1, 1, 0],
                                      scale: [0.5, 1.4, 0],
                                      x: `calc(-50% + ${x}px)`,
                                      y: `calc(-50% + ${y}px)`,
                                    }}
                                    transition={{
                                      duration: 1.5,
                                      ease: "easeOut",
                                      delay: Math.random() * 0.15
                                    }}
                                  />
                                );
                              })}
                            </div>
                          )}

                          <span className={`text-3xl block transition-transform duration-300 ${unlocked ? 'group-hover:scale-110' : ''}`}>
                            {badge.icon}
                          </span>
                          <div>
                            <span className="text-xs text-slate-800 dark:text-white font-bold block truncate">{badge.name}</span>
                            <span className="text-[9px] text-slate-500 dark:text-slate-400 block mt-0.5 leading-tight">{badge.desc}</span>
                          </div>
                          <span className={`inline-block text-[8px] font-mono font-bold px-2 py-0.5 rounded-full ${
                            unlocked 
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700/50'
                          }`}>
                            {unlocked ? 'Unlocked' : 'Locked'}
                          </span>
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Footer Stats summary */}
                  <div className="mt-6 pt-4 border-t border-slate-200 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
                    <div className="text-slate-500 dark:text-slate-400 font-mono">
                      Overall Progress: <span className="text-indigo-600 dark:text-indigo-400 font-bold">{MONTH_BADGES.filter(b => isMonthUnlocked(b.month)).length}</span> / 12 Unlocked
                    </div>
                    <div className="text-slate-400 dark:text-slate-500 text-[10px]">
                      *Based on completed task histories in your smart list
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

        </motion.main>
      </div>

      {/* GLOBAL FLOATING VOICE ASSISTANT */}
      <VoiceAssistant
        onAddTask={handleAddTask}
        onLaunchFocus={handleLaunchFocusFromVoice}
        onAddHabit={handleAddHabit}
        onAddGoal={handleAddGoal}
      />

      {/* FULLSCREEN FLIP CLOCK OVERLAY */}
      <AnimatePresence>
        {showFlipClock && (
          <FlipClock onClose={() => setShowFlipClock(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
