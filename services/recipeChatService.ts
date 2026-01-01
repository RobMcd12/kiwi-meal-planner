import { GoogleGenAI } from "@google/genai";
import { Meal } from "../types";

// Types for the recipe chat
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface CookingTimer {
  id: string;
  name: string;
  durationSeconds: number;
  remainingSeconds: number;
  isRunning: boolean;
  isExpired: boolean;
  createdAt: Date;
}

// Maximum number of concurrent timers
export const MAX_TIMERS = 5;

export interface RecipeChatState {
  messages: ChatMessage[];
  timers: CookingTimer[];
  currentStep: number;
  isListening: boolean;
  isSpeaking: boolean;
}

// Convert word numbers to digits (for voice recognition)
const wordToNumber: Record<string, number> = {
  'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
  'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
  'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15,
  'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19, 'twenty': 20,
  'twenty-one': 21, 'twenty-two': 22, 'twenty-three': 23, 'twenty-four': 24, 'twenty-five': 25,
  'twenty-six': 26, 'twenty-seven': 27, 'twenty-eight': 28, 'twenty-nine': 29, 'thirty': 30,
  'forty': 40, 'forty-five': 45, 'fifty': 50, 'sixty': 60,
  // Common variations
  'to': 2, 'too': 2, 'for': 4, 'fore': 4,
};

// Parse a number from text (handles both digits and words)
const parseNumber = (text: string): number | null => {
  if (!text) return null;
  const trimmed = text.trim().toLowerCase();

  // Try parsing as digit
  const digit = parseInt(trimmed);
  if (!isNaN(digit)) return digit;

  // Try word lookup
  if (wordToNumber[trimmed] !== undefined) {
    return wordToNumber[trimmed];
  }

  // Handle "twenty one" style (without hyphen)
  const parts = trimmed.split(/\s+/);
  if (parts.length === 2) {
    const tens = wordToNumber[parts[0]];
    const ones = wordToNumber[parts[1]];
    if (tens && ones && tens >= 20) {
      return tens + ones;
    }
  }

  return null;
};

