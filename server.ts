import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage } from '@langchain/core/messages';

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialization function for the LangChain model
function getAIModel() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in the secrets settings.');
  }
  // Standard LangChain model setup
  return new ChatGoogleGenerativeAI({
    apiKey: apiKey,
    model: 'gemini-3.5-flash',
    temperature: 0.3,
  });
}

// Helper to safely clean markdown from JSON responses
function extractJson(text: string): string {
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.substring(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.substring(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.substring(0, cleaned.length - 3);
  }
  return cleaned.trim();
}

function getFriendlyErrorMessage(error: any): string {
  const msg = error?.message || String(error);
  if (msg.includes('429') || msg.includes('QuotaExhaustedError') || msg.includes('quota')) {
    return 'You have exceeded your Gemini API quota. Please check your plan and billing details.';
  }
  if (msg.includes('403') || msg.includes('API key not valid')) {
    return 'Invalid or missing API key. Please check your Gemini API key in settings.';
  }
  return 'AI service is temporarily unavailable. Please try again later.';
}

// AI Route: Task Decomposition (Auto-breakdown)
app.post('/api/ai/breakdown', async (req, res) => {
  const { title = '', description = '' } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'Task title is required' });
  }

  try {
    let model;
    try {
      model = getAIModel();
    } catch (e: any) {
      throw new Error('AI Model not configured');
    }

    const prompt = `You are "The Last-Minute Life Saver" productivity companion.
Break down the following task into 3 to 6 practical, highly granular, actionable subtasks.
Each subtask should include a realistic time estimate in minutes.
Also, predict a realistic total duration (aiPredictedDuration) in minutes, and estimate procrastinationRisk ('low' | 'medium' | 'high').

Task Title: ${title}
Task Description: ${description || 'No description provided.'}

Return ONLY a valid raw JSON object matching this TypeScript structure:
{
  "subtasks": [
    { "id": "string (unique temporary id)", "title": "string (subtask action)", "completed": false, "estimatedMinutes": number }
  ],
  "aiPredictedDuration": number,
  "procrastinationRisk": "low" | "medium" | "high"
}`;

    const response = await model.invoke(prompt);
    const cleanedText = extractJson(response.content as string);
    const result = JSON.parse(cleanedText);
    res.json(result);
  } catch (error: any) {
    console.warn('AI Error in task breakdown, returning programmatic fallback:', error.message);
    const fallbackDuration = description.includes('long') || title.length > 25 ? 90 : 45;
    res.json({
      subtasks: [
        { id: `sub-${Math.random().toString(36).substr(2, 9)}`, title: "Research and outline the immediate next steps", completed: false, estimatedMinutes: Math.round(fallbackDuration * 0.3) },
        { id: `sub-${Math.random().toString(36).substr(2, 9)}`, title: "Execute the core implementation / task work", completed: false, estimatedMinutes: Math.round(fallbackDuration * 0.5) },
        { id: `sub-${Math.random().toString(36).substr(2, 9)}`, title: "Review, test and refine output/draft", completed: false, estimatedMinutes: Math.round(fallbackDuration * 0.2) }
      ],
      aiPredictedDuration: fallbackDuration,
      procrastinationRisk: "medium",
      isFallback: true
    });
  }
});

