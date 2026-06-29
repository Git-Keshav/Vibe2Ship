import { Task, Goal, Habit, FocusSession, AIAnalysis, MorningBrief } from '../types';

/**
 * ⚡ Offline-First Local Intelligence Engine
 * Provides rich, fast, rule-based and semantic heuristic local intelligence Fallbacks
 * so that 'Done Before Due' works 100% offline or when internet connectivity is lost!
 */

// --- 1. MORNING BRIEF GENERATOR ---
export function generateLocalMorningBrief(
  userName: string,
  tasks: Task[],
  habits: Habit[],
  goals: Goal[],
  personality: 'mentor' | 'coach' | 'friendly' | 'strict'
): MorningBrief {
  const pending = tasks.filter(t => t.status !== 'completed');
  const criticals = pending.filter(t => t.priority === 'critical' || t.priority === 'high');
  
  // Sort pending by priority/deadline to pick top 2 priority tasks
  const sortedPending = [...pending].sort((a, b) => {
    const scoreA = (a.priority === 'critical' ? 3 : a.priority === 'high' ? 2 : a.priority === 'medium' ? 1 : 0);
    const scoreB = (b.priority === 'critical' ? 3 : b.priority === 'high' ? 2 : b.priority === 'medium' ? 1 : 0);
    return scoreB - scoreA;
  });
  const priorityTaskIds = sortedPending.slice(0, 2).map(t => t.id);

  // Personality-specific prompts and quotes
  const quotes = {
    mentor: [
      "The secret of getting ahead is getting started. - Mark Twain",
      "Do not watch the clock; do what it does. Keep going. - Sam Levenson",
      "Small daily improvements over time lead to stunning results. - Robin Sharma"
    ],
    coach: [
      "No excuses. Play like a champion today. - Coach’s Creed",
      "Action is the foundational key to all success. - Pablo Picasso",
      "You don't have to be great to start, but you have to start to be great. - Zig Ziglar"
    ],
    friendly: [
      "Your mind is for having ideas, not holding them. - David Allen",
      "Focus is a muscle, and you're building it right now. - Keep Up",
      "Just 15 minutes of focus will completely change your mood. - Simple Wisdom"
    ],
    strict: [
      "Amateurs sit and wait for inspiration, the rest of us just get to work. - Stephen King",
      "Do the hard jobs first. The easy jobs will take care of themselves. - Dale Carnegie",
      "Overcoming procrastination is a choice. Make it now. - No Excuses"
    ]
  };

  const selectedQuotes = quotes[personality] || quotes.mentor;
  const quote = selectedQuotes[Math.floor(Math.random() * selectedQuotes.length)];

  const summaries = {
    mentor: `Hello, ${userName}! Today is about steady growth. You have ${pending.length} tasks waiting for your focus${criticals.length > 0 ? `, including ${criticals.length} highly important items` : ''}. Let's approach these mindfully and step-by-step.`,
    coach: `Alright, ${userName}! Game on. There are ${pending.length} pending plays in your task deck today${criticals.length > 0 ? ` with ${criticals.length} critical actions` : ''}. Time to execute, block out distractions, and build early momentum!`,
    friendly: `Hey there, ${userName}! Happy to see you. We've got ${pending.length} items to tick off the list today${criticals.length > 0 ? ` (${criticals.length} need some quick attention!)` : ''}. Take a deep breath and let's tackle the top ones first.`,
    strict: `Attention, ${userName}. Your ledger shows ${pending.length} incomplete tasks today${criticals.length > 0 ? `, with ${criticals.length} marked high-urgency` : ''}. Delaying critical items decreases executive control. Review your priority checklist immediately.`
  };

  const energyTips = {
    mentor: "Match your deep work tasks with your highest cognitive energy window this morning, and save admin items for a late afternoon cooldown.",
    coach: "Attack your heaviest 'Deep Work' task right out of the gate while your motivation is peak. Lock down a win early!",
    friendly: "Feeling a bit low on energy? Try tackling a quick 'admin' task or 'light' chore first to get some easy checks on the board.",
    strict: "Avoid multitasking. Dedicate an absolute, uninterrupted 30-minute block specifically for your highest priority item."
  };

  const nudges = {
    mentor: "Remember, starting is the hardest part. Just commit to opening the document or workspace for 5 minutes.",
    coach: "The best time to start was yesterday. The second best time is right now. Set a focus session!",
    friendly: "No pressure at all. Just pick one small item from the list and work on it. Every step counts!",
    strict: "Silence notifications, close unrelated tabs, and initiate the primary task. Action beats hesitation."
  };

  return {
    todaySummary: summaries[personality] || summaries.mentor,
    priorityTaskIds,
    energyPrediction: energyTips[personality] || energyTips.mentor,
    quote,
    nudge: nudges[personality] || nudges.mentor
  };
}