// Parse timer commands from user input
// Returns stepNumber when user says "start a timer for step X" (without specifying minutes)
const parseTimerCommand = (text: string): { action: 'start' | 'stop' | 'check' | null; name?: string; minutes?: number; stepNumber?: number; itemName?: string } => {
  const lowerText = text.toLowerCase().trim();

  console.log('Parsing timer command:', lowerText);

  // IMPORTANT: First check if this is a cooking question, NOT a timer command
  // These should go to the AI, not the timer system
  const cookingQuestionPatterns = [
    /how\s+long\s+(?:do\s+i\s+|should\s+i\s+|to\s+)?(?:cook|bake|roast|fry|grill|boil|simmer|steam)/i,
    /how\s+long\s+(?:does|will|should)\s+(?:the\s+|it\s+)?(?:\w+\s+)?(?:cook|bake|take)/i,
    /what\s+(?:is\s+)?(?:the\s+)?(?:cook|cooking|baking)\s*(?:time|duration)/i,
    /how\s+many\s+minutes?\s+(?:do\s+i\s+|should\s+i\s+|to\s+)?cook/i,
  ];

  for (const pattern of cookingQuestionPatterns) {
    if (pattern.test(lowerText)) {
      return { action: null }; // Let the AI handle cooking questions
    }
  }

  // Number pattern that matches both digits and common word numbers
  const numPattern = '(\\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|twenty[- ]?one|twenty[- ]?two|twenty[- ]?three|twenty[- ]?four|twenty[- ]?five|thirty|forty|forty[- ]?five|fifty|sixty)';

  // Check for step-based timer requests FIRST (before other patterns)
  // "start a timer for step 2" or "set timer for step two" or "timer for step 3"
  const stepPattern = new RegExp(`(?:set|start)\\s+(?:a\\s+)?timer\\s+(?:for\\s+)?step\\s+${numPattern}`, 'i');
  const stepMatch = lowerText.match(stepPattern);
  if (stepMatch) {
    const stepNum = parseNumber(stepMatch[1]);
    if (stepNum !== null && stepNum > 0) {
      console.log('Step-based timer request for step:', stepNum);
      return { action: 'start', stepNumber: stepNum };
    }
  }

  // Check for item-based timer without explicit minutes
  // "start a timer for the lamb" or "set a timer for the pasta" (no minutes specified)
  // This will be used to extract time from recipe
  const itemTimerPattern = /(?:set|start)\s+(?:a\s+)?timer\s+(?:for\s+)?(?:the\s+)?(\w+(?:\s+\w+)?)$/i;
  const itemMatch = lowerText.match(itemTimerPattern);
  if (itemMatch && !lowerText.includes('minute') && !lowerText.includes('min')) {
    const itemName = itemMatch[1]?.trim();
    // Make sure it's not "step X" which is handled above
    if (itemName && !itemName.match(/^step\s/i)) {
      console.log('Item-based timer request for:', itemName);
      return { action: 'start', itemName };
    }
  }

  // Start timer patterns - support various ways to specify names
  // Must have explicit timer-related words AND a number
  const startPatterns = [
    // "set a timer for the lamb for 10 minutes" or "start a timer for pasta for 5 minutes"
    new RegExp(`(?:set|start)\\s+(?:a\\s+)?timer\\s+(?:for\\s+)?(?:the\\s+)?(.+?)\\s+(?:for\\s+)?${numPattern}\\s*(?:minute|min)s?`, 'i'),
    // "set timer for 10 minutes for pasta" or "set a timer for 10 minutes for the pasta"
    new RegExp(`(?:set|start)\\s+(?:a\\s+)?timer\\s+(?:for\\s+)?${numPattern}\\s*(?:minute|min)s?\\s+(?:for\\s+)?(?:the\\s+)?(.+)`, 'i'),
    // "set a 10 minute timer for pasta"
    new RegExp(`(?:set|start)\\s+(?:a\\s+)?${numPattern}\\s*(?:minute|min)s?\\s+timer\\s+(?:for\\s+)?(?:the\\s+)?(.+)`, 'i'),
    // "set a 10 minute timer" (no name)
    new RegExp(`(?:set|start)\\s+(?:a\\s+)?${numPattern}\\s*(?:minute|min)s?\\s+timer(?:\\s*$)`, 'i'),
    // "10 minute timer for pasta" (must have "timer" word)
    new RegExp(`^${numPattern}\\s*(?:minute|min)s?\\s+timer\\s+(?:for\\s+)?(?:the\\s+)?(.+)`, 'i'),
    // "timer for 10 minutes for the pasta" or "timer 10 minutes for pasta"
    new RegExp(`^timer\\s+(?:for\\s+)?${numPattern}\\s*(?:minute|min)s?\\s+(?:for\\s+)?(?:the\\s+)?(.+)?`, 'i'),
    // "set pasta timer for 10 minutes" or "start the lamb timer for 15 minutes"
    new RegExp(`(?:set|start)\\s+(?:a\\s+|the\\s+)?(.+?)\\s+timer\\s+(?:for\\s+)?${numPattern}\\s*(?:minute|min)s?`, 'i'),
  ];

  for (const pattern of startPatterns) {
    const match = lowerText.match(pattern);
    if (match) {
      console.log('Timer pattern matched:', pattern.source, 'Groups:', match.slice(1));

      // Determine which capture group has minutes vs name based on pattern
      let minutes: number | null;
      let name: string;

      // Check if first group is a number (minutes) or text (name)
      const firstNum = parseNumber(match[1]);
      if (firstNum !== null) {
        minutes = firstNum;
        name = match[2]?.trim() || 'Cooking timer';
      } else {
        // First group is name, second is minutes
        name = match[1]?.trim() || 'Cooking timer';
        minutes = parseNumber(match[2]);
      }

      // Validate we have valid minutes
      if (minutes !== null && minutes > 0) {
        console.log('Timer command parsed:', { action: 'start', minutes, name });
        return { action: 'start', minutes, name };
      }
    }
  }

  // Dismiss expired timer patterns - simple words to stop the alarm
  // "ok", "okay", "stop", "done", "got it", "thanks", "dismiss"
  if (/^(?:ok(?:ay)?|stop|done|got\s+it|thanks?|dismiss|quiet|silence|hush)$/i.test(lowerText)) {
    return { action: 'stop' };
  }

  // Stop timer patterns - can stop by name
  // "stop the pasta timer" or "cancel rice timer"
  const stopNameMatch = lowerText.match(/(?:stop|cancel)\s+(?:the\s+)?(.+?)\s*timer/i);
  if (stopNameMatch) {
    return { action: 'stop', name: stopNameMatch[1]?.trim() };
  }
  if (/^(?:stop|cancel)\s+(?:the\s+)?timer$|^timer\s+off$/i.test(lowerText)) {
    return { action: 'stop' };
  }

  // Check timer patterns - ONLY match explicit timer status requests
  // Must include "timer" word or be specifically about time remaining
  // "how much time left on the timer" or "check the pasta timer" or "how much time on the pasta timer"

  // First, check for explicit timer status requests
  if (/^(?:check|what'?s?)\s+(?:the\s+)?timer(?:s)?(?:\s+status)?$/i.test(lowerText)) {
    return { action: 'check' };
  }

  if (/^(?:how\s+much\s+)?time\s+(?:left|remaining)(?:\s+on\s+(?:the\s+)?timer)?$/i.test(lowerText)) {
    return { action: 'check' };
  }

  if (/^timer\s+status$/i.test(lowerText)) {
    return { action: 'check' };
  }

  // Check for named timer status: "check the pasta timer" or "how much time on the pasta"
  // But ONLY if it ends with "timer" or explicitly asks about time remaining
  const checkNamedTimerMatch = lowerText.match(/^(?:check|what'?s?)\s+(?:the\s+)?(.+?)\s+timer$/i);
  if (checkNamedTimerMatch) {
    return { action: 'check', name: checkNamedTimerMatch[1]?.trim() };
  }

  // "how much time left on the pasta" or "how much time on the lamb timer"
  const timeLeftMatch = lowerText.match(/^how\s+(?:much\s+)?time\s+(?:left\s+)?(?:on|for)\s+(?:the\s+)?(.+?)(?:\s+timer)?$/i);
  if (timeLeftMatch) {
    const name = timeLeftMatch[1]?.trim();
    // Only treat as timer check if it's not a cooking question
    if (name && !name.match(/cook|bake|roast|fry|grill|boil|simmer/i)) {
      return { action: 'check', name };
    }
  }

  return { action: null };
};

// Generate chat response using Gemini
export const generateChatResponse = async (
  recipe: Meal,
  messages: ChatMessage[],
  userMessage: string,
  currentStep: number,
  timers: CookingTimer[]
): Promise<{ response: string; suggestedTimer?: { name: string; minutes: number } }> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key is missing.");

  const ai = new GoogleGenAI({ apiKey });

  // Build conversation history
  const conversationHistory = messages.slice(-10).map(m =>
    `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`
  ).join('\n');

  // Parse instructions into steps
  const steps = recipe.instructions.split(/\d+\.\s+/).filter(s => s.trim());
  const currentStepText = steps[currentStep] || '';

  // Timer context
  const timerContext = timers.length > 0
    ? `\n\nActive timers: ${timers.map(t => `${t.name}: ${Math.floor(t.remainingSeconds / 60)}m ${t.remainingSeconds % 60}s remaining`).join(', ')}`
    : '';

  const systemPrompt = `You are a friendly, helpful cooking assistant helping someone cook "${recipe.name}".

Recipe Details:
- Name: ${recipe.name}
- Description: ${recipe.description}
- Ingredients: ${recipe.ingredients.join(', ')}
- Instructions: ${recipe.instructions}

Current cooking step (${currentStep + 1}/${steps.length}): ${currentStepText}
${timerContext}

Your responsibilities:
1. Answer questions about the recipe, ingredients, techniques, or substitutions
2. Read out the current step or any step when asked
3. Suggest timers when appropriate (respond with TIMER_SUGGESTION: name, minutes if you think a timer would help)
4. Help with cooking tips and troubleshooting
5. Be encouraging and conversational

Keep responses concise and clear for voice output. Use natural, conversational language.
If asked to read the recipe or a step, read it clearly and at a good pace.
If the user seems confused, offer helpful guidance.`;

  const prompt = `${systemPrompt}

Recent conversation:
${conversationHistory}

User: ${userMessage}

Respond helpfully and concisely:`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
    });

    const responseText = response.text || "I'm sorry, I didn't catch that. Could you repeat?";

    // Check for timer suggestion
    let suggestedTimer: { name: string; minutes: number } | undefined;
    const timerMatch = responseText.match(/TIMER_SUGGESTION:\s*([^,]+),\s*(\d+)/i);
    if (timerMatch) {
      suggestedTimer = {
        name: timerMatch[1].trim(),
        minutes: parseInt(timerMatch[2])
      };
    }

    // Clean up response
    const cleanedResponse = responseText.replace(/TIMER_SUGGESTION:[^\n]+/gi, '').trim();

    return { response: cleanedResponse, suggestedTimer };
  } catch (error) {
    console.error("Chat response error:", error);
    return { response: "I'm having trouble responding right now. Please try again." };
  }
};

