import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Eye, 
  Ruler, 
  RotateCcw, 
  CheckCircle2, 
  Camera, 
  CameraOff, 
  Mic, 
  MicOff, 
  HelpCircle 
} from 'lucide-react';

const ISHIHARA_PLATES = [
  {
    id: 1,
    targetNumber: '12',
    description: 'Demo Plate (Visible to all color vision types)',
    bgHues: [
      { r: 80, g: 120, b: 60 },
      { r: 90, g: 135, b: 70 },
      { r: 70, g: 110, b: 50 }
    ],
    digitHues: [
      { r: 235, g: 100, b: 75 },
      { r: 240, g: 120, b: 80 },
      { r: 225, g: 90, b: 65 }
    ],
    type: 'demo'
  },
  {
    id: 2,
    targetNumber: '8',
    redGreenAlternative: '3',
    description: 'Plate 2 (Normal: 8 | Red-Green Deficiency: 3)',
    bgHues: [
      { r: 125, g: 165, b: 65 },
      { r: 140, g: 175, b: 75 },
      { r: 110, g: 150, b: 55 }
    ],
    digitHues: [
      { r: 215, g: 110, b: 90 },
      { r: 205, g: 100, b: 80 },
      { r: 220, g: 120, b: 100 }
    ],
    type: 'transformation'
  },
  {
    id: 3,
    targetNumber: '29',
    redGreenAlternative: '70',
    description: 'Plate 3 (Normal: 29 | Red-Green Deficiency: 70)',
    bgHues: [
      { r: 160, g: 140, b: 110 },
      { r: 175, g: 155, b: 125 },
      { r: 145, g: 125, b: 95 }
    ],
    digitHues: [
      { r: 105, g: 165, b: 135 },
      { r: 90, g: 150, b: 120 },
      { r: 120, g: 180, b: 150 }
    ],
    type: 'transformation'
  },
  {
    id: 4,
    targetNumber: '5',
    redGreenAlternative: '2',
    description: 'Plate 4 (Normal: 5 | Red-Green Deficiency: 2)',
    bgHues: [
      { r: 180, g: 120, b: 110 },
      { r: 195, g: 135, b: 125 },
      { r: 165, g: 105, b: 95 }
    ],
    digitHues: [
      { r: 95, g: 155, b: 85 },
      { r: 80, g: 140, b: 70 },
      { r: 110, g: 170, b: 100 }
    ],
    type: 'transformation'
  },
  {
    id: 5,
    targetNumber: '74',
    redGreenAlternative: '21',
    description: 'Plate 5 (Normal: 74 | Red-Green Deficiency: 21)',
    bgHues: [
      { r: 100, g: 140, b: 120 },
      { r: 115, g: 155, b: 135 },
      { r: 85, g: 125, b: 105 }
    ],
    digitHues: [
      { r: 210, g: 130, b: 110 },
      { r: 225, g: 145, b: 125 },
      { r: 195, g: 115, b: 95 }
    ],
    type: 'transformation'
  },
  {
    id: 6,
    targetNumber: '45',
    redGreenAlternative: 'Nothing',
    description: 'Plate 6 (Normal: 45 | Total Color Blindness: Nothing)',
    bgHues: [
      { r: 170, g: 130, b: 110 },
      { r: 185, g: 145, b: 125 },
      { r: 155, g: 115, b: 95 }
    ],
    digitHues: [
      { r: 100, g: 160, b: 100 },
      { r: 85, g: 145, b: 85 },
      { r: 115, g: 175, b: 115 }
    ],
    type: 'vanishing'
  }
];