// --- 2. TASK DECOMPOSITION ENGINE ---
export function generateLocalTaskBreakdown(title: string, description: string): {
  subtasks: { id: string; title: string; completed: boolean; estimatedMinutes: number }[];
  aiPredictedDuration: number;
  procrastinationRisk: 'low' | 'medium' | 'high';
} {
  const normalizedTitle = title.toLowerCase();
  const normalizedDesc = description.toLowerCase();
  const allText = `${normalizedTitle} ${normalizedDesc}`;

  let subtasks: { title: string; estimatedMinutes: number }[] = [];
  let predictedDuration = 45;
  let risk: 'low' | 'medium' | 'high' = 'medium';

  // Topic Spotting and customized breakdown structures
  if (allText.includes('report') || allText.includes('essay') || allText.includes('paper') || allText.includes('write') || allText.includes('document')) {
    subtasks = [
      { title: "Define outline structure and core thesis points", estimatedMinutes: 15 },
      { title: "Gather reference material and quick research data", estimatedMinutes: 20 },
      { title: "Draft the introductory paragraph and main body outline", estimatedMinutes: 25 },
      { title: "Write core content sections with zero distractions", estimatedMinutes: 45 },
      { title: "Review for clarity, spelling, and polished flow", estimatedMinutes: 15 }
    ];
    predictedDuration = 120;
    risk = 'high';
  } else if (allText.includes('code') || allText.includes('program') || allText.includes('bug') || allText.includes('dev') || allText.includes('app') || allText.includes('build')) {
    subtasks = [
      { title: "Pinpoint code file locations and isolate current bug/state", estimatedMinutes: 15 },
      { title: "Draft implementation design or mock up the logical flow", estimatedMinutes: 15 },
      { title: "Write clean code logic and review local console output", estimatedMinutes: 45 },
      { title: "Refactor code structure and test edge cases", estimatedMinutes: 20 },
      { title: "Submit code changes or perform final compile checks", estimatedMinutes: 10 }
    ];
    predictedDuration = 105;
    risk = 'medium';
  } else if (allText.includes('clean') || allText.includes('tidy') || allText.includes('organize') || allText.includes('room') || allText.includes('house') || allText.includes('laundry')) {
    subtasks = [
      { title: "Sort physical clutter into keep, relocate, and discard piles", estimatedMinutes: 10 },
      { title: "Clean and dust elevated surfaces", estimatedMinutes: 15 },
      { title: "Vacuum, sweep, or mop the floor area", estimatedMinutes: 15 },
      { title: "Organize items back into their designated spots", estimatedMinutes: 10 }
    ];
    predictedDuration = 50;
    risk = 'low';
  } else if (allText.includes('study') || allText.includes('exam') || allText.includes('learn') || allText.includes('read') || allText.includes('lecture')) {
    subtasks = [
      { title: "Skim through lecture slide decks or syllabus outlines", estimatedMinutes: 10 },
      { title: "Draft flashcards or a brief summary sheet of key definitions", estimatedMinutes: 25 },
      { title: "Review challenging concepts and work on 2 practice problems", estimatedMinutes: 30 },
      { title: "Do a quick active-recall quiz to lock in comprehension", estimatedMinutes: 15 }
    ];
    predictedDuration = 80;
    risk = 'high';
  } else if (allText.includes('call') || allText.includes('email') || allText.includes('reply') || allText.includes('meeting') || allText.includes('schedule')) {
    subtasks = [
      { title: "Confirm meeting agenda details or outline core talking points", estimatedMinutes: 5 },
      { title: "Draft clear, bulleted text for correspondence or emails", estimatedMinutes: 15 },
      { title: "Send off correspondence or complete the actual voice call", estimatedMinutes: 10 },
      { title: "File calendar items, follow-up dates, and task notes", estimatedMinutes: 5 }
    ];
    predictedDuration = 35;
    risk = 'low';
  } else {
    // Elegant generic fallback
    subtasks = [
      { title: "Clarify scope, list materials, and map out immediate steps", estimatedMinutes: 10 },
      { title: "Set up physical / digital workspace with zero notification noise", estimatedMinutes: 5 },
      { title: "Focus entirely on executing the core task volume", estimatedMinutes: 30 },
      { title: "Perform final polish, save work, and verify completion criteria", estimatedMinutes: 10 }
    ];
    predictedDuration = 55;
    risk = 'medium';
  }

  // Map to include random but structured IDs
  const subtasksWithId = subtasks.map((st, i) => ({
    id: `local-sub-${Math.random().toString(36).substring(2, 9)}-${i}`,
    title: st.title,
    completed: false,
    estimatedMinutes: st.estimatedMinutes
  }));

  return {
    subtasks: subtasksWithId,
    aiPredictedDuration: predictedDuration,
    procrastinationRisk: risk
  };
}

