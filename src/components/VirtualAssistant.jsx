import React, { useState, useEffect } from 'react';
import { Bot, Sparkles, X, ChevronUp, ChevronDown, HelpCircle, Volume2 } from 'lucide-react';

export default function VirtualAssistant({
  currentModule = 'home',
  distanceStatus = 'ideal',
  eyeTested = 'OD',
  assistantMessage = ''
}) {
  const [isOpen, setIsOpen] = useState(true);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [message, setMessage] = useState('');

  const handleSpeak = () => {
    if (!isVoiceEnabled || !('speechSynthesis' in window)) return;

    const cleanMessage = message.replace(/[📏⚠️🔍👀🧭📐✅🎯👁️🛑]/g, '').trim();
    if (!cleanMessage) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(cleanMessage);
    utterance.lang = 'en-US';
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (!isVoiceEnabled && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, [isVoiceEnabled]);

  // Generate contextual guidance based on what the user is currently doing
  useEffect(() => {
    if (assistantMessage) {
      setMessage(assistantMessage);
      return;
    }

    let guideText = "Welcome to the Visual Assessment System! Select a test module to begin.";

    if (currentModule === 'home') {
      guideText = "Hello! I'm your clinical guide. Choose a screening test above to start your eye exam.";
    } else if (currentModule === 'amsler') {
      if (distanceStatus === 'too_close') {
        guideText = "⚠️ You're too close! Lean back slightly to reach the 35 cm ideal range.";
      } else if (distanceStatus === 'too_far') {
        guideText = "⚠️ You're too far! Lean closer to the screen so I can track your distance accurately.";
      } else {
        guideText = `🔍 Fixate your gaze on the center red dot (${eyeTested}). Click on any wavy or distorted lines on the grid.`;
      }
    } else if (currentModule === 'tumbling-e') {
      if (distanceStatus !== 'ideal') {
        guideText = "📏 Please adjust your distance to 35 cm to unlock the test grid!";
      } else {
        guideText = `👀 Look at the 'E' optotype (${eyeTested}). Use your arrow keys or on-screen buttons to indicate which direction the open fingers point!`;
      }
    } else if (currentModule === 'selection') {
      guideText = "🧭 Choose a test module and eye side, then proceed to calibration before starting the exam.";
    } else if (currentModule === 'calibration') {
      guideText = "📐 Align the card to your screen, then confirm calibration to begin the assessment.";
    }

    setMessage(guideText);
  }, [currentModule, distanceStatus, eyeTested, assistantMessage]);

  return (
    <div 
      className="position-fixed bottom-0 end-0 m-4 z-50 d-flex flex-column align-items-end"
      style={{ zIndex: 1080 }}
    >
      {/* Speech Bubble / Message Box */}
      {isOpen && (
        <div 
          className="card border-0 shadow-lg p-3 bg-white mb-2 animate-fade-in"
          style={{ maxWidth: '300px', borderRadius: '16px' }}
        >
          <div className="d-flex justify-content-between align-items-center mb-1 gap-2">
            <span className="badge bg-primary-subtle text-primary fw-bold extra-small d-flex align-items-center gap-1">
              <Sparkles size={12} /> Clinical Guide AI
            </span>

            <div className="d-flex align-items-center gap-2">
              <button
                type="button"
                className="btn btn-link btn-sm p-0 text-primary fw-bold"
                onClick={handleSpeak}
                title="Listen to the current instruction"
                aria-label="Listen to the current instruction"
                disabled={!isVoiceEnabled || !('speechSynthesis' in window)}
                style={{ fontSize: '0.7rem' }}
              >
                Listen
              </button>

              <button
                type="button"
                className="btn btn-link btn-sm p-0 text-dark"
                onClick={() => setIsVoiceEnabled((prev) => !prev)}
                title={isVoiceEnabled ? 'Mute assistant voice' : 'Enable assistant voice'}
                aria-label={isVoiceEnabled ? 'Mute assistant voice' : 'Enable assistant voice'}
              >
                <Volume2 size={14} className={isVoiceEnabled ? 'text-primary' : 'text-muted'} />
              </button>
            </div>

            <button 
              type="button" 
              className="btn-close extra-small p-0" 
              onClick={() => setIsOpen(false)}
              aria-label="Close"
            />
          </div>
          <p className="text-dark small mb-0 lh-sm">
            {message}
          </p>
        </div>
      )}

      {/* Floating Animated Avatar Button */}
      <button
        type="button"
        className="btn btn-primary rounded-circle shadow-lg d-flex align-items-center justify-content-center p-3 position-relative"
        style={{ width: '56px', height: '56px' }}
        onClick={() => setIsOpen(!isOpen)}
        title="Toggle Assistant"
      >
        <Bot size={28} className="animate-bounce" />
        
        {/* Pulsing indicator dot */}
        <span className="position-absolute top-0 start-0 translate-middle p-2 bg-success border border-light rounded-circle animate-pulse">
          <span className="visually-hidden">Active</span>
        </span>
      </button>
    </div>
  );
}