// Convert text to be more natural for speech synthesis
// Handles decimals, time ranges, and common patterns
const makeSpeechFriendly = (text: string): string => {
  let result = text;

  // Convert decimal hours to natural speech: "1.5 hours" -> "one and a half hours"
  // "2.5 hours" -> "two and a half hours"
  result = result.replace(/(\d+)\.5\s*(hour|hr)s?/gi, (_, whole, unit) => {
    const num = parseInt(whole);
    if (num === 1) return 'one and a half hours';
    return `${numberToWords(num)} and a half hours`;
  });

  // Convert other decimal hours: "1.25 hours" -> "one point two five hours"
  result = result.replace(/(\d+)\.(\d+)\s*(hour|hr)s?/gi, (_, whole, decimal, unit) => {
    const wholeWords = numberToWords(parseInt(whole));
    const decimalWords = decimal.split('').map((d: string) => numberToWords(parseInt(d))).join(' ');
    return `${wholeWords} point ${decimalWords} hours`;
  });

  // Convert time ranges with dash/to: "1-2 hours" -> "one to two hours"
  // Also handles "1.5-2 hours", "15-20 minutes"
  result = result.replace(/(\d+(?:\.\d+)?)\s*[-–—]\s*(\d+(?:\.\d+)?)\s*(hour|hr|minute|min)s?/gi, (_, start, end, unit) => {
    const startNum = parseFloat(start);
    const endNum = parseFloat(end);
    const unitWord = unit.toLowerCase().startsWith('hour') || unit.toLowerCase().startsWith('hr') ? 'hours' : 'minutes';

    // Handle half hours specially
    const formatTimeNum = (n: number) => {
      if (n === Math.floor(n)) {
        return numberToWords(n);
      } else if (n - Math.floor(n) === 0.5) {
        if (Math.floor(n) === 0) return 'half';
        if (Math.floor(n) === 1) return 'one and a half';
        return `${numberToWords(Math.floor(n))} and a half`;
      } else {
        const whole = Math.floor(n);
        const decimal = n.toString().split('.')[1] || '';
        const decimalWords = decimal.split('').map((d: string) => numberToWords(parseInt(d))).join(' ');
        return `${numberToWords(whole)} point ${decimalWords}`;
      }
    };

    return `${formatTimeNum(startNum)} to ${formatTimeNum(endNum)} ${unitWord}`;
  });

  // Convert standalone decimals with minutes: "1.5 minutes" -> "one and a half minutes"
  result = result.replace(/(\d+)\.5\s*(minute|min)s?/gi, (_, whole) => {
    const num = parseInt(whole);
    if (num === 0) return 'half a minute';
    if (num === 1) return 'one and a half minutes';
    return `${numberToWords(num)} and a half minutes`;
  });

  // Convert temperature with degrees: "350°F" -> "350 degrees Fahrenheit"
  result = result.replace(/(\d+)\s*°\s*F\b/gi, '$1 degrees Fahrenheit');
  result = result.replace(/(\d+)\s*°\s*C\b/gi, '$1 degrees Celsius');

  // Convert fractions: "1/2" -> "one half", "1/4" -> "one quarter", "3/4" -> "three quarters"
  result = result.replace(/\b1\/2\b/g, 'one half');
  result = result.replace(/\b1\/4\b/g, 'one quarter');
  result = result.replace(/\b3\/4\b/g, 'three quarters');
  result = result.replace(/\b1\/3\b/g, 'one third');
  result = result.replace(/\b2\/3\b/g, 'two thirds');

  return result;
};

