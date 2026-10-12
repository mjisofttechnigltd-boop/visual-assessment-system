import React, { useState, useEffect, useRef } from 'react';
import { 
  CheckCircle2, 
  RotateCcw, 
  Eye, 
  Ruler, 
  Camera, 
  CameraOff, 
  Mic, 
  MicOff 
} from 'lucide-react';

const SNELLEN_LINES = [
  { fraction: '20/200', logMAR: 1.0, mmHeight: 88.0, letters: ['E'] },
  { fraction: '20/100', logMAR: 0.7, mmHeight: 44.0, letters: ['F', 'P'] },
  { fraction: '20/70',  logMAR: 0.54, mmHeight: 30.8, letters: ['T', 'O', 'Z'] },
  { fraction: '20/50',  logMAR: 0.4, mmHeight: 22.0, letters: ['L', 'P', 'E', 'D'] },
  { fraction: '20/40',  logMAR: 0.3, mmHeight: 17.6, letters: ['P', 'E', 'C', 'F', 'D'] },
  { fraction: '20/30',  logMAR: 0.18, mmHeight: 13.2, letters: ['E', 'D', 'F', 'C', 'Z', 'P'] },
  { fraction: '20/25',  logMAR: 0.1, mmHeight: 11.0, letters: ['F', 'E', 'L', 'O', 'P', 'Z', 'D'] },
  { fraction: '20/20',  logMAR: 0.0, mmHeight: 8.8,  letters: ['D', 'E', 'F', 'P', 'O', 'T', 'E', 'C'] }
];