// AI Route: Good Morning Brief
app.post('/api/ai/morning-brief', async (req, res) => {
  const { userName, tasks = [], goals = [], habits = [], personality = 'mentor' } = req.body;

  try {
    let model;
    try {
      model = getAIModel();
    } catch (e: any) {
      throw new Error('AI Model not configured');
    }

    const personalityPrompts = {
      mentor: 'Wise, supportive, patient, and growth-oriented. "You\'ve got this. Let\'s break this down together."',
      coach: 'Direct, motivating, goal-focused, and highly energetic. "3 tasks left. You\'re close. Push through."',
      friendly: 'Casual, helpful, low-key, conversational, and warm. "Hey! Just a reminder that your report is coming up."',
      strict: 'No-nonsense, accountability-first, clear, and firm. "Task overdue. Act now."'
    };

    const prompt = `You are "The Last-Minute Life Saver" productivity companion with a personality of a "${personality}".
Style guide for "${personality}": ${personalityPrompts[personality as keyof typeof personalityPrompts] || personalityPrompts.mentor}

Review the user's data and write a personalized dynamic Morning Brief.
User Name: ${userName || 'User'}
Today's Tasks: ${JSON.stringify(tasks || [])}
Habits Trackers: ${JSON.stringify(habits || [])}
Long-term Goals: ${JSON.stringify(goals || [])}

Create a morning brief containing:
1. todaySummary: A beautiful short summary of their day (max 3 sentences). Encourage starting with their highest priority items.
2. priorityTaskIds: An array of string IDs of up to 2 tasks that they should prioritize first.
3. energyPrediction: A 1-sentence tip recommending how to match their tasks to their energy.
4. quote: A motivational quote matching their current vibe and personality choice.
5. nudge: A context-aware reminder/nudge to prevent procrastination today.

Return ONLY a valid raw JSON object matching this structure:
{
  "todaySummary": "string",
  "priorityTaskIds": ["string"],
  "energyPrediction": "string",
  "quote": "string",
  "nudge": "string"
}`;

    const response = await model.invoke(prompt);
    const cleanedText = extractJson(response.content as string);
    const result = JSON.parse(cleanedText);
    res.json(result);
  } catch (error: any) {
    console.warn('AI Error in morning brief, returning programmatic fallback:', error.message);
    const pending = (tasks || []).filter((t: any) => t.status !== 'completed');
    const criticals = pending.filter((t: any) => t.priority === 'critical' || t.priority === 'high');
    const priorityTaskIds = pending.slice(0, 2).map((t: any) => t.id);

    const quotes = [
      "The secret of getting ahead is getting started. - Mark Twain",
      "Action is the foundational key to all success. - Pablo Picasso",
      "Do the hard jobs first. The easy jobs will take care of themselves. - Dale Carnegie",
      "Your mind is for having ideas, not holding them. - David Allen"
    ];
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];

    res.json({
      todaySummary: `Welcome back, ${userName || 'User'}! You have ${pending.length} pending tasks today${criticals.length > 0 ? `, including ${criticals.length} high priority items` : ''}. Let's target your highest impact work first.`,
      priorityTaskIds,
      energyPrediction: "Prioritize high-energy deep focus blocks in the morning, and leave low-energy quick tasks for later in the day.",
      quote: randomQuote,
      nudge: "Action is the ultimate cure for fear and delay. Select a critical task and set a 15-minute timer.",
      isFallback: true
    });
  }
});