// Helper to convert small numbers to words for speech
const numberToWords = (n: number): string => {
  const words = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
    'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
  if (n >= 0 && n <= 20) return words[n];
  if (n < 100) {
    const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
    const t = Math.floor(n / 10);
    const u = n % 10;
    return u === 0 ? tens[t] : `${tens[t]} ${words[u]}`;
  }
  return n.toString(); // Fall back to number for larger values
};

// Text-to-Speech functionality
export class RecipeSpeaker {
  private synth: SpeechSynthesis;
  private utterance: SpeechSynthesisUtterance | null = null;
  private onStateChange: (speaking: boolean) => void;
  private selectedVoice: SpeechSynthesisVoice | null = null;
  private isUnlocked: boolean = false;
  private resumeInterval: number | null = null;

  constructor(onStateChange: (speaking: boolean) => void) {
    this.synth = window.speechSynthesis;
    this.onStateChange = onStateChange;
    this.initVoice();
  }

  private initVoice() {
    // Voices may not be loaded immediately, so we need to wait
    const loadVoices = () => {
      const voices = this.synth.getVoices();
      if (voices.length > 0) {
        this.selectedVoice = this.findBestVoice(voices);
      }
    };

    loadVoices();
    // Chrome loads voices asynchronously
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = loadVoices;
    }
  }

  private findBestVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
    // Filter to English voices only
    const englishVoices = voices.filter(v => v.lang.startsWith('en'));

    // Priority order for natural-sounding voices (highest priority first)
    const voicePreferences = [
      // Premium/Neural voices (most natural)
      (v: SpeechSynthesisVoice) => v.name.includes('Premium') || v.name.includes('Neural') || v.name.includes('Enhanced'),
      // Google voices (generally good quality)
      (v: SpeechSynthesisVoice) => v.name.includes('Google') && v.name.includes('UK'),
      (v: SpeechSynthesisVoice) => v.name.includes('Google') && v.name.includes('US'),
      (v: SpeechSynthesisVoice) => v.name.includes('Google'),
      // macOS high-quality voices
      (v: SpeechSynthesisVoice) => v.name === 'Karen' || v.name === 'Daniel' || v.name === 'Moira',
      (v: SpeechSynthesisVoice) => v.name === 'Samantha' || v.name === 'Alex',
      // Microsoft natural voices
      (v: SpeechSynthesisVoice) => v.name.includes('Microsoft') && (v.name.includes('Online') || v.name.includes('Natural')),
      (v: SpeechSynthesisVoice) => v.name.includes('Microsoft'),
      // iOS voices
      (v: SpeechSynthesisVoice) => v.name.includes('Siri'),
      // Any other English voice
      (v: SpeechSynthesisVoice) => v.lang.startsWith('en'),
    ];

    for (const preference of voicePreferences) {
      const match = englishVoices.find(preference);
      if (match) {
        console.log('Selected voice:', match.name, match.lang);
        return match;
      }
    }

    // Fallback to first English voice or any voice
    return englishVoices[0] || voices[0] || null;
  }

  // Unlock audio on mobile - call this from a user gesture (tap/click)
  unlock(): void {
    if (this.isUnlocked) return;

    // Speak empty string to unlock audio context on mobile
    const unlockUtterance = new SpeechSynthesisUtterance('');
    unlockUtterance.volume = 0;
    this.synth.speak(unlockUtterance);
    this.isUnlocked = true;
    console.log('Speech synthesis unlocked for mobile');
  }

  speak(text: string, rate: number = 1.0): Promise<void> {
    return new Promise((resolve, reject) => {
      // Cancel any ongoing speech
      this.stop();

      // iOS Safari fix: cancel and resume to ensure speech works
      this.synth.cancel();

      // Convert text to be more natural for speech
      const speechText = makeSpeechFriendly(text);

      this.utterance = new SpeechSynthesisUtterance(speechText);
      // Slightly slower for clarity but not too slow
      this.utterance.rate = rate;
      // Slightly lower pitch sounds more natural and less robotic
      this.utterance.pitch = 0.95;
      this.utterance.volume = 1;

      // Use the pre-selected best voice
      if (this.selectedVoice) {
        this.utterance.voice = this.selectedVoice;
      } else {
        // Try to find a voice now if not already selected
        const voices = this.synth.getVoices();
        const bestVoice = this.findBestVoice(voices);
        if (bestVoice) {
          this.utterance.voice = bestVoice;
          this.selectedVoice = bestVoice;
        }
      }

      this.utterance.onstart = () => {
        this.onStateChange(true);
        // iOS fix: keep speech synthesis alive by periodically calling resume
        // iOS pauses speechSynthesis after ~15 seconds
        this.startResumeWorkaround();
      };

      this.utterance.onend = () => {
        this.stopResumeWorkaround();
        this.onStateChange(false);
        resolve();
      };

      this.utterance.onerror = (e) => {
        this.stopResumeWorkaround();
        this.onStateChange(false);
        // Don't reject on 'interrupted' or 'canceled' errors
        if (e.error !== 'interrupted' && e.error !== 'canceled') {
          console.error('Speech synthesis error:', e.error);
          reject(e);
        } else {
          resolve();
        }
      };

      // Small delay before speaking to ensure audio context is ready on mobile
      setTimeout(() => {
        this.synth.speak(this.utterance!);
      }, 50);
    });
  }

  // iOS workaround: periodically call resume() to prevent speech from stopping
  private startResumeWorkaround(): void {
    this.stopResumeWorkaround();
    // Resume every 10 seconds to keep iOS speech alive
    this.resumeInterval = window.setInterval(() => {
      if (this.synth.speaking && !this.synth.paused) {
        this.synth.pause();
        this.synth.resume();
      }
    }, 10000);
  }

  private stopResumeWorkaround(): void {
    if (this.resumeInterval) {
      clearInterval(this.resumeInterval);
      this.resumeInterval = null;
    }
  }

  stop() {
    this.stopResumeWorkaround();
    if (this.synth.speaking) {
      this.synth.cancel();
    }
    this.onStateChange(false);
  }

  get isSpeaking(): boolean {
    return this.synth.speaking;
  }
}

