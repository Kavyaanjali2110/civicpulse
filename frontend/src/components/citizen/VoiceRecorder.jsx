import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, AlertCircle } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export default function VoiceRecorder({ onTranscriptReceived, isProcessing = false }) {
  const { currentLang, t } = useLanguage();
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState(null);
  const recognitionRef = useRef(null);

  const langCodeMap = {
    en: 'en-US',
    hi: 'hi-IN',
    mr: 'mr-IN',
    es: 'es-ES',
  };

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = langCodeMap[currentLang] || 'en-US';

      recognition.onresult = (event) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        if (currentTranscript.trim()) {
          onTranscriptReceived(currentTranscript.trim());
        }
      };

      recognition.onerror = (event) => {
        if (event.error !== 'no-speech') {
          setError(`Voice input error: ${event.error}`);
        }
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }
  }, [currentLang, onTranscriptReceived]);

  const toggleRecording = () => {
    setError(null);
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError(t('voice_not_supported'));
      return;
    }

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      try {
        if (recognitionRef.current) {
          recognitionRef.current.lang = langCodeMap[currentLang] || 'en-US';
          recognitionRef.current.start();
          setIsRecording(true);
        }
      } catch (err) {
        setError("Could not start microphone. Please check permissions.");
        setIsRecording(false);
      }
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