// AI Route: Habit Learning and Procrastination Analysis (Insights)
app.post('/api/ai/analyze-habits', async (req, res) => {
  const { tasks = [], focusSessions = [], habits = [], goals = [] } = req.body;

  try {
    let model;
    try {
      model = getAIModel();
    } catch (e: any) {
      throw new Error('AI Model not configured');
    }

    const prompt = `You are "The Last-Minute Life Saver" productivity intelligence engine.
Analyze the user's task history, focus sessions, and habit tracking records. Look for procrastination patterns, peak performance hours, completion ratios, and consistency trends. 

Tasks Data: ${JSON.stringify(tasks || [])}
Focus Sessions Data: ${JSON.stringify(focusSessions || [])}
Habits Data: ${JSON.stringify(habits || [])}
Goals Data: ${JSON.stringify(goals || [])}

Create an in-depth productivity analysis:
1. completionRate: calculated percentage of tasks completed (e.g. 85)
2. peakHours: user's most productive time of day (e.g. "10:00 AM - 12:00 PM") based on focus sessions and completed times, or generalized if no data.
3. procrastinationRisk: overall procrastination risk assessment ('low' | 'medium' | 'high')
4. weeklyReport: A beautifully written markdown report with:
   - "Weekly Performance Evaluation"
   - "Identified Procrastination & Attention Patterns" (analyze how often tasks are delayed, energy required, or if focus sessions had high distractions)
   - "Actionable habit learning insights"
5. recommendations: An array of 3 specific, actionable recommendations to improve performance.

Return ONLY a valid raw JSON object matching this structure:
{
  "completionRate": number,
  "peakHours": "string",
  "procrastinationRisk": "low" | "medium" | "high",
  "weeklyReport": "string (formatted in markdown)",
  "recommendations": ["string"]
}`;

    const response = await model.invoke(prompt);
    const cleanedText = extractJson(response.content as string);
    const result = JSON.parse(cleanedText);
    res.json(result);
  } catch (error: any) {
    console.warn('AI Error in habit analysis, returning fallback insights:', error.message);
    const total = tasks.length;
    const completed = tasks.filter((t: any) => t.status === 'completed').length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

    let peakHours = "No focus sessions logged yet";
    if (focusSessions.length > 0) {
      const hours = focusSessions.map((f: any) => {
        const d = new Date(f.completedAt);
        return d.getHours();
      });
      const avgHour = hours.reduce((acc: number, curr: number) => acc + curr, 0) / hours.length;
      if (avgHour < 12) {
        peakHours = "8:30 AM - 11:30 AM (Morning Flow)";
      } else if (avgHour < 17) {
        peakHours = "1:30 PM - 4:00 PM (Afternoon Focus)";
      } else {
        peakHours = "7:00 PM - 9:30 PM (Night Owl Block)";
      }
    }

    const procrastinationRisk = total > 0 
      ? (rate > 75 ? 'low' : rate > 50 ? 'medium' : 'high')
      : 'low';

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
      weeklyReport = `### Productivity Evaluation (Adaptive Mode)
Based on your registered actions, tasks, and habit tracking history:
- **Task Resolution**: You completed **${completed} out of ${total} registered tasks** (${rate}% task completion rate).
- **Deep Focus Endurance**: You have tracked **${focusSessions.length} focus sessions**, building mental discipline and flow states.
- **Attentional Focus Peak**: Your focus patterns indicate highest concentration during **${peakHours}**.

#### Identified Procrastination & Attention Patterns
${total > 0 ? `1. **Initiation Friction**: Out of ${total} tasks, ${tasks.filter((t: any) => t.status === 'todo').length} are still in pending state. Large tasks with deep energy requirements may require decomposition.` : `1. **No Task Data**: Please add tasks and prioritize them to analyze initiation friction.`}
${focusSessions.length > 0 ? `2. **Cognitive Match Efficiency**: Your focus session logs show optimal attention retention during **${peakHours}**.` : `2. **No Focus Data**: Track focus sessions to analyze your peak focus times.`}

#### Actionable habit learning insights
- **The Micro-Entry Shield**: To counter high-friction task starts, use 15-minute pomodoros instead of indefinite deep focus blocks.
- **Strategic Time Chunking**: Dedicate your calculated peak focus block (**${peakHours}**) exclusively to complex tasks requiring deep focus.`;

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

    res.json({
      completionRate: rate,
      peakHours,
      procrastinationRisk,
      weeklyReport,
      recommendations,
      isFallback: true
    });
  }
});

// AI Route: Natural Language Task Voice/Text Commander
app.post('/api/ai/voice-command', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Command text is required' });
    }

    let model;
    try {
      model = getAIModel();
    } catch (e: any) {
      return res.status(500).json({ error: 'AI model is not configured. Please set GEMINI_API_KEY.' });
    }

    const prompt = `You are "The Last-Minute Life Saver" voice parsing assistant.
Interpret the following user command (which might be spoken or typed) to understand what they want to do.

Command: "${text}"

They might be trying to:
1. Create a task (e.g., "Add task submit project report by Friday 5pm with high priority")
2. Start a focus session (e.g., "Start a 45 min deep work session on writing")
3. Create/Check-in a habit (e.g., "Log reading habit today")
4. Create/Add a goal/milestone/vision (e.g., "Add goal to save 5000 dollars by end of year" or "Create a learning goal to master machine learning by October")

Analyze the command and parse out:
- "type": "task" | "focus" | "habit" | "goal" | "unknown"
- "data": parsed properties appropriate for that type:
  - For "task": title, description, priority ('critical' | 'high' | 'medium' | 'low'), energyRequired ('deep' | 'light' | 'admin' | 'quick'), deadline (ISO 8601 datetime, today is ${new Date().toISOString()}), estimatedDuration (in minutes).
  - For "focus": durationMinutes (number), focusType ('pomodoro' | 'deep' | 'sprint' | 'custom').
  - For "habit": name, category.
  - For "goal": title, description, targetDate (ISO 8601 date YYYY-MM-DD format, today is ${new Date().toISOString()}), category ('work' | 'health' | 'personal' | 'learning' | 'finance'), progress (0), healthScore (100).
- "feedback": A warm, personality-rich spoken feedback response (max 2 sentences) confirming what was understood and executed.

Return ONLY a valid raw JSON object matching this structure:
{
  "type": "task" | "focus" | "habit" | "goal" | "unknown",
  "data": object,
  "feedback": "string"
}`;

    const response = await model.invoke(prompt);
    const cleanedText = extractJson(response.content as string);
    const result = JSON.parse(cleanedText);
    res.json(result);
  } catch (error: any) {
    console.warn('AI Error in voice command processing:', error.message);
    res.status(500).json({ error: getFriendlyErrorMessage(error) });
  }
});

