export type Priority = 'critical' | 'high' | 'medium' | 'low';
export type EnergyLevel = 'deep' | 'light' | 'admin' | 'quick';
export type TaskStatus = 'todo' | 'in_progress' | 'completed';

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
  estimatedMinutes?: number;
}

export interface Task {
  id: string;
  userId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  energyRequired: EnergyLevel;
  deadline: string; // ISO datetime
  estimatedDuration: number; // in minutes
  aiPredictedDuration?: number; // in minutes
  subtasks: SubTask[];
  projectId?: string;
  goalId?: string;
  tags: string[];
  contextTags: string[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  snoozedUntil?: string;
  procrastinationRisk?: 'low' | 'medium' | 'high';
  aiPriorityScore?: number; // 0-100
  aiPriorityExplanation?: string;
  aiSuggestedPriority?: Priority;
  aiUrgencyStatus?: 'immediate' | 'high' | 'normal';
}

export interface Habit {
  id: string;
  userId: string;
  name: string;
  description: string;
  streakDays: number;
  longestStreak: number;
  category: string;
  createdAt: string;
  history: string[]; // List of 'YYYY-MM-DD' dates completed
}

export interface Goal {
  id: string;
  userId: string;
  title: string;
  description: string;
  targetDate: string;
  category: string;
  progress: number; // 0 to 100
  healthScore: number; // 0 to 100
  createdAt: string;
}

export interface FocusSession {
  id: string;
  userId: string;
  taskId?: string;
  taskTitle?: string;
  durationMinutes: number;
  type: 'pomodoro' | 'deep' | 'sprint' | 'custom';
  completedAt: string;
  distractionsCount: number;
  subtasksCompleted: number;
}

export interface AIAnalysis {
  id: string;
  userId: string;
  generatedAt: string;
  completionRate: number;
  peakHours: string;
  procrastinationRisk: 'low' | 'medium' | 'high';
  weeklyReport: string; // markdown report
  recommendations: string[];
}

export interface MorningBrief {
  todaySummary: string;
  priorityTaskIds: string[];
  energyPrediction: string;
  quote: string;
  nudge: string;
}

export interface UserPreferences {
  aiPersonality: 'mentor' | 'coach' | 'friendly' | 'strict';
  nudgeFrequency: 'low' | 'medium' | 'high';
  wakeTime: string; // "HH:MM"
  sleepTime: string; // "HH:MM"
  notificationsEnabled?: boolean;
  deviceNotificationsEnabled?: boolean;
}

export interface AppNotification {
  id: string;
  message: string;
  category: 'Habits' | 'Tasks' | 'System' | 'Focus' | 'Inbox';
  timestamp: string; // e.g., "10:15 AM" or formatted time
}