// --- 3. PRODUCTIVITY HABIT ANALYSIS ---
export function generateLocalHabitAnalysis(
  tasks: Task[],
  focusSessions: FocusSession[],
  habits: Habit[],
  goals: Goal[]
): AIAnalysis {
  const total = tasks.length;
  const completed = tasks.filter(t => t.status === 'completed').length;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Compute peak focus hours based on focus sessions completion logs
  let peakHours = "No focus sessions logged yet";
  if (focusSessions.length > 0) {
    const hours = focusSessions.map(f => {
      const d = new Date(f.completedAt);
      return d.getHours();
    });
    const avgHour = hours.reduce((acc, curr) => acc + curr, 0) / hours.length;
    if (avgHour < 12) {
      peakHours = "8:30 AM - 11:30 AM (Morning Flow)";
    } else if (avgHour < 17) {
      peakHours = "1:30 PM - 4:00 PM (Afternoon Focus)";
    } else {
      peakHours = "7:00 PM - 9:30 PM (Night Owl Block)";
    }
  }

  const procrastinationRisk = total > 0 
    ? (completionRate > 80 ? 'low' : completionRate > 55 ? 'medium' : 'high')
    : 'low';

  // Build high quality, extremely smart Markdown Evaluation Report locally
  const activeStreak = habits.length > 0 ? Math.max(...habits.map(h => h.streakDays)) : 0;
  const completedFocusMinutes = focusSessions.reduce((acc, curr) => acc + curr.durationMinutes, 0);

  let weeklyReport = '';
  let recommendations: string[] = [];

  if (total === 0 && focusSessions.length === 0 && habits.length === 0 && goals.length === 0) {
    weeklyReport = `### 📊 Real-time Productivity Snapshot

You currently do not have any registered tasks, focus sessions, habits, or goals in your productivity ledger.

To generate a personalized, in-depth AI analysis of your work patterns:
1. **Create Tasks**: Add items to your active list and assign priority/energy values.
2. **Launch Focus Sessions**: Use the built-in Pomodoro timer to record real focused work.
3. **Log Habits**: Track daily streaks on your health and intellectual routines.
4. **Define Vision Goals**: Link day-to-day work directly with larger milestone targets.`;

    recommendations = [
      "Add your first task in the Tasks panel to kick off your productivity tracking.",
      "Initiate a short Focus Session (e.g. 25-minute Pomodoro) to record focus duration.",
      "Track at least one wellness or work habit to establish routine consistency."
    ];
  } else {
    weeklyReport = `### ⚡ Local Intelligence Ledger (Offline Adaptive Mode)

Based on your local device history, database snapshots, and activity logs:

- **Weekly Task Velocity**: You completed **${completed} out of ${total} registered tasks** (${completionRate}% task resolution efficiency).
- **Deep Focus Endurance**: You clocked a total of **${completedFocusMinutes} deep focus minutes** across **${focusSessions.length} sessions**, maintaining high distraction-shield integrity.
- **Habit Consistency Loops**: Your peak active consistency streak is **${activeStreak} consecutive days**. Habit loops are stabilizing.

#### Identified Procrastination & Attention Patterns
${total > 0 ? `1. **Initiation Friction**: Out of ${total} tasks, ${tasks.filter(t => t.status === 'todo').length} are still in pending state. Large tasks with deep energy requirements may require decomposition.` : `1. **No Task Data**: Please add tasks and prioritize them to analyze initiation friction.`}
${focusSessions.length > 0 ? `2. **Cognitive Match Efficiency**: Your focus session logs show optimal attention retention during **${peakHours}**.` : `2. **No Focus Data**: Track focus sessions to analyze your peak focus times.`}
${habits.length > 0 ? `3. **Habit Attachment**: You have ${habits.length} active habits registered. Consistency streaks help build automaticity.` : `3. **No Habit Data**: Set up habits to build consistent daily routines.`}

#### Actionable Habit Learning Insights
- **The Micro-Entry Shield**: To counter high-friction task starts, use 15-minute pomodoros instead of indefinite deep focus blocks.
${focusSessions.length > 0 ? `- **Cognitive Energy Layering**: Schedule your 'deep' cognitive energy tasks strictly during your calculated peak focus window of **${peakHours}**.` : `- **Track Focus**: Log focus blocks to find your biological peak energy hours.`}
- **Streak Anchoring**: Combine your habits! Link a pending habit directly to an already completed routine (e.g. log reading right after completing physical exercise).`;

    recommendations = [
      total > 0 
        ? "Break down your pending complex tasks into subtasks of 15 minutes or less to reduce friction."
        : "Add your first set of tasks to populate the activity dashboard.",
      focusSessions.length > 0
        ? `Schedule your demanding 'Deep Work' items specifically during your peak focus window of ${peakHours}.`
        : "Record at least one 25-minute focus block to test your cognitive endurance.",
      "Use a 5-minute warm-up session on a light task to bridge the mental barrier to complex work."
    ];
  }

  return {
    id: `local-analysis-${Date.now()}`,
    userId: 'local',
    generatedAt: new Date().toISOString(),
    completionRate,
    peakHours,
    procrastinationRisk,
    weeklyReport,
    recommendations
  };
}