export default function SnellenCanvas({ 
  pxPerMm = 3.78, 
  eyeSelection = 'OU (Both Eyes)', 
  onTestComplete, 
  onCancel 
}) {
  const [currentLineIdx, setCurrentLineIdx] = useState(0);
  const [lineResults, setLineResults] = useState([]);
  const [isFinished, setIsFinished] = useState(false);
  const [userInput, setUserInput] = useState('');
  
  // Camera & Distance State
  const [cameraActive, setCameraActive] = useState(true);
  const [measuredDistanceCm, setMeasuredDistanceCm] = useState(35);
  const [distanceStatus, setDistanceStatus] = useState('ideal');
  const [isMobile, setIsMobile] = useState(false);
  const videoRef = useRef(null);

  // Speech Recognition State
  const [isListening, setIsListening] = useState(false);

  const currentLine = SNELLEN_LINES[currentLineIdx];

  const handleForceIdealDistance = (e) => {
    if (e) e.stopPropagation();
    setMeasuredDistanceCm(35);
    setDistanceStatus('ideal');
  }; 

  // Check for mobile viewport
  useEffect(() => {
    const updateViewportMode = () => {
      setIsMobile(window.matchMedia('(max-width: 767px)').matches);
    };

    updateViewportMode();
    window.addEventListener('resize', updateViewportMode);
    return () => window.removeEventListener('resize', updateViewportMode);
  }, []);

  // 1. WebCam Distance Estimation
  useEffect(() => {
    let stream = null;
    let animationFrameId = null;
    let baseLighting = null;
    let smoothedDist = 35;

    if (cameraActive) {
      navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240, facingMode: 'user' } })
        .then((s) => {
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }

          const procCanvas = document.createElement('canvas');
          procCanvas.width = 160;
          procCanvas.height = 120;
          const procCtx = procCanvas.getContext('2d', { willReadFrequently: true });

          let lastTime = 0;
          const trackUserMovement = (timestamp) => {
            if (timestamp - lastTime > 200) {
              lastTime = timestamp;

              if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
                procCtx.drawImage(videoRef.current, 0, 0, 160, 120);
                const frameData = procCtx.getImageData(40, 30, 80, 60).data;

                let totalBrightness = 0;
                for (let i = 0; i < frameData.length; i += 16) {
                  totalBrightness += (frameData[i] + frameData[i + 1] + frameData[i + 2]) / 3;
                }
                const currentBrightness = totalBrightness / (frameData.length / 16);

                if (baseLighting === null && currentBrightness > 10) {
                  baseLighting = currentBrightness;
                }

                const baseline = baseLighting || 100;
                const delta = currentBrightness - baseline;
                let estimatedCm = 35 - (delta * 0.35);
                estimatedCm = Math.max(25, Math.min(55, estimatedCm));

                const alpha = 0.2;
                smoothedDist = (alpha * estimatedCm) + ((1 - alpha) * smoothedDist);
                const finalDist = Math.round(smoothedDist);

                setMeasuredDistanceCm(finalDist);

                if (finalDist < 30) {
                  setDistanceStatus('too_close');
                } else if (finalDist > 40) {
                  setDistanceStatus('too_far');
                } else {
                  setDistanceStatus('ideal');
                }
              }
            }
            animationFrameId = requestAnimationFrame(trackUserMovement);
          };

          animationFrameId = requestAnimationFrame(trackUserMovement);
        })
        .catch((err) => {
          console.error('Camera access denied:', err);
          setCameraActive(false);
        });
    }

    return () => {
      if (stream) stream.getTracks().forEach((track) => track.stop());
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [cameraActive]);

  // 2. Physical Keyboard Listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isFinished || distanceStatus !== 'ideal') return;
      const char = e.key.toUpperCase();
      
      if (/^[A-Z]$/.test(char)) {
        setUserInput((prev) => (prev + char).slice(0, currentLine.letters.length));
      } else if (e.key === 'Backspace') {
        setUserInput((prev) => prev.slice(0, -1));
      } else if (e.key === 'Enter') {
        evaluateCurrentInput();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentLine, isFinished, userInput, distanceStatus]);

  // 3. Evaluate Patient Input
  const evaluateCurrentInput = () => {
    if (!userInput.trim() || distanceStatus !== 'ideal') return;

    const target = currentLine.letters.join('');
    const passed = userInput.trim().toUpperCase() === target;

    const updatedResults = [
      ...lineResults,
      { line: currentLine, passed, userEntered: userInput }
    ];

    setLineResults(updatedResults);
    setUserInput('');

    if (!passed || currentLineIdx === SNELLEN_LINES.length - 1) {
      finishAssessment(updatedResults);
    } else {
      setCurrentLineIdx((prev) => prev + 1);
    }
  };

  // Compile Final Payload and Save
  const finishAssessment = (finalResults) => {
    setIsFinished(true);

    const passedLines = finalResults.filter((r) => r.passed);
    const bestPassed = passedLines.length > 0 ? passedLines[passedLines.length - 1].line : null;

    const finalFraction = bestPassed ? bestPassed.fraction : 'Off-Chart (< 20/200)';
    const finalLogMAR = bestPassed ? bestPassed.logMAR : 1.1;

    let severity = 'normal';
    if (finalLogMAR >= 0.5) {
      severity = 'action_required';
    } else if (finalLogMAR >= 0.3) {
      severity = 'moderate';
    }

    const payload = {
      score: finalFraction,
      severity: severity,
      eyeTested: eyeSelection,
      details: {
        acuityLogMAR: finalLogMAR.toFixed(2),
        smallestLineRead: finalFraction,
        measuredDistance: `${measuredDistanceCm} cm`,
        totalLinesAttempted: finalResults.length,
        screenCalibration: `${pxPerMm.toFixed(2)} px/mm`
      }
    };

    if (onTestComplete) {
      onTestComplete(payload);
    }
  };

  // Voice Input Toggle
  const toggleVoiceInput = () => {
    if (distanceStatus !== 'ideal') return;

    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    if (!isListening) {
      setIsListening(true);
      recognition.start();

      recognition.onresult = (event) => {
        const spokenText = event.results[0][0].transcript.toUpperCase().replace(/[^A-Z]/g, '');
        setUserInput(spokenText.slice(0, currentLine.letters.length));
        setIsListening(false);
      };

      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
    } else {
      setIsListening(false);
    }
  };

  const handleRestart = () => {
    setCurrentLineIdx(0);
    setLineResults([]);
    setUserInput('');
    setIsFinished(false);
    setMeasuredDistanceCm(35);
    setDistanceStatus('ideal');
  };

  return (
    <div className="snellen-canvas-container" style={{ width: '100%', maxWidth: '100%' }}>
      {/* Top Bar */}
      <div className="d-flex flex-wrap justify-content-between align-items-center bg-light p-3 rounded mb-4 border" style={{ gap: '0.5rem' }}>
        <div className="d-flex align-items-center gap-3 flex-wrap">
          <span className="badge bg-secondary d-flex align-items-center gap-1">
            <Eye size={14} /> {eyeSelection}
          </span>
          
          <span className={`badge d-flex align-items-center gap-1 ${
            distanceStatus === 'ideal' ? 'bg-success' : 'bg-warning text-dark'
          }`}>
            <Ruler size={14} /> Distance: {measuredDistanceCm} cm 
            {distanceStatus === 'too_close' && ' (Too Close!)'}
            {distanceStatus === 'too_far' && ' (Move Closer!)'}
          </span>
        </div>

        <div className="d-flex align-items-center gap-2 flex-wrap">
          <button
            type="button"
            className={`btn ${cameraActive ? 'btn-primary' : 'btn-outline-secondary'} d-inline-flex align-items-center gap-1`}
            onClick={() => setCameraActive(!cameraActive)}
            style={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}
          >
            {cameraActive ? <Camera size={14} /> : <CameraOff size={14} />}
            {cameraActive ? 'Distance Monitor On' : 'Enable Camera Distance'}
          </button>

          <button 
            type="button"
            className="btn btn-outline-secondary d-inline-flex align-items-center gap-1"
            onClick={handleRestart}
            style={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}
          >
            <RotateCcw size={14} /> Reset
          </button>
        </div>
      </div>

      {/* Video Feed Preview */}
      {cameraActive && (
        <div className="mb-3 p-2 bg-dark rounded d-flex align-items-center gap-3 text-white" style={{ flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center' }}>
          <video 
            ref={videoRef} 
            autoPlay 
            muted 
            playsInline 
            style={{ width: isMobile ? '100%' : '80px', maxWidth: isMobile ? '180px' : '80px', height: isMobile ? '72px' : '60px', objectFit: 'cover', borderRadius: '4px' }}
          />
          <div className="small">
            <div className="fw-bold">Optical Distance Tracker Active</div>
            <div className="text-white-50 extra-small">Target Distance: 100 cm | Current: {measuredDistanceCm} cm</div>
          </div>
        </div>
      )}

      {!isFinished ? (
        <div className="row g-4 align-items-center">
          {/* Optotype Screen */}
          <div className="col-12 col-md-7">
            <div 
              className="border rounded bg-white p-4 d-flex flex-column align-items-center justify-content-center shadow-inner overflow-hidden position-relative"
              style={{ minHeight: isMobile ? '220px' : '360px', padding: isMobile ? '1rem' : '2rem' }}
            >
              {distanceStatus !== 'ideal' && (
                <div
                  className="position-absolute top-0 start-0 w-100 h-100 bg-dark bg-opacity-85 d-flex flex-column align-items-center justify-content-center text-center p-3 z-3"
                  style={{ backdropFilter: 'blur(4px)' }}
                >
                  <div className="p-3 bg-danger text-white rounded-circle mb-2">
                    <Ruler size={28} />
                  </div>
                  <h6 className="fw-bold text-white mb-1">Testing Paused (Motion Lock)</h6>
                  <p className="text-white-50 extra-small mb-2 max-w-xs">
                    Please position yourself <strong>35 cm</strong> from the screen.
                  </p>
                  <button 
                    type="button" 
                    className="btn btn-sm btn-light fw-bold text-dark"
                    onClick={handleForceIdealDistance}
                  >
                    Bypass / Force Unlock
                  </button>
                </div>
              )}

              <div className="text-center mb-2">
                <span className="badge bg-primary-subtle text-primary fw-bold font-monospace mb-1">
                  Line {currentLineIdx + 1} of {SNELLEN_LINES.length}
                </span>
                <p className="extra-small text-muted mb-0">Read the letters aloud or type what you see.</p>
              </div>

              <div className="my-3 text-center select-none" style={{ width: '100%', overflow: 'hidden' }}>
                <div
                  className="d-inline-flex align-items-center justify-content-center border rounded bg-light px-3 py-4 shadow-sm"
                  style={{
                    minHeight: isMobile ? '110px' : '170px',
                    fontSize: isMobile ? '2.8rem' : '4rem',
                    letterSpacing: '0.15em',
                    fontWeight: 700,
                    fontFamily: 'monospace',
                    transform: 'scale(1)',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {currentLine.letters.join(' ')}
                </div>
              </div>

              <div className="w-100 max-w-xs text-center mt-2">
                <div className="input-group" style={{ flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
                  <input
                    type="text"
                    className="form-control text-center font-monospace fw-bold fs-5"
                    placeholder="Type letters..."
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, currentLine.letters.length))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') evaluateCurrentInput();
                    }}
                    style={{ minHeight: isMobile ? '48px' : 'auto' }}
                    disabled={distanceStatus !== 'ideal'}
                  />
                  <button
                    className={`btn ${isListening ? 'btn-danger' : 'btn-outline-secondary'}`}
                    type="button"
                    onClick={toggleVoiceInput}
                    title="Speak letters"
                    style={{ minHeight: isMobile ? '48px' : 'auto' }}
                    disabled={distanceStatus !== 'ideal'}
                  >
                    {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                  </button>
                  <button
                    className="btn btn-primary fw-bold"
                    type="button"
                    onClick={evaluateCurrentInput}
                    style={{ minHeight: isMobile ? '48px' : 'auto' }}
                    disabled={distanceStatus !== 'ideal'}
                  >
                    Submit
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Input Helper */}
          <div className="col-12 col-md-5">
            <div className="card border-0 bg-light p-3" style={{ padding: isMobile ? '1rem' : '1.5rem' }}>
              <h6 className="fw-bold mb-2 text-dark">Quick Entry</h6>
              <p className="extra-small text-muted mb-3">Use the keyboard, voice input, or tap the letters below:</p>

              <div className="d-grid gap-2 mb-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
                {['A', 'B', 'C', 'D', 'E', 'F', 'L', 'O', 'P', 'T', 'Z', 'Y'].map((letter) => (
                  <button
                    key={letter}
                    type="button"
                    className="btn btn-white border fw-bold py-2 font-monospace shadow-sm"
                    onClick={() => setUserInput((prev) => (prev + letter).slice(0, currentLine.letters.length))}
                    style={{ minHeight: isMobile ? '52px' : 'auto' }}
                    disabled={distanceStatus !== 'ideal'}
                  >
                    {letter}
                  </button>
                ))}
                <button
                  type="button"
                  className="btn btn-outline-danger fw-bold py-2"
                  onClick={() => setUserInput('')}
                  style={{ minHeight: isMobile ? '52px' : 'auto' }}
                  disabled={distanceStatus !== 'ideal'}
                >
                  Clear
                </button>
                <button
                  type="button"
                  className="btn btn-primary fw-bold py-2"
                  onClick={evaluateCurrentInput}
                  style={{ minHeight: isMobile ? '52px' : 'auto' }}
                  disabled={distanceStatus !== 'ideal'}
                >
                  Enter
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="card border-success shadow-sm" style={{ width: '100%' }}>
          <div className="card-body p-4 text-center">
            <div className="p-3 bg-success-subtle text-success rounded-circle d-inline-flex mb-3">
              <CheckCircle2 size={36} />
            </div>
            <h5 className="fw-bold text-dark mb-1">Snellen Test Completed</h5>
            <p className="text-muted small mb-3">The final acuity result has been calculated and recorded.</p>
            <button className="btn btn-outline-primary btn-sm" onClick={handleRestart}>
              Run Another Snellen Test
            </button>
          </div>
        </div>
      )}
    </div>
  );
}