// Speech Recognition functionality
export class RecipeListener {
  private recognition: SpeechRecognition | null = null;
  private onResult: (transcript: string, isFinal: boolean) => void;
  private onStateChange: (listening: boolean) => void;
  private onError: (error: string) => void;

  constructor(
    onResult: (transcript: string, isFinal: boolean) => void,
    onStateChange: (listening: boolean) => void,
    onError: (error: string) => void
  ) {
    this.onResult = onResult;
    this.onStateChange = onStateChange;
    this.onError = onError;
    this.initRecognition();
  }

  private initRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      this.onError("Speech recognition is not supported in this browser");
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';

    this.recognition.onstart = () => {
      this.onStateChange(true);
    };

    this.recognition.onend = () => {
      this.onStateChange(false);
    };

    this.recognition.onresult = (event) => {
      const lastResult = event.results[event.results.length - 1];
      const transcript = lastResult[0].transcript;
      const isFinal = lastResult.isFinal;
      this.onResult(transcript, isFinal);
    };

    this.recognition.onerror = (event) => {
      this.onStateChange(false);
      if (event.error !== 'aborted') {
        this.onError(`Speech recognition error: ${event.error}`);
      }
    };
  }

  start() {
    if (this.recognition) {
      try {
        this.recognition.start();
      } catch (e) {
        // Already started
      }
    }
  }

  stop() {
    if (this.recognition) {
      this.recognition.stop();
    }
  }

  get isSupported(): boolean {
    return this.recognition !== null;
  }
}