// --- 4. VOICE COMMAND PARSER ---
export function parseLocalVoiceCommand(text: string): {
  type: 'task' | 'focus' | 'habit' | 'goal' | 'unknown';
  data: any;
  feedback: string;
} {
  const norm = text.toLowerCase().trim();
  
  // Triggers
  const isFocus = norm.includes('focus') || norm.includes('pomodoro') || norm.includes('sprint') || norm.includes('timer') || norm.includes('start');
  const isHabit = norm.includes('habit') || norm.includes('log') || norm.includes('streak') || norm.includes('track');
  const isGoal = norm.includes('goal') || norm.includes('vision') || norm.includes('milestone') || norm.includes('aim');
  const isTask = norm.includes('add') || norm.includes('task') || norm.includes('todo') || norm.includes('remind') || norm.includes('create');

  if (isFocus) {
    // Look for minutes
    const numbers = norm.match(/\d+/);
    const durationMinutes = numbers ? parseInt(numbers[0], 10) : 25;
    let focusType: 'pomodoro' | 'deep' | 'sprint' | 'custom' = 'pomodoro';
    if (norm.includes('deep') || durationMinutes >= 45) {
      focusType = 'deep';
    } else if (norm.includes('sprint') || durationMinutes <= 15) {
      focusType = 'sprint';
    }

    return {
      type: 'focus',
      data: { durationMinutes, focusType },
      feedback: `Got it! Preparing to start a ${durationMinutes}-minute ${focusType} focus session. Let's block out all distractions.`
    };
  }

  if (isHabit) {
    // Parse name
    let name = "New Habit";
    if (norm.includes('log')) {
      const parts = norm.split('log');
      if (parts[1]) name = parts[1].replace(/habit/g, '').trim();
    } else if (norm.includes('habit')) {
      const parts = norm.split('habit');
      if (parts[1]) name = parts[1].trim();
    } else if (norm.includes('track')) {
      const parts = norm.split('track');
      if (parts[1]) name = parts[1].trim();
    }

    // Capitalize first letter
    name = name.charAt(0).toUpperCase() + name.slice(1);

    return {
      type: 'habit',
      data: {
        name,
        description: "Created dynamically via offline voice commander.",
        streakDays: 0,
        longestStreak: 0,
        category: norm.includes('work') || norm.includes('study') ? 'work' : 'health',
        history: []
      },
      feedback: `Understood! I've set up a tracker for your new habit: "${name}". Let's start building that consistency.`
    };
  }

  if (isGoal) {
    let title = "New Goal";
    if (norm.includes('add goal')) {
      title = norm.split('add goal')[1] || title;
    } else if (norm.includes('create goal')) {
      title = norm.split('create goal')[1] || title;
    } else if (norm.includes('goal')) {
      title = norm.split('goal')[1] || title;
    } else if (norm.includes('add vision')) {
      title = norm.split('add vision')[1] || title;
    } else if (norm.includes('vision')) {
      title = norm.split('vision')[1] || title;
    } else if (norm.includes('add milestone')) {
      title = norm.split('add milestone')[1] || title;
    } else if (norm.includes('milestone')) {
      title = norm.split('milestone')[1] || title;
    } else if (norm.includes('add')) {
      title = norm.split('add')[1] || title;
    }

    title = title.replace(/by\s+\w+/g, '').replace(/at\s+\w+/g, '').trim();
    if (title.startsWith('to ')) title = title.substring(3);
    title = title.charAt(0).toUpperCase() + title.slice(1);

    let category = 'work';
    if (norm.includes('health') || norm.includes('fitness') || norm.includes('exercise')) {
      category = 'health';
    } else if (norm.includes('personal') || norm.includes('life') || norm.includes('self')) {
      category = 'personal';
    } else if (norm.includes('study') || norm.includes('learn') || norm.includes('academic')) {
      category = 'learning';
    } else if (norm.includes('finance') || norm.includes('money') || norm.includes('save')) {
      category = 'finance';
    }

    const targetDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    return {
      type: 'goal',
      data: {
        title,
        description: "Created dynamically via offline voice commander.",
        targetDate,
        category,
        progress: 0,
        healthScore: 100
      },
      feedback: `Understood! I've set up your new vision goal: "${title}", categorized under ${category.toUpperCase()}.`
    };
  }

  if (isTask) {
    // Parse task title
    let title = "New Task";
    if (norm.includes('add task')) {
      title = norm.split('add task')[1] || title;
    } else if (norm.includes('add')) {
      title = norm.split('add')[1] || title;
    } else if (norm.includes('todo')) {
      title = norm.split('todo')[1] || title;
    } else if (norm.includes('create')) {
      title = norm.split('create')[1] || title;
    }

    // Clean up title
    title = title.replace(/by\s+\w+/g, '').replace(/at\s+\w+/g, '').trim();
    if (title.startsWith('to ')) title = title.substring(3);
    title = title.charAt(0).toUpperCase() + title.slice(1);

    // Priorities
    let priority: 'critical' | 'high' | 'medium' | 'low' = 'medium';
    if (norm.includes('critical') || norm.includes('urgent') || norm.includes('asap')) {
      priority = 'critical';
    } else if (norm.includes('high') || norm.includes('important')) {
      priority = 'high';
    } else if (norm.includes('low') || norm.includes('minor')) {
      priority = 'low';
    }

    // Energy
    let energyRequired: 'deep' | 'light' | 'admin' | 'quick' = 'light';
    if (norm.includes('deep') || norm.includes('hard') || norm.includes('heavy') || norm.includes('difficult')) {
      energyRequired = 'deep';
    } else if (norm.includes('quick') || norm.includes('fast') || norm.includes('short')) {
      energyRequired = 'quick';
    } else if (norm.includes('admin') || norm.includes('email') || norm.includes('organize')) {
      energyRequired = 'admin';
    }

    // Attempt to extract deadline
    let deadline = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // Default tomorrow
    if (norm.includes('friday')) {
      deadline = getNextDayOfWeek(5);
    } else if (norm.includes('monday')) {
      deadline = getNextDayOfWeek(1);
    } else if (norm.includes('tomorrow')) {
      deadline = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10) + "T17:00:00";
    }

    const duration = norm.includes('hour') ? 60 : norm.includes('half hour') ? 30 : 25;

    return {
      type: 'task',
      data: {
        title,
        description: "Created dynamically via offline voice commander.",
        priority,
        energyRequired,
        deadline,
        estimatedDuration: duration,
        status: 'todo',
        subtasks: []
      },
      feedback: `I've mapped out a new task: "${title}", assigned a priority of ${priority.toUpperCase()} and energy level of ${energyRequired.toUpperCase()}.`
    };
  }

  return {
    type: 'unknown',
    data: null,
    feedback: "I didn't quite capture that command. Try saying something like 'Add task write project draft' or 'Start 30 minute deep focus'."
  };
}

