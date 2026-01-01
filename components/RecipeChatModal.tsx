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
} from 'lucide-react';
import { Meal } from '../types';
import {
  ChatMessage,
  CookingTimer,
  RecipeSpeaker,
  RecipeListener,
  TimerManager,
  generateChatResponse,
  parseInstructionSteps,
  formatTimerDisplay,
  isReadCommand,
  parseTimerCommand,
} from '../services/recipeChatService';

interface RecipeChatModalProps {
  recipe: Meal;
  isOpen: boolean;
  onClose: () => void;
}

const RecipeChatModal: React.FC<RecipeChatModalProps> = ({ recipe, isOpen, onClose }) => {
  // State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [timers, setTimers] = useState<CookingTimer[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [autoSpeak, setAutoSpeak] = useState(true);

  // Refs
  const speakerRef = useRef<RecipeSpeaker | null>(null);
  const listenerRef = useRef<RecipeListener | null>(null);
  const timerManagerRef = useRef<TimerManager | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Parse recipe steps
  const steps = parseInstructionSteps(recipe.instructions);

  // Initialize audio for timer alerts
  useEffect(() => {
    audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleQE4h8fLpYk5FT9f');
  }, []);

  // Initialize services
  useEffect(() => {
    if (!isOpen) return;

    // Initialize speaker
    speakerRef.current = new RecipeSpeaker(setIsSpeaking);

    // Initialize timer manager
    timerManagerRef.current = new TimerManager(
      setTimers,
      (completedTimer) => {
        // Timer completed - play sound and announce
        if (audioRef.current) {
          audioRef.current.play().catch(() => {});
        }
        const announcement = `Timer complete! ${completedTimer.name} is done.`;
        addMessage('assistant', announcement);
        if (autoSpeak && speakerRef.current) {
          speakerRef.current.speak(announcement);
        }
      }
    );

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
      timerManagerRef.current?.destroy();
    };
  }, [isOpen, recipe.name]);

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
        handleTimerCommand(timerCmd);
        setIsProcessing(false);
        return;
      }

      // Check for read commands
      const readCmd = isReadCommand(input);
      if (readCmd.type) {
        handleReadCommand(readCmd);
        setIsProcessing(false);
        return;
      }

      // Generate AI response
      const { response, suggestedTimer } = await generateChatResponse(
        recipe,
        messages,
        input,
        currentStep,
        timers
      );

      addMessage('assistant', response);

      if (autoSpeak && speakerRef.current) {
        await speakerRef.current.speak(response);
      }

      // Handle suggested timer
      if (suggestedTimer && timerManagerRef.current) {
        const timer = timerManagerRef.current.createTimer(suggestedTimer.name, suggestedTimer.minutes);
        addMessage('system', `Timer set: ${suggestedTimer.name} for ${suggestedTimer.minutes} minutes`);
      }
    } catch (err) {
      console.error('Chat error:', err);
      setError('Failed to get response. Please try again.');
    }

    setIsProcessing(false);
  };

  // Handle timer commands
  const handleTimerCommand = (cmd: { action: 'start' | 'stop' | 'check' | null; name?: string; minutes?: number }) => {
    if (!timerManagerRef.current) return;

    switch (cmd.action) {
      case 'start':
        if (cmd.minutes) {
          // Capitalize the timer name for better display
          const timerName = cmd.name
            ? cmd.name.charAt(0).toUpperCase() + cmd.name.slice(1)
            : 'Cooking timer';
          const timer = timerManagerRef.current.createTimer(timerName, cmd.minutes);
          const response = `${timerName} timer set for ${cmd.minutes} minute${cmd.minutes > 1 ? 's' : ''}.`;
          addMessage('assistant', response);
          if (autoSpeak && speakerRef.current) {
            speakerRef.current.speak(response);
          }
        }
        break;

      case 'stop':
        // If a name was specified, try to find that timer
        if (cmd.name) {
          const namedTimer = timerManagerRef.current.stopTimerByName(cmd.name);
          if (namedTimer) {
            const response = `Stopped the ${namedTimer.name} timer.`;
            addMessage('assistant', response);
            if (autoSpeak && speakerRef.current) {
              speakerRef.current.speak(response);
            }
          } else {
            const response = `I couldn't find a timer called "${cmd.name}".`;
            addMessage('assistant', response);
            if (autoSpeak && speakerRef.current) {
              speakerRef.current.speak(response);
            }
          }
        } else {
          // Stop the first active timer
          const activeTimer = timerManagerRef.current.getActiveTimer();
          if (activeTimer) {
            timerManagerRef.current.stopTimer(activeTimer.id);
            const response = `Stopped the ${activeTimer.name} timer.`;
            addMessage('assistant', response);
            if (autoSpeak && speakerRef.current) {
              speakerRef.current.speak(response);
            }
          } else {
            const response = "There's no active timer to stop.";
            addMessage('assistant', response);
            if (autoSpeak && speakerRef.current) {
              speakerRef.current.speak(response);
            }
          }
        }
        break;

      case 'check':
        const currentTimers = timerManagerRef.current.getTimers();
        if (currentTimers.length === 0) {
          const response = "You don't have any timers running.";
          addMessage('assistant', response);
          if (autoSpeak && speakerRef.current) {
            speakerRef.current.speak(response);
          }
        } else if (cmd.name) {
          // Check specific timer by name
          const namedTimer = timerManagerRef.current.findTimerByName(cmd.name);
          if (namedTimer) {
            const mins = Math.floor(namedTimer.remainingSeconds / 60);
            const secs = namedTimer.remainingSeconds % 60;
            const response = `The ${namedTimer.name} timer has ${mins} minute${mins !== 1 ? 's' : ''} and ${secs} second${secs !== 1 ? 's' : ''} remaining.`;
            addMessage('assistant', response);
            if (autoSpeak && speakerRef.current) {
              speakerRef.current.speak(response);
            }
          } else {
            const response = `I couldn't find a timer called "${cmd.name}". You have ${currentTimers.length} timer${currentTimers.length > 1 ? 's' : ''} running: ${currentTimers.map(t => t.name).join(', ')}.`;
            addMessage('assistant', response);
            if (autoSpeak && speakerRef.current) {
              speakerRef.current.speak(response);
            }
          }
        } else {
          // List all timers
          const timerStatus = currentTimers.map(t => {
            const mins = Math.floor(t.remainingSeconds / 60);
            const secs = t.remainingSeconds % 60;
            return `${t.name}: ${mins} minute${mins !== 1 ? 's' : ''} and ${secs} second${secs !== 1 ? 's' : ''} remaining`;
          }).join('. ');
          addMessage('assistant', timerStatus);
          if (autoSpeak && speakerRef.current) {
            speakerRef.current.speak(timerStatus);
          }
        }
        break;
    }
  };

  // Handle read commands
  const handleReadCommand = (cmd: { type: 'full' | 'step' | 'ingredients' | 'next' | 'previous' | null; stepNum?: number }) => {
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
    if (autoSpeak && speakerRef.current) {
      speakerRef.current.speak(response);
    }
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
          <div className="bg-amber-50 border-b border-amber-200 p-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Timer size={18} className="text-amber-600" />
              {timers.map(timer => (
                <div
                  key={timer.id}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                    timer.remainingSeconds <= 30
                      ? 'bg-red-100 text-red-700 animate-pulse'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  <span>{timer.name}</span>
                  <span className="font-mono">{formatTimerDisplay(timer.remainingSeconds)}</span>
                  <button
                    onClick={() => {
                      if (timer.isRunning) {
                        timerManagerRef.current?.pauseTimer(timer.id);
                      } else {
                        timerManagerRef.current?.resumeTimer(timer.id);
                      }
                    }}
                    className="p-0.5 hover:bg-amber-200 rounded"
                  >
                    {timer.isRunning ? <Pause size={14} /> : <Play size={14} />}
                  </button>
                  <button
                    onClick={() => timerManagerRef.current?.stopTimer(timer.id)}
                    className="p-0.5 hover:bg-amber-200 rounded"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
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
              if (timerManagerRef.current) {
                timerManagerRef.current.createTimer('Quick timer', 5);
                addMessage('system', 'Timer set: Quick timer for 5 minutes');
              }
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
              disabled={isProcessing}
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
              <span className="text-sm font-medium">Listening...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecipeChatModal;