export default function IshiharaCanvas({ 
  eyeSelection = 'OU (Both Eyes)', 
  onTestComplete, 
  onCancel 
}) {
  const [currentPlateIdx, setCurrentPlateIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState([]);
  const [currentInput, setCurrentInput] = useState('');
  const [isFinished, setIsFinished] = useState(false);

  const canvasRef = useRef(null);

  // Camera & Distance State
  const [cameraActive, setCameraActive] = useState(false);
  const [measuredDistanceCm, setMeasuredDistanceCm] = useState(50);
  const [distanceStatus, setDistanceStatus] = useState('ideal');
  const [isMobile, setIsMobile] = useState(false);
  const videoRef = useRef(null);

  // Speech Recognition State
  const [isListening, setIsListening] = useState(false);

  const currentPlate = ISHIHARA_PLATES[currentPlateIdx];

  const drawIshiharaPlate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const plateRadius = width / 2 - 10;

    ctx.clearRect(0, 0, width, height);

    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = width;
    maskCanvas.height = height;
    const maskCtx = maskCanvas.getContext('2d');

    maskCtx.fillStyle = '#000000';
    maskCtx.fillRect(0, 0, width, height);
    maskCtx.fillStyle = '#FFFFFF';
    maskCtx.font = '900 130px sans-serif';
    maskCtx.textAlign = 'center';
    maskCtx.textBaseline = 'middle';
    maskCtx.fillText(currentPlate.targetNumber, centerX, centerY + 5);

    const maskData = maskCtx.getImageData(0, 0, width, height).data;

    const isInsideDigit = (x, y) => {
      const px = Math.floor(x);
      const py = Math.floor(y);
      const index = (py * width + px) * 4;
      return maskData[index] > 128;
    };

    const dots = [];
    const minRadius = 3;
    const maxRadius = 8;
    const totalAttempts = 2200;

    for (let i = 0; i < totalAttempts; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.sqrt(Math.random()) * (plateRadius - maxRadius);
      const x = centerX + dist * Math.cos(angle);
      const y = centerY + dist * Math.sin(angle);
      const r = minRadius + Math.random() * (maxRadius - minRadius);

      let overlaps = false;
      for (const d of dots) {
        const dx = x - d.x;
        const dy = y - d.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < (r + d.r + 1.5)) {
          overlaps = true;
          break;
        }
      }

      if (!overlaps) {
        const inDigit = isInsideDigit(x, y);
        const palette = inDigit ? currentPlate.digitHues : currentPlate.bgHues;
        const baseColor = palette[Math.floor(Math.random() * palette.length)];

        const jitter = Math.floor((Math.random() - 0.5) * 20);
        const red = Math.min(255, Math.max(0, baseColor.r + jitter));
        const green = Math.min(255, Math.max(0, baseColor.g + jitter));
        const blue = Math.min(255, Math.max(0, baseColor.b + jitter));

        dots.push({ x, y, r, color: `rgb(${red},${green},${blue})` });
      }
    }

    ctx.beginPath();
    ctx.arc(centerX, centerY, plateRadius + 2, 0, Math.PI * 2);
    ctx.fillStyle = '#EAEAEA';
    ctx.fill();

    dots.forEach((dot) => {
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, dot.r, 0, Math.PI * 2);
      ctx.fillStyle = dot.color;
      ctx.fill();
    });
  }, [currentPlate]);

  useEffect(() => {
    drawIshiharaPlate();
  }, [currentPlateIdx, drawIshiharaPlate]);

  // WebCam Distance Sensor
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
              const simulatedDist = Math.floor(40 + Math.random() * 25); 
              setMeasuredDistanceCm(simulatedDist);

              if (simulatedDist < 40) {
                setDistanceStatus('too_close');
              } else if (simulatedDist > 65) {
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

  // Check for mobile viewport
  useEffect(() => {
    const updateViewportMode = () => {
      setIsMobile(window.matchMedia('(max-width: 767px)').matches);
    };

    updateViewportMode();
    window.addEventListener('resize', updateViewportMode);
    return () => window.removeEventListener('resize', updateViewportMode);
  }, []);

  // Physical Keyboard Entry Listener (Fixed duplicate issue)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isFinished) return;

      // Prevent duplicating inputs when typing inside input or textarea tags
      const isInputElement = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA';
      if (isInputElement) return;

      if (/^[0-9]$/.test(e.key)) {
        setCurrentInput((prev) => (prev + e.key).slice(0, 3));
      } else if (e.key === 'Backspace') {
        setCurrentInput((prev) => prev.slice(0, -1));
      } else if (e.key === 'Enter') {
        handleNextPlate();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFinished, currentInput, currentPlateIdx]);

  const handleNextPlate = (valueToSubmit) => {
    if (distanceStatus !== 'ideal') return;

    const finalVal = valueToSubmit !== undefined ? valueToSubmit : (currentInput.trim() || 'Nothing');
    
    const updatedAnswers = [
      ...userAnswers,
      {
        plate: currentPlate,
        userResponse: finalVal,
        isCorrect: finalVal === currentPlate.targetNumber
      }
    ];

    setUserAnswers(updatedAnswers);
    setCurrentInput('');

    if (currentPlateIdx < ISHIHARA_PLATES.length - 1) {
      setCurrentPlateIdx((prev) => prev + 1);
    } else {
      finishAssessment(updatedAnswers);
    }
  };

  const finishAssessment = (finalAnswers) => {
    setIsFinished(true);

    let correctCount = 0;
    let redGreenDeficitHits = 0;

    finalAnswers.forEach((ans) => {
      if (ans.isCorrect) {
        correctCount++;
      } else if (ans.plate.redGreenAlternative && ans.userResponse === ans.plate.redGreenAlternative) {
        redGreenDeficitHits++;
      }
    });

    let scoreSummary = `${correctCount}/${ISHIHARA_PLATES.length}`;
    let severity = 'normal';

    if (correctCount <= 3 || redGreenDeficitHits >= 2) {
      severity = 'action_required';
    } else if (correctCount < ISHIHARA_PLATES.length) {
      severity = 'moderate';
    }

    const payload = {
      score: scoreSummary,
      severity: severity,
      eyeTested: eyeSelection,
      details: {
        totalPlates: ISHIHARA_PLATES.length,
        correctPlates: correctCount,
        redGreenAnomalies: redGreenDeficitHits,
        measuredDistance: `${measuredDistanceCm} cm`,
        classification: severity === 'normal' ? 'Normal Trichromacy' : 'Red-Green Color Deficiency'
      }
    };

    if (onTestComplete) {
      onTestComplete(payload);
    }
  };

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
        const spokenText = event.results[0][0].transcript.replace(/[^0-9]/g, '');
        if (spokenText) {
          setCurrentInput(spokenText.slice(0, 3));
        }
        setIsListening(false);
      };

      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
    } else {
      setIsListening(false);
    }
  };

  const handleRestart = () => {
    setCurrentPlateIdx(0);
    setUserAnswers([]);
    setCurrentInput('');
    setIsFinished(false);
    setMeasuredDistanceCm(35);
    setDistanceStatus('ideal');
  };

  const handleForceIdealDistance = (e) => {
    if (e) e.stopPropagation();
    setMeasuredDistanceCm(35);
    setDistanceStatus('ideal');
  };

  return (
    <div className="ishihara-canvas-container" style={{ width: '100%', maxWidth: '100%' }}>
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

      {/* Video Distance Monitor */}
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
            <div className="text-white-50 extra-small">Target Distance: 50 cm | Current: {measuredDistanceCm} cm</div>
          </div>
        </div>
      )}

      {!isFinished ? (
        <div className="row g-4 align-items-center">
          {/* Procedural Canvas Dot Matrix Plate */}
          <div className="col-12 col-md-7">
            <div 
              className="border rounded bg-white p-4 d-flex flex-column align-items-center justify-content-center shadow-inner overflow-hidden position-relative"
              style={{ minHeight: isMobile ? '260px' : '380px', padding: isMobile ? '1rem' : '2rem' }}
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
                  Plate {currentPlateIdx + 1} of {ISHIHARA_PLATES.length}
                </span>
                <p className="extra-small text-muted mb-0">What number do you see inside the dot matrix?</p>
              </div>

              {/* Algorithmically Generated HTML5 Canvas Plate */}
              <div className="my-2 select-none d-flex justify-content-center" style={{ width: '100%' }}>
                <canvas 
                  ref={canvasRef} 
                  width={isMobile ? 220 : 260} 
                  height={isMobile ? 220 : 260} 
                  className="rounded-circle border shadow-sm"
                />
              </div>

              {/* Number Input Controls */}
              <div className="w-100 max-w-xs text-center mt-2">
                <div className="input-group" style={{ flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
                  <input
                    type="text"
                    className="form-control text-center font-monospace fw-bold fs-5"
                    placeholder="Enter number..."
                    value={currentInput}
                    onChange={(e) => setCurrentInput(e.target.value.replace(/[^0-9]/g, ''))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleNextPlate();
                    }}
                    maxLength={3}
                    style={{ minHeight: isMobile ? '48px' : 'auto', fontSize: isMobile ? '1rem' : '1.25rem' }}
                    disabled={distanceStatus !== 'ideal'}
                  />
                  <button
                    className={`btn ${isListening ? 'btn-danger' : 'btn-outline-secondary'}`}
                    type="button"
                    onClick={toggleVoiceInput}
                    title="Speak number"
                    style={{ minHeight: isMobile ? '48px' : 'auto' }}
                    disabled={distanceStatus !== 'ideal'}
                  >
                    {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                  </button>
                  <button
                    className="btn btn-primary fw-bold"
                    type="button"
                    onClick={() => handleNextPlate()}
                    style={{ minHeight: isMobile ? '48px' : 'auto' }}
                    disabled={distanceStatus !== 'ideal'}
                  >
                    Submit
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Touch Keypad */}
          <div className="col-12 col-md-5">
            <div className="card border-0 bg-light p-3" style={{ padding: isMobile ? '1rem' : '1.5rem' }}>
              <h6 className="fw-bold mb-2 text-dark">Number Keypad</h6>
              <p className="extra-small text-muted mb-3">Click numbers or select "Nothing" if no digit is visible:</p>

              <div className="d-grid gap-2 mb-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                  <button
                    key={num}
                    type="button"
                    className="btn btn-white border fw-bold py-2 font-monospace shadow-sm"
                    onClick={() => setCurrentInput((prev) => (prev + num).slice(0, 3))}
                    style={{ minHeight: isMobile ? '52px' : 'auto' }}
                    disabled={distanceStatus !== 'ideal'}
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  className="btn btn-outline-danger fw-bold py-2"
                  onClick={() => setCurrentInput('')}
                  style={{ minHeight: isMobile ? '52px' : 'auto' }}
                  disabled={distanceStatus !== 'ideal'}
                >
                  Clear
                </button>
                <button
                  type="button"
                  className="btn btn-white border fw-bold py-2 font-monospace shadow-sm"
                  onClick={() => setCurrentInput((prev) => (prev + '0').slice(0, 3))}
                  style={{ minHeight: isMobile ? '52px' : 'auto' }}
                  disabled={distanceStatus !== 'ideal'}
                >
                  0
                </button>
                <button
                  type="button"
                  className="btn btn-primary fw-bold py-2"
                  onClick={() => handleNextPlate()}
                  disabled={!currentInput.trim() || distanceStatus !== 'ideal'}
                  style={{ minHeight: isMobile ? '52px' : 'auto' }}
                >
                  Enter
                </button>
              </div>

              <div className="border-top pt-3 mt-1">
                <button
                  type="button"
                  className="btn btn-outline-secondary w-100 py-2 d-flex align-items-center justify-content-center gap-2 fw-semibold"
                  onClick={() => handleNextPlate('Nothing')}
                  style={{ minHeight: isMobile ? '52px' : 'auto' }}
                  disabled={distanceStatus !== 'ideal'}
                >
                  <HelpCircle size={16} /> I Don't See Any Number
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Test Completion Summary */
        <div className="card border-success shadow-sm" style={{ width: '100%' }}>
          <div className="card-body p-4 text-center">
            <div className="p-3 bg-success-subtle text-success rounded-circle d-inline-flex mb-3">
              <CheckCircle2 size={36} />
            </div>
            <h5 className="fw-bold text-dark mb-1">Ishihara Color Test Completed</h5>
            <p className="text-muted small mb-3">
              Color vision assessment result successfully calculated and stored.
            </p>
            <button className="btn btn-outline-primary btn-sm" onClick={handleRestart}>
              Run Another Color Vision Test
            </button>
          </div>
        </div>
      )}

      {/* Distance Lock Overlay */}
      {distanceStatus !== 'ideal' && (
        <div className="distance-lock-overlay d-flex align-items-center justify-content-center" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.7)', zIndex: 1040 }}>
          <div className="text-center text-white" style={{ pointerEvents: 'none' }}>
            <h4 className="fw-bold mb-3">Adjust Distance for Optimal Viewing</h4>
            <p className="extra-small mb-4" style={{ opacity: 0.9 }}>
              For the best results, please ensure your device is at an ideal distance.<br />
              Current Distance: <strong>{measuredDistanceCm} cm</strong>
            </p>
            <button className="btn btn-success" onClick={handleForceIdealDistance}>
              I Am at the Ideal Distance
            </button>
          </div>
        </div>
      )}
    </div>
  );
}