function getNextDayOfWeek(dayOfWeek: number): string {
  const resultDate = new Date();
  resultDate.setDate(resultDate.getDate() + (7 + dayOfWeek - resultDate.getDay()) % 7);
  resultDate.setHours(17, 0, 0, 0); // Default to 5 PM
  return resultDate.toISOString();
}

// --- 5. SMART TASK PRIORITIZER ---
export function generateLocalPrioritization(tasks: Task[]): {
  prioritizedTasks: { id: string; aiPriorityScore: number; suggestedPriority: 'critical' | 'high' | 'medium' | 'low'; explanation: string; urgencyStatus: 'immediate' | 'high' | 'normal' }[];
  alerts: { taskId: string; type: 'critical' | 'warning' | 'info'; message: string }[];
  globalRecommendation: string;
} {
  const pending = tasks.filter(t => t.status !== 'completed');

  const prioritizedTasks = pending.map(t => {
    let score = 50;

    // Base priority adjustments
    if (t.priority === 'critical') score += 25;
    else if (t.priority === 'high') score += 15;
    else if (t.priority === 'low') score -= 15;

    // Deadline adjustments
    const dueTime = new Date(t.deadline).getTime();
    const timeDiff = dueTime - Date.now();
    const hoursLeft = timeDiff / (1000 * 60 * 60);

    if (hoursLeft < 0) {
      score += 25; // Overdue task gets huge boost
    } else if (hoursLeft <= 12) {
      score += 20;
    } else if (hoursLeft <= 24) {
      score += 15;
    } else if (hoursLeft <= 48) {
      score += 8;
    }

    // Duration and energy adjustment
    if (t.energyRequired === 'deep') {
      score += 5; // Deep work needs more lead time
    }

    // Keep score clamped between 0 and 100
    const finalScore = Math.min(Math.max(Math.round(score), 5), 99);

    let suggestedPriority: 'critical' | 'high' | 'medium' | 'low' = 'medium';
    if (finalScore >= 80) suggestedPriority = 'critical';
    else if (finalScore >= 65) suggestedPriority = 'high';
    else if (finalScore >= 40) suggestedPriority = 'medium';
    else suggestedPriority = 'low';

    let urgencyStatus: 'immediate' | 'high' | 'normal' = 'normal';
    if (finalScore >= 80) urgencyStatus = 'immediate';
    else if (finalScore >= 65) urgencyStatus = 'high';

    const deadlineStr = hoursLeft < 0 
      ? "is already overdue" 
      : hoursLeft <= 24 
        ? `is due in ${Math.round(hoursLeft)} hours` 
        : "deadline is upcoming";

    const explanation = `Heuristically calculated priority score of ${finalScore} because this task ${deadlineStr} and requires a ${t.energyRequired} cognitive energy level.`;

    return {
      id: t.id,
      aiPriorityScore: finalScore,
      suggestedPriority,
      explanation,
      urgencyStatus
    };
  });

  // Sort prioritizedTasks by score descending
  prioritizedTasks.sort((a, b) => b.aiPriorityScore - a.aiPriorityScore);

  const alerts: { taskId: string; type: 'critical' | 'warning' | 'info'; message: string }[] = [];
  
  const topCritical = prioritizedTasks[0];
  if (topCritical) {
    const taskObj = pending.find(t => t.id === topCritical.id);
    if (taskObj) {
      alerts.push({
        taskId: topCritical.id,
        type: 'critical',
        message: `🔥 HIGH INITIATION RISK: "${taskObj.title}" has a calculated urgency score of ${topCritical.aiPriorityScore}%! Protect a dedicated focus window now.`
      });
    }
  }

  const secondCritical = prioritizedTasks[1];
  if (secondCritical && secondCritical.aiPriorityScore >= 75) {
    const taskObj = pending.find(t => t.id === secondCritical.id);
    if (taskObj) {
      alerts.push({
        taskId: secondCritical.id,
        type: 'warning',
        message: `⏰ URGENT SEQUENCE: "${taskObj.title}" is close to deadline. Do not delay action loops.`
      });
    }
  }

  const globalRecommendation = pending.length > 0
    ? `We highly recommend initiating "${pending.find(t => t.id === prioritizedTasks[0]?.id)?.title || 'your highest priority task'}" immediately. Group your 'admin' or 'light' items for later to preserve peak morning focus hours.`
    : "Your docket is completely clear! Keep up this incredible performance standard.";

  return {
    prioritizedTasks,
    alerts,
    globalRecommendation
  };
}

