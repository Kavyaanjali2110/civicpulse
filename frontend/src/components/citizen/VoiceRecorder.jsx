import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, AlertCircle } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export function processSpeechResults(results, lastProcessedIndex = 0) {
  let newFinalTranscript = '';
  let currentInterim = '';
  let updatedIndex = lastProcessedIndex;

  for (let i = lastProcessedIndex; i < results.length; i++) {
    const result = results[i];
    const text = result[0]?.transcript || '';

    if (result.isFinal) {
      const trimmed = text.trim();
      if (trimmed) {
        newFinalTranscript = newFinalTranscript
          ? `${newFinalTranscript} ${trimmed}`
          : trimmed;
      }
      updatedIndex = i + 1;
    } else {
      const trimmed = text.trim();
      if (trimmed) {
        currentInterim = currentInterim ? `${currentInterim} ${trimmed}` : trimmed;
      }
    }
  }

  return {
    newFinalTranscript,
    updatedIndex,
    currentInterim,
  };
}

export default function VoiceRecorder({ onTranscriptReceived, isProcessing = false }) {
  const { currentLang, t } = useLanguage();
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState(null);

  const recognitionRef = useRef(null);
  const isRecordingRef = useRef(false);
  const isStartingRef = useRef(false);
  const lastProcessedIndexRef = useRef(0);
  const unfinalizedInterimRef = useRef('');
  const onTranscriptReceivedRef = useRef(onTranscriptReceived);

  const langCodeMap = {
    en: 'en-US',
    hi: 'hi-IN',
    mr: 'mr-IN',
    es: 'es-ES',
  };

  useEffect(() => {
    onTranscriptReceivedRef.current = onTranscriptReceived;
  }, [onTranscriptReceived]);

  useEffect(() => {
    if (recognitionRef.current && isRecordingRef.current) {
      try {
        recognitionRef.current.lang = langCodeMap[currentLang] || 'en-US';
      } catch (err) {
        // ignore dynamic lang switch error if engine does not permit mid-session change
      }
    }
  }, [currentLang]);

  useEffect(() => {
    return () => {
      isRecordingRef.current = false;
      isStartingRef.current = false;
      if (recognitionRef.current) {
        const rec = recognitionRef.current;
        recognitionRef.current = null;
        rec.onresult = null;
        rec.onerror = null;
        rec.onend = null;
        try {
          rec.abort();
        } catch (err) {
          // ignore
        }
      }
    };
  }, []);

  const toggleRecording = () => {
    setError(null);
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError(t('voice_not_supported'));
      return;
    }

    // Prevent multiple instances/listeners from repeated rapid clicks
    if (isStartingRef.current) {
      return;
    }

    if (isRecordingRef.current) {
      // User requested stop
      isRecordingRef.current = false;
      setIsRecording(false);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (err) {
          // ignore
        }
      }
      return;
    }

    // Clean up any previous recognition instance before creating a new one
    if (recognitionRef.current) {
      const rec = recognitionRef.current;
      recognitionRef.current = null;
      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;
      try {
        rec.abort();
      } catch (err) {
        // ignore
      }
    }

    try {
      isStartingRef.current = true;
      lastProcessedIndexRef.current = 0;
      unfinalizedInterimRef.current = '';

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = langCodeMap[currentLang] || 'en-US';

      recognition.onresult = (event) => {
        const { newFinalTranscript, updatedIndex, currentInterim } = processSpeechResults(
          event.results,
          lastProcessedIndexRef.current
        );

        lastProcessedIndexRef.current = updatedIndex;
        unfinalizedInterimRef.current = currentInterim;

        if (newFinalTranscript) {
          unfinalizedInterimRef.current = '';
          onTranscriptReceivedRef.current?.(newFinalTranscript);
        }
      };

      recognition.onerror = (event) => {
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          setError(`Voice input error: ${event.error}`);
        }
        isRecordingRef.current = false;
        isStartingRef.current = false;
        setIsRecording(false);
        recognitionRef.current = null;
      };

      recognition.onend = () => {
        if (unfinalizedInterimRef.current) {
          onTranscriptReceivedRef.current?.(unfinalizedInterimRef.current);
          unfinalizedInterimRef.current = '';
        }
        isRecordingRef.current = false;
        isStartingRef.current = false;
        setIsRecording(false);
        recognitionRef.current = null;
      };

      recognitionRef.current = recognition;
      isRecordingRef.current = true;
      setIsRecording(true);
      recognition.start();
      isStartingRef.current = false;
    } catch (err) {
      isRecordingRef.current = false;
      isStartingRef.current = false;
      setIsRecording(false);
      recognitionRef.current = null;
      setError("Could not start microphone. Please check permissions.");
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggleRecording}
          disabled={isProcessing}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl font-semibold text-xs transition-all shadow-sm cursor-pointer ${
            isRecording
              ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200'
          }`}
        >
          {isRecording ? (
            <>
              <MicOff className="w-3.5 h-3.5 text-white" />
              <span>{t('voice_btn_recording')}</span>
            </>
          ) : (
            <>
              <Mic className="w-3.5 h-3.5 text-teal-700" />
              <span>{t('voice_btn_idle')}</span>
            </>
          )}
        </button>

        {isRecording && (
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
            <Volume2 className="w-4 h-4 animate-bounce" />
            <span className="font-medium">Listening in {langCodeMap[currentLang]}...</span>
            <div className="flex items-center space-x-0.5 ml-2">
              <span className="w-1 h-3 bg-rose-600 rounded-full animate-pulse" />
              <span className="w-1 h-5 bg-rose-600 rounded-full animate-pulse delay-75" />
              <span className="w-1 h-2 bg-rose-600 rounded-full animate-pulse delay-150" />
              <span className="w-1 h-4 bg-rose-600 rounded-full animate-pulse delay-100" />
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center space-x-2 text-rose-600 text-xs mt-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
