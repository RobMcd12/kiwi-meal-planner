import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Timer,
  Play,
  Pause,
  Trash2,
  ChefHat,
  MessageCircle,
  ArrowRight,
  ArrowLeft,
  List,
  Send,
  Loader2,
  AlertCircle,
  Radio,
} from 'lucide-react';
import { Meal } from '../types';
import {
  ChatMessage,
  RecipeSpeaker,
  RecipeListener,
  generateChatResponse,
  parseInstructionSteps,
  formatTimerDisplay,
  isReadCommand,
  parseTimerCommand,
  extractCookingTime,
  findItemCookingTime,
  MAX_TIMERS,
} from '../services/recipeChatService';
import { useTimer } from '../contexts/TimerContext';

// Local timer interface for display in the modal
interface LocalCookingTimer {
  id: string;
  name: string;
  seconds: number;
  isRunning: boolean;
  isExpired: boolean;
}

interface RecipeChatModalProps {
  recipe: Meal;
  isOpen: boolean;
  onClose: () => void;
}

const RecipeChatModal: React.FC<RecipeChatModalProps> = ({ recipe, isOpen, onClose }) => {
  // Global timer context
  const {
    activeTimers: globalTimers,
    addTimer: addGlobalTimer,
    removeTimer: removeGlobalTimer,
    pauseTimer: pauseGlobalTimer,
    resumeTimer: resumeGlobalTimer,
    dismissExpiredTimer: dismissGlobalExpiredTimer
  } = useTimer();

  // State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [openMicMode, setOpenMicMode] = useState(false);

  // Refs
  const speakerRef = useRef<RecipeSpeaker | null>(null);
  const listenerRef = useRef<RecipeListener | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const expiredAnnouncementRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const announcedExpiredRef = useRef<Set<string>>(new Set());

  // Filter timers for this recipe
  const timers: LocalCookingTimer[] = globalTimers
    .filter(t => t.recipeId === recipe.id)
    .map(t => ({
      id: t.id,
      name: t.name,
      seconds: t.remainingSeconds,
      isRunning: t.isRunning,
      isExpired: t.isExpired
    }));

  // Parse recipe steps
  const steps = parseInstructionSteps(recipe.instructions);

  // Dismiss an expired timer and stop its announcement
  const dismissExpiredTimer = useCallback((timerId: string) => {
    // Stop the repeating announcement
    const interval = expiredAnnouncementRef.current.get(timerId);
    if (interval) {
      clearInterval(interval);
      expiredAnnouncementRef.current.delete(timerId);
    }
    // Remove from announced set
    announcedExpiredRef.current.delete(timerId);
    // Remove the timer from global context
    dismissGlobalExpiredTimer(timerId);
    // Stop speaking if currently announcing
    speakerRef.current?.stop();
  }, [dismissGlobalExpiredTimer]);

  // Initialize audio for timer alerts
  useEffect(() => {
    audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleQE4h8fLpYk5FT9f');
  }, []);

  // Initialize services
  useEffect(() => {
    if (!isOpen) return;

    // Initialize speaker
    speakerRef.current = new RecipeSpeaker(setIsSpeaking);

    // Initialize listener
    listenerRef.current = new RecipeListener(
      (transcript, isFinal) => {
        if (isFinal) {
          setInterimTranscript('');
          handleUserInput(transcript);
        } else {
          setInterimTranscript(transcript);
        }
      },
      setIsListening,
      setError
    );

    // Welcome message
    const welcomeMsg = `Hi! I'm your cooking assistant for ${recipe.name}. I can read the recipe to you, answer questions, and set timers. Just tap the microphone or type to get started!`;
    addMessage('assistant', welcomeMsg);

    return () => {
      speakerRef.current?.stop();
      listenerRef.current?.stop();
      // Clear all expired timer announcement intervals (but don't remove timers - they persist globally)
      expiredAnnouncementRef.current.forEach(interval => clearInterval(interval));
      expiredAnnouncementRef.current.clear();
    };
  }, [isOpen, recipe.name]);

  // Handle expired timer announcements when modal is open
  useEffect(() => {
    if (!isOpen) return;

    timers.forEach(timer => {
      if (timer.isExpired && !announcedExpiredRef.current.has(timer.id)) {
        // New expired timer - announce it
        announcedExpiredRef.current.add(timer.id);

        // Play sound and announce
        if (audioRef.current) {
          audioRef.current.play().catch(() => {});
        }
        const announcement = `${timer.name} timer is done!`;
        addMessage('assistant', `Timer complete! ${timer.name} is done.`);

        // Start repeating announcement every 8 seconds until dismissed
        const announceAndPlay = () => {
          if (audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(() => {});
          }
          if (speakerRef.current) {
            speakerRef.current.speak(announcement);
          }
        };

        // Initial announcement
        announceAndPlay();

        // Repeat announcement every 8 seconds
        const interval = setInterval(announceAndPlay, 8000);
        expiredAnnouncementRef.current.set(timer.id, interval);
      }
    });
  }, [isOpen, timers]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Add a message to the chat
  const addMessage = useCallback((role: 'user' | 'assistant' | 'system', content: string) => {
    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      role,
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newMessage]);
  }, []);

  // Create a timer using global context
  const createTimer = useCallback((name: string, minutes: number): boolean => {
    if (timers.length >= MAX_TIMERS) {
      return false;
    }
    addGlobalTimer(name, minutes * 60, recipe.id, recipe.name);
    return true;
  }, [addGlobalTimer, recipe.id, recipe.name, timers.length]);

  // Find a timer by name
  const findTimerByName = useCallback((name: string): LocalCookingTimer | undefined => {
    const normalizedName = name.toLowerCase();
    return timers.find(t =>
      t.name.toLowerCase().includes(normalizedName) ||
      normalizedName.includes(t.name.toLowerCase())
    );
  }, [timers]);

  // Get the first active (running) timer
  const getActiveTimer = useCallback((): LocalCookingTimer | undefined => {
    return timers.find(t => t.isRunning && !t.isExpired);
  }, [timers]);

  // Get expired timers
  const getExpiredTimers = useCallback((): LocalCookingTimer[] => {
    return timers.filter(t => t.isExpired);
  }, [timers]);

  // Helper: Speak response and restart listening if open mic mode is on
  const speakAndRestartListening = useCallback(async (text: string) => {
    if (autoSpeak && speakerRef.current) {
      await speakerRef.current.speak(text);
    }
    // Auto-restart listening in open mic mode after speaking
    if (openMicMode && listenerRef.current?.isSupported) {
      setTimeout(() => {
        listenerRef.current?.start();
      }, 300);
    }
  }, [autoSpeak, openMicMode]);

  // Handle user input (from voice or text)
  const handleUserInput = async (input: string) => {
    if (!input.trim()) return;

    addMessage('user', input);
    setIsProcessing(true);
    setError(null);

    try {
      // Check for timer commands
      const timerCmd = parseTimerCommand(input);
      if (timerCmd.action) {
        await handleTimerCommand(timerCmd);
        setIsProcessing(false);
        return;
      }

      // Check for read commands
      const readCmd = isReadCommand(input);
      if (readCmd.type) {
        await handleReadCommand(readCmd);
        setIsProcessing(false);
        return;
      }

      // Generate AI response - convert local timers to service format
      const serviceTimers = timers.map(t => ({
        id: t.id,
        name: t.name,
        durationSeconds: t.seconds,
        remainingSeconds: t.seconds,
        isRunning: t.isRunning,
        isExpired: t.isExpired,
        createdAt: new Date()
      }));
      const { response, suggestedTimer } = await generateChatResponse(
        recipe,
        messages,
        input,
        currentStep,
        serviceTimers
      );

      addMessage('assistant', response);

      // Handle suggested timer
      if (suggestedTimer) {
        const success = createTimer(suggestedTimer.name, suggestedTimer.minutes);
        if (success) {
          addMessage('system', `Timer set: ${suggestedTimer.name} for ${suggestedTimer.minutes} minutes`);
        }
      }

      // Speak and restart listening if in open mic mode
      await speakAndRestartListening(response);
    } catch (err) {
      console.error('Chat error:', err);
      setError('Failed to get response. Please try again.');
      // Restart listening even on error if in open mic mode
      if (openMicMode && listenerRef.current?.isSupported) {
        setTimeout(() => {
          listenerRef.current?.start();
        }, 300);
      }
    }

    setIsProcessing(false);
  };

  // Handle timer commands
  const handleTimerCommand = async (cmd: { action: 'start' | 'stop' | 'check' | null; name?: string; minutes?: number; stepNumber?: number; itemName?: string }) => {
    let response = '';

    switch (cmd.action) {
      case 'start':
        // Handle step-based timer request
        if (cmd.stepNumber !== undefined) {
          const stepIndex = cmd.stepNumber - 1;
          if (stepIndex >= 0 && stepIndex < steps.length) {
            const stepText = steps[stepIndex];
            const timeInfo = extractCookingTime(stepText);
            if (timeInfo) {
              const timerName = `Step ${cmd.stepNumber}`;
              const success = createTimer(timerName, timeInfo.minutes);
              response = success
                ? `${timerName} timer set for ${timeInfo.minutes} minute${timeInfo.minutes > 1 ? 's' : ''}.`
                : `You already have ${MAX_TIMERS} timers running. Please dismiss one first.`;
            } else {
              response = `I couldn't find a cooking time in step ${cmd.stepNumber}. Try saying the specific time, like "set a timer for 10 minutes".`;
            }
          } else {
            response = `Step ${cmd.stepNumber} doesn't exist. This recipe has ${steps.length} steps.`;
          }
          break;
        }

        // Handle item-based timer request (e.g., "start a timer for the lamb")
        if (cmd.itemName && !cmd.minutes) {
          const itemTime = findItemCookingTime(recipe, cmd.itemName);
          if (itemTime) {
            const timerName = cmd.itemName.charAt(0).toUpperCase() + cmd.itemName.slice(1);
            const success = createTimer(timerName, itemTime.minutes);
            response = success
              ? `${timerName} timer set for ${itemTime.minutes} minute${itemTime.minutes > 1 ? 's' : ''}, based on the recipe.`
              : `You already have ${MAX_TIMERS} timers running. Please dismiss one first.`;
          } else {
            response = `I couldn't find a cooking time for "${cmd.itemName}" in this recipe. Try saying the specific time, like "set a timer for ${cmd.itemName} for 10 minutes".`;
          }
          break;
        }

        // Handle explicit minutes timer
        if (cmd.minutes) {
          const timerName = cmd.name
            ? cmd.name.charAt(0).toUpperCase() + cmd.name.slice(1)
            : 'Cooking timer';
          const success = createTimer(timerName, cmd.minutes);
          response = success
            ? `${timerName} timer set for ${cmd.minutes} minute${cmd.minutes > 1 ? 's' : ''}.`
            : `You already have ${MAX_TIMERS} timers running. Please dismiss one first.`;
        }
        break;

      case 'stop':
        const expiredTimersList = getExpiredTimers();
        if (expiredTimersList.length > 0) {
          expiredTimersList.forEach(t => dismissExpiredTimer(t.id));
          const names = expiredTimersList.map(t => t.name).join(', ');
          response = expiredTimersList.length === 1
            ? `Dismissed the ${names} timer.`
            : `Dismissed ${expiredTimersList.length} expired timers.`;
        } else if (cmd.name) {
          const namedTimer = findTimerByName(cmd.name);
          if (namedTimer) {
            removeGlobalTimer(namedTimer.id);
            response = `Stopped the ${namedTimer.name} timer.`;
          } else {
            response = `I couldn't find a timer called "${cmd.name}".`;
          }
        } else {
          const activeTimer = getActiveTimer();
          if (activeTimer) {
            removeGlobalTimer(activeTimer.id);
            response = `Stopped the ${activeTimer.name} timer.`;
          } else {
            response = "There's no active timer to stop.";
          }
        }
        break;

      case 'check':
        if (timers.length === 0) {
          response = "You don't have any timers running.";
        } else if (cmd.name) {
          const namedTimer = findTimerByName(cmd.name);
          if (namedTimer) {
            const mins = Math.floor(namedTimer.seconds / 60);
            const secs = namedTimer.seconds % 60;
            response = `The ${namedTimer.name} timer has ${mins} minute${mins !== 1 ? 's' : ''} and ${secs} second${secs !== 1 ? 's' : ''} remaining.`;
          } else {
            response = `I couldn't find a timer called "${cmd.name}". You have ${timers.length} timer${timers.length > 1 ? 's' : ''} running: ${timers.map(t => t.name).join(', ')}.`;
          }
        } else {
          response = timers.map(t => {
            const mins = Math.floor(t.seconds / 60);
            const secs = t.seconds % 60;
            return `${t.name}: ${mins} minute${mins !== 1 ? 's' : ''} and ${secs} second${secs !== 1 ? 's' : ''} remaining`;
          }).join('. ');
        }
        break;
    }

    if (response) {
      addMessage('assistant', response);
      await speakAndRestartListening(response);
    }
  };

  // Handle read commands
  const handleReadCommand = async (cmd: { type: 'full' | 'step' | 'ingredients' | 'next' | 'previous' | null; stepNum?: number }) => {
    let response = '';

    switch (cmd.type) {
      case 'full':
        response = `Here's the full recipe for ${recipe.name}. Ingredients: ${recipe.ingredients.join(', ')}. Instructions: ${recipe.instructions}`;
        break;

      case 'ingredients':
        response = `The ingredients for ${recipe.name} are: ${recipe.ingredients.join(', ')}.`;
        break;

      case 'next':
        if (currentStep < steps.length - 1) {
          const newStep = currentStep + 1;
          setCurrentStep(newStep);
          response = `Step ${newStep + 1}: ${steps[newStep]}`;
        } else {
          response = "You're at the last step! The recipe is complete.";
        }
        break;

      case 'previous':
        if (currentStep > 0) {
          const newStep = currentStep - 1;
          setCurrentStep(newStep);
          response = `Step ${newStep + 1}: ${steps[newStep]}`;
        } else {
          response = "You're at the first step.";
        }
        break;

      case 'step':
        const stepIdx = cmd.stepNum !== undefined ? cmd.stepNum : currentStep;
        if (stepIdx >= 0 && stepIdx < steps.length) {
          setCurrentStep(stepIdx);
          response = `Step ${stepIdx + 1}: ${steps[stepIdx]}`;
        } else {
          response = `That step doesn't exist. This recipe has ${steps.length} steps.`;
        }
        break;
    }

    addMessage('assistant', response);
    await speakAndRestartListening(response);
  };

  // Toggle listening
  const toggleListening = () => {
    if (!listenerRef.current?.isSupported) {
      setError('Speech recognition is not supported in your browser');
      return;
    }

    // Unlock speech synthesis on first user interaction (required for mobile)
    if (speakerRef.current) {
      speakerRef.current.unlock();
    }

    if (isListening) {
      listenerRef.current.stop();
    } else {
      // Stop speaking if currently speaking
      if (isSpeaking && speakerRef.current) {
        speakerRef.current.stop();
      }
      listenerRef.current.start();
    }
  };

  // Handle text input submit
  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Unlock speech synthesis on first user interaction (required for mobile)
    if (speakerRef.current) {
      speakerRef.current.unlock();
    }
    if (textInput.trim() && !isProcessing) {
      handleUserInput(textInput);
      setTextInput('');
    }
  };

  // Stop speaking
  const stopSpeaking = () => {
    if (speakerRef.current) {
      speakerRef.current.stop();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <ChefHat size={24} />
            </div>
            <div>
              <h2 className="font-bold text-lg">Cooking Assistant</h2>
              <p className="text-emerald-100 text-sm truncate max-w-[200px]">{recipe.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Open Mic Toggle */}
            <button
              onClick={() => {
                const newOpenMicMode = !openMicMode;
                setOpenMicMode(newOpenMicMode);
                // If turning on, also turn on auto-speak and start listening
                if (newOpenMicMode) {
                  setAutoSpeak(true);
                  if (speakerRef.current) {
                    speakerRef.current.unlock();
                  }
                  if (listenerRef.current?.isSupported && !isListening) {
                    listenerRef.current.start();
                  }
                } else {
                  // If turning off, stop listening
                  if (isListening && listenerRef.current) {
                    listenerRef.current.stop();
                  }
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                openMicMode
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-white/10 hover:bg-white/20'
              }`}
              title={openMicMode ? 'Open Mic ON - Always listening' : 'Open Mic OFF - Tap to enable hands-free mode'}
            >
              <Radio size={16} className={openMicMode ? 'animate-pulse' : ''} />
              <span className="text-xs font-medium hidden sm:inline">
                {openMicMode ? 'LIVE' : 'Open Mic'}
              </span>
            </button>
            <button
              onClick={() => setAutoSpeak(!autoSpeak)}
              className={`p-2 rounded-lg transition-colors ${autoSpeak ? 'bg-white/20 hover:bg-white/30' : 'bg-white/10 hover:bg-white/20'}`}
              title={autoSpeak ? 'Auto-speak on' : 'Auto-speak off'}
            >
              {autoSpeak ? <Volume2 size={20} /> : <VolumeX size={20} />}
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Timers Bar */}
        {timers.length > 0 && (
          <div className={`border-b p-3 ${timers.some(t => t.isExpired) ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
            <div className="flex items-center gap-2 flex-wrap">
              <Timer size={18} className={timers.some(t => t.isExpired) ? 'text-red-600' : 'text-amber-600'} />
              {timers.map(timer => (
                timer.isExpired ? (
                  // Expired timer - flashing red, clickable to dismiss
                  <button
                    key={timer.id}
                    onClick={() => dismissExpiredTimer(timer.id)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold bg-red-500 text-white animate-pulse cursor-pointer hover:bg-red-600 transition-colors shadow-lg"
                    title="Click to dismiss"
                  >
                    <span>{timer.name}</span>
                    <span>DONE!</span>
                    <X size={14} />
                  </button>
                ) : (
                  // Active timer
                  <div
                    key={timer.id}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                      timer.seconds <= 30
                        ? 'bg-red-100 text-red-700 animate-pulse'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    <span>{timer.name}</span>
                    <span className="font-mono">{formatTimerDisplay(timer.seconds)}</span>
                    <button
                      onClick={() => {
                        if (timer.isRunning) {
                          pauseGlobalTimer(timer.id);
                        } else {
                          resumeGlobalTimer(timer.id);
                        }
                      }}
                      className="p-0.5 hover:bg-amber-200 rounded"
                    >
                      {timer.isRunning ? <Pause size={14} /> : <Play size={14} />}
                    </button>
                    <button
                      onClick={() => removeGlobalTimer(timer.id)}
                      className="p-0.5 hover:bg-amber-200 rounded"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )
              ))}
            </div>
          </div>
        )}

        {/* Step Progress */}
        <div className="bg-slate-50 border-b border-slate-200 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-600">
              Step {currentStep + 1} of {steps.length}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => currentStep > 0 && setCurrentStep(currentStep - 1)}
                disabled={currentStep === 0}
                className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ArrowLeft size={16} />
              </button>
              <button
                onClick={() => currentStep < steps.length - 1 && setCurrentStep(currentStep + 1)}
                disabled={currentStep === steps.length - 1}
                className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-1.5">
            <div
              className="bg-emerald-500 h-1.5 rounded-full transition-all"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
          <p className="text-sm text-slate-700 mt-2 line-clamp-2">
            {steps[currentStep]}
          </p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                  msg.role === 'user'
                    ? 'bg-emerald-600 text-white rounded-br-md'
                    : msg.role === 'system'
                    ? 'bg-amber-100 text-amber-800 rounded-bl-md'
                    : 'bg-slate-100 text-slate-800 rounded-bl-md'
                }`}
              >
                {msg.role === 'assistant' && (
                  <div className="flex items-center gap-2 mb-1">
                    <ChefHat size={14} className="text-emerald-600" />
                    <span className="text-xs font-medium text-emerald-600">Assistant</span>
                  </div>
                )}
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}

          {/* Interim transcript */}
          {interimTranscript && (
            <div className="flex justify-end">
              <div className="max-w-[80%] rounded-2xl px-4 py-2.5 bg-emerald-100 text-emerald-700 rounded-br-md opacity-70">
                <p className="text-sm italic">{interimTranscript}...</p>
              </div>
            </div>
          )}

          {/* Processing indicator */}
          {isProcessing && (
            <div className="flex justify-start">
              <div className="bg-slate-100 rounded-2xl px-4 py-3 rounded-bl-md">
                <Loader2 size={18} className="animate-spin text-slate-400" />
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex justify-center">
              <div className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm">
                <AlertCircle size={16} />
                {error}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions */}
        <div className="border-t border-slate-200 p-2 flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => handleReadCommand({ type: 'step' })}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-sm text-slate-700 whitespace-nowrap"
          >
            <MessageCircle size={14} />
            Read step
          </button>
          <button
            onClick={() => handleReadCommand({ type: 'next' })}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-sm text-slate-700 whitespace-nowrap"
          >
            <ArrowRight size={14} />
            Next step
          </button>
          <button
            onClick={() => handleReadCommand({ type: 'ingredients' })}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-sm text-slate-700 whitespace-nowrap"
          >
            <List size={14} />
            Ingredients
          </button>
          <button
            onClick={() => {
              createTimer('Quick timer', 5);
              addMessage('system', 'Timer set: Quick timer for 5 minutes');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 hover:bg-amber-200 rounded-full text-sm text-amber-700 whitespace-nowrap"
          >
            <Timer size={14} />
            5 min timer
          </button>
        </div>

        {/* Input Area */}
        <div className="border-t border-slate-200 p-4 bg-slate-50">
          <div className="flex items-center gap-3">
            {/* Voice Button */}
            <button
              onClick={toggleListening}
              disabled={isProcessing && !isListening}
              className={`relative flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                isListening
                  ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-200'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isListening ? (
                <>
                  <MicOff size={24} />
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-400 rounded-full animate-ping" />
                </>
              ) : (
                <Mic size={24} />
              )}
            </button>

            {/* Text Input */}
            <form onSubmit={handleTextSubmit} className="flex-1 flex items-center gap-2">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Type a message or tap the mic..."
                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all"
                disabled={isProcessing || isListening}
              />
              <button
                type="submit"
                disabled={!textInput.trim() || isProcessing}
                className="p-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={20} />
              </button>
            </form>

            {/* Stop Speaking Button */}
            {isSpeaking && (
              <button
                onClick={stopSpeaking}
                className="flex-shrink-0 p-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl transition-colors"
              >
                <VolumeX size={20} />
              </button>
            )}
          </div>

          {/* Listening Indicator */}
          {isListening && (
            <div className="mt-3 flex items-center justify-center gap-2 text-red-500">
              <div className="flex items-center gap-1">
                <span className="w-1 h-4 bg-red-500 rounded-full animate-[pulse_0.5s_ease-in-out_infinite]" />
                <span className="w-1 h-6 bg-red-500 rounded-full animate-[pulse_0.5s_ease-in-out_infinite_0.1s]" />
                <span className="w-1 h-4 bg-red-500 rounded-full animate-[pulse_0.5s_ease-in-out_infinite_0.2s]" />
              </div>
              <span className="text-sm font-medium">
                {openMicMode ? 'Open Mic Active - Speak anytime...' : 'Listening...'}
              </span>
            </div>
          )}

          {/* Open Mic Mode Indicator when not listening */}
          {openMicMode && !isListening && !isProcessing && !isSpeaking && (
            <div className="mt-3 flex items-center justify-center gap-2 text-emerald-600">
              <Radio size={16} className="animate-pulse" />
              <span className="text-sm font-medium">Open Mic ready - will listen after response</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecipeChatModal;