// --- 6. INBOX MESSAGE/MAIL PARSER ---
export function parseLocalInbox(content: string, sourceType: string): {
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  energyRequired: 'deep' | 'light' | 'admin' | 'quick';
  deadline: string;
  estimatedDuration: number;
  subtasks: { title: string; estimatedMinutes: number }[];
  aiRationale: string;
} {
  const lines = content.split('\n');
  let title = "Action Item from Message";
  
  // Try to find a nice title from first line
  if (lines[0] && lines[0].trim().length > 5) {
    title = lines[0].trim().substring(0, 60);
    if (title.toLowerCase().startsWith('subject:') || title.toLowerCase().startsWith('re:')) {
      title = title.replace(/subject:|re:/i, '').trim();
    }
  }

  const norm = content.toLowerCase();

  // Urgent spot
  let priority: 'critical' | 'high' | 'medium' | 'low' = 'medium';
  if (norm.includes('urgent') || norm.includes('asap') || norm.includes('deadline') || norm.includes('emergency') || norm.includes('critical') || norm.includes('today')) {
    priority = 'high';
  } else if (norm.includes('low priority') || norm.includes('whenever') || norm.includes('some day')) {
    priority = 'low';
  }

  // Energy & Duration estimate
  let energyRequired: 'deep' | 'light' | 'admin' | 'quick' = 'light';
  let estimatedDuration = 30;
  if (norm.includes('write') || norm.includes('review') || norm.includes('code') || norm.includes('analyze') || norm.includes('report')) {
    energyRequired = 'deep';
    estimatedDuration = 60;
  } else if (norm.includes('quick') || norm.includes('check') || norm.includes('verify')) {
    energyRequired = 'quick';
    estimatedDuration = 15;
  } else if (norm.includes('email') || norm.includes('schedule') || norm.includes('send')) {
    energyRequired = 'admin';
    estimatedDuration = 20;
  }

  // Subtasks extraction
  const subtasks = [
    { title: "Review original email/message details carefully", estimatedMinutes: 10 },
    { title: "Draft and execute the immediate requested action", estimatedMinutes: Math.round(estimatedDuration * 0.6) },
    { title: "Confirm completion or send reply updates", estimatedMinutes: 10 }
  ];

  const aiRationale = `Parsed with client-side heuristic rules (Offline-First mode). Extracted high priority triggers based on message urgency keyword signals.`;

  return {
    title: title.charAt(0).toUpperCase() + title.slice(1),
    description: content.length > 250 ? content.substring(0, 247) + "..." : content,
    priority,
    energyRequired,
    deadline: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().slice(0, 16), // Due in 48 hours
    estimatedDuration,
    subtasks,
    aiRationale
  };
}
