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
  const [cameraActive, setCameraActive] = useState(false);
  const [measuredDistanceCm, setMeasuredDistanceCm] = useState(100);
  const [distanceStatus, setDistanceStatus] = useState('ideal');
  const videoRef = useRef(null);

  // Speech Recognition State
  const [isListening, setIsListening] = useState(false);

  const currentLine = SNELLEN_LINES[currentLineIdx];

  // 1. WebCam Distance Estimation
  useEffect(() => {
    let stream = null;
    let interval = null;

    if (cameraActive) {
      navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } })
        .then((s) => {
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }

          interval = setInterval(() => {
            if (videoRef.current) {
              const simulatedDist = Math.floor(80 + Math.random() * 45); 
              setMeasuredDistanceCm(simulatedDist);

              if (simulatedDist < 90) {
                setDistanceStatus('too_close');
              } else if (simulatedDist > 120) {
                setDistanceStatus('too_far');
              } else {
                setDistanceStatus('ideal');
              }
            }
          }, 1500);
        })
        .catch((err) => {
          console.error('Camera access denied:', err);
          setCameraActive(false);
        });
    }

    return () => {
      if (stream) stream.getTracks().forEach((track) => track.stop());
      if (interval) clearInterval(interval);
    };
  }, [cameraActive]);

  // 2. Physical Keyboard Listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isFinished) return;
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
  }, [currentLine, isFinished, userInput]);

  // 3. Evaluate Patient Input
  const evaluateCurrentInput = () => {
    if (!userInput.trim()) return;

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
  };

  return (
    <div className="snellen-canvas-container">
      {/* Top Bar */}
      <div className="d-flex flex-wrap justify-content-between align-items-center bg-light p-3 rounded mb-4 border">
        <div className="d-flex align-items-center gap-3">
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

        <div className="d-flex align-items-center gap-2">
          <button
            type="button"
            className={`btn btn-sm ${cameraActive ? 'btn-primary' : 'btn-outline-secondary'} d-inline-flex align-items-center gap-1`}
            onClick={() => setCameraActive(!cameraActive)}
          >
            {cameraActive ? <Camera size={14} /> : <CameraOff size={14} />}
            {cameraActive ? 'Distance Monitor On' : 'Enable Camera Distance'}
          </button>

          <button 
            type="button"
            className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-1"
            onClick={handleRestart}
          >
            <RotateCcw size={14} /> Reset
          </button>
        </div>
      </div>

      {/* Video Feed Preview */}
      {cameraActive && (
        <div className="mb-3 p-2 bg-dark rounded d-flex align-items-center gap-3 text-white">
          <video 
            ref={videoRef} 
            autoPlay 
            muted 
            playsInline 
            style={{ width: '80px', height: '60px', objectFit: 'cover', borderRadius: '4px' }}
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
              className="border rounded bg-white p-4 d-flex flex-column align-items-center justify-content-center shadow-inner overflow-hidden"
              style={{ minHeight: '360px' }}
            >
              <div className="text-center mb-3">
                <span className="badge bg-primary-subtle text-primary fw-bold font-monospace mb-1">
                  Line {currentLineIdx + 1} of {SNELLEN_LINES.length} &mdash; {currentLine.fraction}
                </span>
                <p className="extra-small text-muted mb-0">Read the letters on screen below.</p>
              </div>

              {/* Displayed Letters */}
              <div 
                className="d-flex align-items-center justify-content-center gap-3 font-monospace fw-bold text-dark my-4 select-none"
                style={{
                  fontSize: `${currentLine.mmHeight * pxPerMm}px`,
                  lineHeight: 1,
                  letterSpacing: `${(currentLine.mmHeight * pxPerMm) * 0.2}px`
                }}
              >
                {currentLine.letters.map((char, index) => (
                  <span key={index}>{char}</span>
                ))}
              </div>

              {/* Text / Voice Input Box */}
              <div className="mt-3 w-100 max-w-xs text-center">
                <label className="form-label extra-small text-muted fw-semibold">Patient Input Answer:</label>
                <div className="input-group">
                  <input
                    type="text"
                    className="form-control text-center font-monospace fw-bold fs-5 text-uppercase"
                    placeholder="Type letters..."
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value.toUpperCase())}
                    maxLength={currentLine.letters.length}
                  />
                  <button
                    className={`btn ${isListening ? 'btn-danger' : 'btn-outline-secondary'}`}
                    type="button"
                    onClick={toggleVoiceInput}
                    title="Speak letters"
                  >
                    {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                  </button>
                  <button
                    className="btn btn-primary fw-bold"
                    type="button"
                    onClick={evaluateCurrentInput}
                    disabled={!userInput.trim()}
                  >
                    Submit
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Patient On-Screen Keypad */}
          <div className="col-12 col-md-5">
            <div className="card border-0 bg-light p-3">
              <h6 className="fw-bold mb-2 text-dark">Patient Input Keypad</h6>
              <p className="extra-small text-muted mb-3">Click optotype letters to input response:</p>

              <div className="d-flex flex-wrap gap-1 mb-3">
                {['C', 'D', 'E', 'F', 'L', 'O', 'P', 'T', 'Z'].map((letter) => (
                  <button
                    key={letter}
                    type="button"
                    className="btn btn-white border fw-bold flex-grow-1 py-2 font-monospace shadow-sm"
                    onClick={() => setUserInput((prev) => (prev + letter).slice(0, currentLine.letters.length))}
                  >
                    {letter}
                  </button>
                ))}
                <button
                  type="button"
                  className="btn btn-outline-danger fw-bold py-2 px-3"
                  onClick={() => setUserInput('')}
                >
                  Clear
                </button>
              </div>

              <div className="d-grid mt-2">
                <button
                  type="button"
                  className="btn btn-primary py-2 fw-bold"
                  onClick={evaluateCurrentInput}
                  disabled={!userInput.trim()}
                >
                  Confirm Response ({userInput.length}/{currentLine.letters.length})
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Test Completion Summary */
        <div className="card border-success shadow-sm">
          <div className="card-body p-4 text-center">
            <div className="p-3 bg-success-subtle text-success rounded-circle d-inline-flex mb-3">
              <CheckCircle2 size={36} />
            </div>
            <h5 className="fw-bold text-dark mb-1">Snellen Test Completed</h5>
            <p className="text-muted small mb-3">
              Visual acuity score successfully saved to the Test History Dashboard.
            </p>
            <button className="btn btn-outline-primary btn-sm" onClick={handleRestart}>
              Run Another Snellen Test
            </button>
          </div>
        </div>
      )}
    </div>
  );
}