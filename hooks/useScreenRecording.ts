import { useState, useRef, useCallback } from 'react';

export type RecordingState = 'idle' | 'recording' | 'paused' | 'stopped';

interface UseScreenRecordingOptions {
  maxDurationMs?: number;
  onMaxDurationReached?: () => void;
}

interface UseScreenRecordingReturn {
  state: RecordingState;
  recordingBlob: Blob | null;
  recordingUrl: string | null;
  elapsedTime: number;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  clearRecording: () => void;
  isSupported: boolean;
}

const MAX_DURATION_DEFAULT = 30000; // 30 seconds

export function useScreenRecording(options: UseScreenRecordingOptions = {}): UseScreenRecordingReturn {
  const { maxDurationMs = MAX_DURATION_DEFAULT, onMaxDurationReached } = options;

  const [state, setState] = useState<RecordingState>('idle');
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);

  const isSupported = typeof navigator !== 'undefined' &&
    'mediaDevices' in navigator &&
    'getDisplayMedia' in navigator.mediaDevices;

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();
    timerRef.current = setInterval(() => {
      const now = Date.now();
      const elapsed = now - startTimeRef.current - pausedTimeRef.current;
      setElapsedTime(elapsed);

      // Check if max duration reached
      if (elapsed >= maxDurationMs) {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
          onMaxDurationReached?.();
        }
      }
    }, 100);
  }, [clearTimer, maxDurationMs, onMaxDurationReached]);

  const cleanup = useCallback(() => {
    clearTimer();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    chunksRef.current = [];
  }, [clearTimer]);

  const startRecording = useCallback(async () => {
    if (!isSupported) {
      setError('Screen recording is not supported in this browser');
      return;
    }

    setError(null);
    setRecordingBlob(null);
    if (recordingUrl) {
      URL.revokeObjectURL(recordingUrl);
      setRecordingUrl(null);
    }

    try {
      // Request screen capture with audio
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'browser',
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 15, max: 30 },
        },
        audio: false, // Usually not needed for UI recordings
      });

      streamRef.current = stream;
      chunksRef.current = [];

      // Determine supported MIME type
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
        ? 'video/webm;codecs=vp8'
        : MediaRecorder.isTypeSupported('video/webm')
        ? 'video/webm'
        : 'video/mp4';

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 1000000, // 1 Mbps for reasonable file size
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        clearTimer();
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setRecordingBlob(blob);
        const url = URL.createObjectURL(blob);
        setRecordingUrl(url);
        setState('stopped');
        cleanup();
      };

      mediaRecorder.onerror = (event: Event) => {
        console.error('MediaRecorder error:', event);
        setError('Recording failed. Please try again.');
        setState('idle');
        cleanup();
      };

      // Handle when user stops sharing via browser UI
      stream.getVideoTracks()[0].onended = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
      };

      // Start recording
      mediaRecorder.start(1000); // Collect data every second
      startTimeRef.current = Date.now();
      pausedTimeRef.current = 0;
      setElapsedTime(0);
      setState('recording');
      startTimer();
    } catch (err: any) {
      console.error('Failed to start screen recording:', err);
      if (err.name === 'NotAllowedError') {
        setError('Screen recording permission was denied');
      } else if (err.name === 'NotFoundError') {
        setError('No screen available to record');
      } else {
        setError('Failed to start screen recording');
      }
      cleanup();
    }
  }, [isSupported, recordingUrl, startTimer, cleanup, clearTimer]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      clearTimer();
      pausedTimeRef.current = Date.now() - startTimeRef.current - elapsedTime;
      setState('paused');
    }
  }, [clearTimer, elapsedTime]);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      startTimeRef.current = Date.now() - elapsedTime;
      pausedTimeRef.current = 0;
      startTimer();
      setState('recording');
    }
  }, [elapsedTime, startTimer]);

  const clearRecording = useCallback(() => {
    cleanup();
    if (recordingUrl) {
      URL.revokeObjectURL(recordingUrl);
    }
    setRecordingBlob(null);
    setRecordingUrl(null);
    setElapsedTime(0);
    setError(null);
    setState('idle');
  }, [cleanup, recordingUrl]);

  return {
    state,
    recordingBlob,
    recordingUrl,
    elapsedTime,
    error,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    clearRecording,
    isSupported,
  };
}