// AI Route: Task Priority and Urgency Analysis (LangChain-powered advisor)
app.post('/api/ai/prioritize', async (req, res) => {
  const { tasks = [], currentDate = new Date().toISOString() } = req.body;
  if (!tasks || !Array.isArray(tasks)) {
    return res.status(400).json({ error: 'Tasks list is required and must be an array.' });
  }

  const pendingTasks = tasks.filter(t => t.status !== 'completed');
  if (pendingTasks.length === 0) {
    return res.json({
      prioritizedTasks: [],
      alerts: [],
      globalRecommendation: "You have no pending tasks! Great job staying ahead of your schedule."
    });
  }

  try {
    let model;
    try {
      model = getAIModel();
    } catch (e: any) {
      throw new Error('AI Model not configured');
    }

    const prompt = `You are "The Last-Minute Life Saver" Task Priority and Urgency Advisor.
Your job is to strategically analyze the user's pending tasks relative to the current reference time and calculate a smart, hyper-logical Priority Score (0 to 100) and urgency alert assessment.

Current Reference Time: ${currentDate}
Pending Tasks to Analyze:
${JSON.stringify(pendingTasks.map(t => ({
  id: t.id,
  title: t.title,
  description: t.description || '',
  priority: t.priority,
  energyRequired: t.energyRequired,
  deadline: t.deadline,
  estimatedDuration: t.estimatedDuration,
  subtasksCount: t.subtasks?.length || 0,
  completedSubtasksCount: t.subtasks?.filter((s: any) => s.completed)?.length || 0
})))}

Calculation Criteria for Priority Score (0-100):
- Deadline Proximity: Tasks with deadlines in the next few hours should receive very high scores (85-100). Tasks due in < 24 hours should be high (70-85).
- Existing Priority Level: Critical and high priority tasks get a base boost.
- Work Volume & Energy: High duration/energy tasks (e.g. Deep Work) with tight deadlines should be elevated because they require substantial effort and cannot be rushed.
- Procrastination Risk: Factor in how easily the user might delay this task.

Output Goals:
1. For each task, provide an calculated aiPriorityScore (0-100), a suggestedPriority ('critical' | 'high' | 'medium' | 'low') based on urgency, an explanation (1-2 sentences) of the logic, and an urgencyStatus ('immediate' | 'high' | 'normal').
2. Identify 1 to 3 critical "Alerts" or urgent notifications that require immediate user action or a specific proactive advice.
3. Provide a warm, actionable "globalRecommendation" (max 3 sentences) to guide the user on their optimal workflow today.

Return ONLY a valid raw JSON object matching this TypeScript structure:
{
  "prioritizedTasks": [
    {
      "id": "string (matching the task id)",
      "aiPriorityScore": number (0-100),
      "suggestedPriority": "critical" | "high" | "medium" | "low",
      "explanation": "string",
      "urgencyStatus": "immediate" | "high" | "normal"
    }
  ],
  "alerts": [
    {
      "taskId": "string",
      "type": "critical" | "warning" | "info",
      "message": "string (bold, crisp alert notifying the user why this task is critical)"
    }
  ],
  "globalRecommendation": "string"
}`;

    const response = await model.invoke(prompt);
    const cleanedText = extractJson(response.content as string);
    const result = JSON.parse(cleanedText);
    res.json(result);
  } catch (error: any) {
    console.warn('AI Error in task prioritization, returning programmatic fallback:', error.message);
    const prioritizedTasks = pendingTasks.map((t: any) => {
      const pScore = t.priority === 'critical' ? 95 : t.priority === 'high' ? 80 : t.priority === 'medium' ? 60 : 35;
      return {
        id: t.id,
        aiPriorityScore: pScore,
        suggestedPriority: t.priority || 'medium',
        explanation: `Strategically analyzed as a ${t.priority || 'medium'} priority task. Ensure you budget appropriate time before deadline.`,
        urgencyStatus: pScore >= 80 ? 'high' : 'normal'
      };
    });

    const alerts = [];
    const criticalTask = pendingTasks.find((t: any) => t.priority === 'critical');
    if (criticalTask) {
      alerts.push({
        taskId: criticalTask.id,
        type: "critical" as const,
        message: `Critical task "${criticalTask.title}" requires immediate structured execution!`
      });
    }

    res.json({
      prioritizedTasks,
      alerts,
      globalRecommendation: "Tackle your highest priority tasks first to build early momentum. Break complex tasks down into simple subtasks."
    });
  }
});