// Timer management
export class TimerManager {
  private timers: Map<string, CookingTimer> = new Map();
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private onUpdate: (timers: CookingTimer[]) => void;
  private onTimerComplete: (timer: CookingTimer) => void;

  constructor(
    onUpdate: (timers: CookingTimer[]) => void,
    onTimerComplete: (timer: CookingTimer) => void
  ) {
    this.onUpdate = onUpdate;
    this.onTimerComplete = onTimerComplete;
  }

  createTimer(name: string, minutes: number): CookingTimer | null {
    // Count non-expired timers
    const activeCount = Array.from(this.timers.values()).filter(t => !t.isExpired).length;
    if (activeCount >= MAX_TIMERS) {
      return null; // Max timers reached
    }

    const timer: CookingTimer = {
      id: `timer-${Date.now()}`,
      name,
      durationSeconds: minutes * 60,
      remainingSeconds: minutes * 60,
      isRunning: true,
      isExpired: false,
      createdAt: new Date(),
    };

    this.timers.set(timer.id, timer);
    this.startTimerInterval(timer.id);
    this.notifyUpdate();
    return timer;
  }

  private startTimerInterval(timerId: string) {
    const interval = setInterval(() => {
      const timer = this.timers.get(timerId);
      if (!timer) {
        this.clearInterval(timerId);
        return;
      }

      if (timer.isRunning && timer.remainingSeconds > 0) {
        timer.remainingSeconds--;
        this.notifyUpdate();

        if (timer.remainingSeconds === 0) {
          // Mark as expired instead of removing
          timer.isExpired = true;
          timer.isRunning = false;
          this.onTimerComplete(timer);
          this.clearInterval(timerId);
          this.notifyUpdate();
        }
      }
    }, 1000);

    this.intervals.set(timerId, interval);
  }

  private clearInterval(timerId: string) {
    const interval = this.intervals.get(timerId);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(timerId);
    }
  }

  pauseTimer(timerId: string) {
    const timer = this.timers.get(timerId);
    if (timer && !timer.isExpired) {
      timer.isRunning = false;
      this.notifyUpdate();
    }
  }

  resumeTimer(timerId: string) {
    const timer = this.timers.get(timerId);
    if (timer && timer.remainingSeconds > 0 && !timer.isExpired) {
      timer.isRunning = true;
      this.notifyUpdate();
    }
  }

  // Dismiss an expired timer (or stop an active one)
  dismissTimer(timerId: string) {
    this.clearInterval(timerId);
    this.timers.delete(timerId);
    this.notifyUpdate();
  }

  stopTimer(timerId: string) {
    this.clearInterval(timerId);
    this.timers.delete(timerId);
    this.notifyUpdate();
  }

  stopAllTimers() {
    this.intervals.forEach((_, id) => this.clearInterval(id));
    this.timers.clear();
    this.notifyUpdate();
  }

  // Dismiss all expired timers
  dismissAllExpired() {
    const expired = Array.from(this.timers.values()).filter(t => t.isExpired);
    expired.forEach(t => this.dismissTimer(t.id));
  }

  getTimers(): CookingTimer[] {
    return Array.from(this.timers.values());
  }

  getExpiredTimers(): CookingTimer[] {
    return Array.from(this.timers.values()).filter(t => t.isExpired);
  }

  getActiveTimer(): CookingTimer | undefined {
    return Array.from(this.timers.values()).find(t => t.isRunning && !t.isExpired);
  }

  // Find timer by name (case-insensitive partial match)
  findTimerByName(name: string): CookingTimer | undefined {
    const lowerName = name.toLowerCase();
    return Array.from(this.timers.values()).find(t =>
      t.name.toLowerCase().includes(lowerName) ||
      lowerName.includes(t.name.toLowerCase())
    );
  }

  // Stop timer by name
  stopTimerByName(name: string): CookingTimer | undefined {
    const timer = this.findTimerByName(name);
    if (timer) {
      this.stopTimer(timer.id);
      return timer;
    }
    return undefined;
  }

  private notifyUpdate() {
    this.onUpdate(this.getTimers());
  }

  destroy() {
    this.intervals.forEach((interval) => clearInterval(interval));
    this.intervals.clear();
    this.timers.clear();
  }
}

// Parse instructions into numbered steps
export const parseInstructionSteps = (instructions: string): string[] => {
  // Try to split by numbered steps first
  const numberedSteps = instructions.split(/(?:^|\n)\s*\d+[\.\)]\s*/);
  if (numberedSteps.length > 1) {
    return numberedSteps.filter(s => s.trim()).map(s => s.trim());
  }

  // Fall back to sentence splitting
  const sentences = instructions.split(/(?<=[.!?])\s+/);
  return sentences.filter(s => s.trim()).map(s => s.trim());
};