// AI Route: Inbox Message / Mail Analyzer
app.post('/api/ai/analyze-inbox', async (req, res) => {
  const { content = '', sourceType = 'auto', image = '' } = req.body;
  if ((!content || !content.trim()) && (!image || !image.trim())) {
    return res.status(400).json({ error: 'Content or image is required for analysis' });
  }

  try {
    let model;
    try {
      model = getAIModel();
    } catch (e: any) {
      throw new Error('AI Model not configured');
    }

    const prompt = `You are "The Last-Minute Life Saver" Inbox and Message Parser.
Analyze the following raw message, email, chat clip, notification, or screenshot image and extract a clean, actionable task structure from it.

Source Type Hint: ${sourceType}
${content ? `Additional Text/Context Provided:\n"""\n${content}\n"""` : ''}

Please perform the following analysis:
1. Title: A concise, action-oriented title for the extracted task.
2. Description: A refined summary of the background details, context, or notes.
3. Priority: Determine the urgency and importance ('critical' | 'high' | 'medium' | 'low').
4. Energy Required: Determine the energy required ('deep' | 'light' | 'admin' | 'quick').
5. Suggested Deadline: Predict a realistic deadline as an ISO 8601 string. Today is ${new Date().toISOString()}. Look for terms like "by Friday", "tomorrow morning", "ASAP", or calculate a reasonable default (e.g., 2 days from now) if no timeframe is specified. Format as YYYY-MM-DDTHH:MM (e.g. 2026-06-27T17:00).
6. Estimated Duration: Strategic estimate of total minutes required to complete the task.
7. Subtasks: Breakdown of 3-5 tactical sub-steps to accomplish this task, each with a title and estimatedMinutes.
8. AI Rationale: A 2-sentence explanation of why these parameters (like deadline or priority) were chosen from the text or screenshot.

Return ONLY a valid raw JSON object matching this structure:
{
  "title": "string",
  "description": "string",
  "priority": "critical" | "high" | "medium" | "low",
  "energyRequired": "deep" | "light" | "admin" | "quick",
  "deadline": "string (ISO 8601 YYYY-MM-DDTHH:MM format)",
  "estimatedDuration": number,
  "subtasks": [
    { "title": "string", "estimatedMinutes": number }
  ],
  "aiRationale": "string"
}`;

    let response;
    if (image && image.trim()) {
      const message = new HumanMessage({
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: image } }
        ]
      });
      response = await model.invoke([message]);
    } else {
      response = await model.invoke(prompt);
    }

    const cleanedText = extractJson(response.content as string);
    const result = JSON.parse(cleanedText);
    res.json(result);
  } catch (error: any) {
    console.warn('AI Error in inbox analyzer:', error.message);
    // Provide a smart local fallback
    res.json({
      title: image ? "Extracted Task from Screenshot" : "Extracted Urgent Task",
      description: content ? content.slice(0, 150) + "..." : "Extracted and structured from the uploaded image / screenshot.",
      priority: "medium",
      energyRequired: "light",
      deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
      estimatedDuration: 45,
      subtasks: [
        { title: "Review the original message and outline action steps", estimatedMinutes: 15 },
        { title: "Draft and execute the required response or deliverable", estimatedMinutes: 20 },
        { title: "Send updates and follow up if necessary", estimatedMinutes: 10 }
      ],
      aiRationale: "This is a programmatic fallback task extracted because the AI is loading or encountered a server error."
    });
  }
});

// Vite & Static Asset Handling
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[LMLS Server] running on http://localhost:${PORT}`);
  });
}

startServer();