// Format timer for display
export const formatTimerDisplay = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Extract cooking time (in minutes) from text
// Looks for patterns like "cook for 10 minutes", "bake 15-20 minutes", "simmer for 5 mins"
export const extractCookingTime = (text: string): { minutes: number; context: string } | null => {
  const lowerText = text.toLowerCase();

  // Patterns to find cooking times
  const timePatterns = [
    // "for X minutes" or "for X-Y minutes" (take the higher number)
    /(?:for|about|approximately|around)\s+(\d+)(?:\s*[-–to]+\s*(\d+))?\s*(?:minute|min)s?/i,
    // "X minutes" at word boundary
    /\b(\d+)(?:\s*[-–to]+\s*(\d+))?\s*(?:minute|min)s?\b/i,
    // "X to Y minutes"
    /(\d+)\s+to\s+(\d+)\s*(?:minute|min)s?/i,
    // "X hour(s)" - convert to minutes
    /(\d+(?:\.\d+)?)\s*hours?/i,
  ];

  for (const pattern of timePatterns) {
    const match = lowerText.match(pattern);
    if (match) {
      let minutes: number;

      // Check if it's hours
      if (pattern.source.includes('hour')) {
        minutes = Math.round(parseFloat(match[1]) * 60);
      } else if (match[2]) {
        // Range - use the higher number
        minutes = Math.max(parseInt(match[1]), parseInt(match[2]));
      } else {
        minutes = parseInt(match[1]);
      }

      if (minutes > 0 && minutes <= 480) { // Max 8 hours
        // Extract context around the time mention
        const startIdx = Math.max(0, (match.index || 0) - 30);
        const endIdx = Math.min(text.length, (match.index || 0) + match[0].length + 30);
        const context = text.slice(startIdx, endIdx).trim();

        return { minutes, context };
      }
    }
  }

  return null;
};

// Find cooking time for a specific item in the recipe
export const findItemCookingTime = (recipe: { instructions: string; ingredients: string[] }, itemName: string): { minutes: number; stepDescription: string } | null => {
  const lowerItem = itemName.toLowerCase();
  const instructions = recipe.instructions.toLowerCase();

  // Split instructions into sentences/steps
  const steps = instructions.split(/(?:\d+\.\s*|\n|(?<=[.!?])\s+)/).filter(s => s.trim());

  // Find steps that mention the item
  for (const step of steps) {
    if (step.includes(lowerItem)) {
      const timeInfo = extractCookingTime(step);
      if (timeInfo) {
        return { minutes: timeInfo.minutes, stepDescription: step.trim() };
      }
    }
  }

  // Also check if item is in any cooking action context
  const cookingVerbs = ['cook', 'bake', 'roast', 'fry', 'grill', 'boil', 'simmer', 'sauté', 'saute', 'braise', 'steam'];
  for (const step of steps) {
    const hasItem = step.includes(lowerItem);
    const hasCookingVerb = cookingVerbs.some(v => step.includes(v));
    if (hasItem && hasCookingVerb) {
      const timeInfo = extractCookingTime(step);
      if (timeInfo) {
        return { minutes: timeInfo.minutes, stepDescription: step.trim() };
      }
    }
  }

  return null;
};

// Check if user is asking to read recipe
export const isReadCommand = (text: string): { type: 'full' | 'step' | 'ingredients' | 'next' | 'previous' | null; stepNum?: number } => {
  const lowerText = text.toLowerCase();

  if (/read\s+(?:the\s+)?(?:full\s+)?recipe|read\s+(?:me\s+)?everything/i.test(lowerText)) {
    return { type: 'full' };
  }

  if (/(?:read\s+)?(?:the\s+)?ingredients?|what\s+(?:are\s+)?(?:the\s+)?ingredients/i.test(lowerText)) {
    return { type: 'ingredients' };
  }

  if (/next\s+step|what'?s?\s+next|continue|go\s+on/i.test(lowerText)) {
    return { type: 'next' };
  }

  if (/previous\s+step|go\s+back|last\s+step|repeat/i.test(lowerText)) {
    return { type: 'previous' };
  }

  const stepMatch = lowerText.match(/(?:read\s+)?step\s+(\d+)|(?:what'?s?\s+)?step\s+(\d+)/i);
  if (stepMatch) {
    return { type: 'step', stepNum: parseInt(stepMatch[1] || stepMatch[2]) - 1 };
  }

  if (/(?:read\s+)?(?:the\s+)?(?:current\s+)?step|where\s+(?:am\s+)?i|what\s+step/i.test(lowerText)) {
    return { type: 'step' };
  }

  return { type: null };
};

// Export timer command parser
export { parseTimerCommand };
