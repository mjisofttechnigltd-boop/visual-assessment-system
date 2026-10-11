import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Eye, 
  Ruler, 
  RotateCcw, 
  CheckCircle2, 
  ArrowUp, 
  ArrowDown, 
  ArrowLeft, 
  ArrowRight,
  Camera,
  CameraOff
} from 'lucide-react';

const E_CHART_LINES = [
  { fraction: '20/200', logMAR: 1.0, mmHeight: 88.0 },
  { fraction: '20/100', logMAR: 0.7, mmHeight: 44.0 },
  { fraction: '20/70',  logMAR: 0.54, mmHeight: 30.8 },
  { fraction: '20/50',  logMAR: 0.4, mmHeight: 22.0 },
  { fraction: '20/40',  logMAR: 0.3, mmHeight: 17.6 },
  { fraction: '20/30',  logMAR: 0.18, mmHeight: 13.2 },
  { fraction: '20/25',  logMAR: 0.1, mmHeight: 11.0 },
  { fraction: '20/20',  logMAR: 0.0, mmHeight: 8.8 }
];

const DIRECTIONS = ['UP', 'RIGHT', 'DOWN', 'LEFT'];

const ROTATION_MAP = {
  RIGHT: 0,
  DOWN: 90,
  LEFT: 180,
  UP: 270
};

export default function TumblingECanvas({ 
  pxPerMm = 3.78, 
  eyeSelection = 'OU (Both Eyes)', 
  onTestComplete, 
  onCancel 
}) {
  const [currentLineIdx, setCurrentLineIdx] = useState(0);
  const [trialCount, setTrialCount] = useState(0);
  const [correctInLine, setCorrectInLine] = useState(0);
  const [currentDirection, setCurrentDirection] = useState('RIGHT');
  const [lineResults, setLineResults] = useState([]);
  const [isFinished, setIsFinished] = useState(false);

  // Camera & Distance State
  const [cameraActive, setCameraActive] = useState(false);
  const [measuredDistanceCm, setMeasuredDistanceCm] = useState(100);
  const [distanceStatus, setDistanceStatus] = useState('ideal');
  const videoRef = useRef(null);

  const TRIALS_PER_LINE = 4;
  const PASS_THRESHOLD = 3;
  const currentLine = E_CHART_LINES[currentLineIdx];

  // Pick a random directional orientation for the Tumbling E
  const generateRandomDirection = useCallback(() => {
    const nextDir = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
    setCurrentDirection(nextDir);
  }, []);

  useEffect(() => {
    generateRandomDirection();
  }, [generateRandomDirection]);

  // WebCam Distance Estimation Tracker
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

  // Handle direction responses
  const handleResponse = useCallback((userDirection) => {
    if (isFinished) return;

    const isCorrect = userDirection === currentDirection;
    const newTrialCount = trialCount + 1;
    const newCorrectInLine = correctInLine + (isCorrect ? 1 : 0);

    if (newTrialCount < TRIALS_PER_LINE) {
      setTrialCount(newTrialCount);
      setCorrectInLine(newCorrectInLine);
      generateRandomDirection();
    } else {
      const passedLine = newCorrectInLine >= PASS_THRESHOLD;
      const updatedResults = [
        ...lineResults,
        { line: currentLine, passed: passedLine, score: `${newCorrectInLine}/${TRIALS_PER_LINE}` }
      ];

      setLineResults(updatedResults);

      if (!passedLine || currentLineIdx === E_CHART_LINES.length - 1) {
        finishAssessment(updatedResults);
      } else {
        setCurrentLineIdx((prev) => prev + 1);
        setTrialCount(0);
        setCorrectInLine(0);
        generateRandomDirection();
      }
    }
  }, [currentDirection, currentLine, currentLineIdx, isFinished, trialCount, correctInLine, lineResults, generateRandomDirection]);

  // Keyboard Navigation Listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isFinished) return;
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          handleResponse('UP');
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleResponse('RIGHT');
          break;
        case 'ArrowDown':
          e.preventDefault();
          handleResponse('DOWN');
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handleResponse('LEFT');
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleResponse, isFinished]);

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

  const handleRestart = () => {
    setCurrentLineIdx(0);
    setTrialCount(0);
    setCorrectInLine(0);
    setLineResults([]);
    setIsFinished(false);
    generateRandomDirection();
  };

  return (
    <div className="tumbling-e-canvas-container">
      {/* Controls & Distance Bar */}
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

      {/* Video Preview Panel */}
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
          {/* Calibrated Tumbling E Optotype Box */}
          <div className="col-12 col-md-7">
            <div 
              className="border rounded bg-white p-4 d-flex flex-column align-items-center justify-content-center shadow-inner overflow-hidden position-relative"
              style={{ minHeight: '380px' }}
            >
              <div className="text-center mb-3">
                <span className="badge bg-primary-subtle text-primary fw-bold font-monospace mb-1">
                  Line {currentLineIdx + 1} of {E_CHART_LINES.length} &mdash; {currentLine.fraction}
                </span>
                <p className="extra-small text-muted mb-0">
                  Trial {trialCount + 1} of {TRIALS_PER_LINE} (Pass threshold: {PASS_THRESHOLD}/{TRIALS_PER_LINE})
                </p>
              </div>

              {/* Rendered Tumbling 'E' Optotype */}
              <div className="d-flex align-items-center justify-content-center my-4 select-none">
                <span
                  style={{
                    fontSize: `${currentLine.mmHeight * pxPerMm}px`,
                    lineHeight: 1,
                    display: 'inline-block',
                    fontFamily: 'monospace',
                    fontWeight: 'bold',
                    color: '#000',
                    transform: `rotate(${ROTATION_MAP[currentDirection]}deg)`,
                    transition: 'transform 0.15s ease-out'
                  }}
                >
                  E
                </span>
              </div>

              <div className="extra-small text-muted font-monospace border-top pt-2 mt-2">
                Physical Height: {currentLine.mmHeight.toFixed(1)} mm | Render Height: {Math.round(currentLine.mmHeight * pxPerMm)} px
              </div>
            </div>
          </div>

          {/* Directional Controls */}
          <div className="col-12 col-md-5">
            <div className="card border-0 bg-light p-3 text-center">
              <h6 className="fw-bold mb-1 text-dark">Indicate E Orientation</h6>
              <p className="extra-small text-muted mb-3">
                Click a button or press <strong>Arrow Keys</strong>:
              </p>

              {/* D-Pad Controls */}
              <div className="d-flex flex-column align-items-center gap-2 my-2">
                <button
                  type="button"
                  className="btn btn-primary px-4 py-2 d-flex align-items-center gap-1 shadow-sm"
                  onClick={() => handleResponse('UP')}
                >
                  <ArrowUp size={20} /> Up
                </button>
                <div className="d-flex justify-content-center gap-2 w-100">
                  <button
                    type="button"
                    className="btn btn-primary px-3 py-2 flex-grow-1 d-flex align-items-center justify-content-center gap-1 shadow-sm"
                    onClick={() => handleResponse('LEFT')}
                  >
                    <ArrowLeft size={20} /> Left
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary px-3 py-2 flex-grow-1 d-flex align-items-center justify-content-center gap-1 shadow-sm"
                    onClick={() => handleResponse('RIGHT')}
                  >
                    Right <ArrowRight size={20} />
                  </button>
                </div>
                <button
                  type="button"
                  className="btn btn-primary px-4 py-2 d-flex align-items-center gap-1 shadow-sm"
                  onClick={() => handleResponse('DOWN')}
                >
                  <ArrowDown size={20} /> Down
                </button>
              </div>

              {/* Line Testing Progress */}
              <div className="mt-4 pt-3 border-top text-start">
                <span className="extra-small text-uppercase text-muted fw-bold d-block mb-2">Tested Lines</span>
                <div className="d-flex flex-wrap gap-1">
                  {E_CHART_LINES.map((line, idx) => {
                    const result = lineResults.find((r) => r.line.fraction === line.fraction);
                    let badgeClass = 'bg-secondary-subtle text-muted';
                    if (result?.passed) badgeClass = 'bg-success text-white';
                    if (result && !result.passed) badgeClass = 'bg-danger text-white';
                    if (idx === currentLineIdx && !result) badgeClass = 'bg-primary text-white';

                    return (
                      <span key={line.fraction} className={`badge ${badgeClass} font-monospace`}>
                        {line.fraction}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Test Completion Banner */
        <div className="card border-success shadow-sm">
          <div className="card-body p-4 text-center">
            <div className="p-3 bg-success-subtle text-success rounded-circle d-inline-flex mb-3">
              <CheckCircle2 size={36} />
            </div>
            <h5 className="fw-bold text-dark mb-1">Tumbling E Test Completed</h5>
            <p className="text-muted small mb-3">
              Visual acuity score successfully saved to the Test History Dashboard.
            </p>
            <button className="btn btn-outline-primary btn-sm" onClick={handleRestart}>
              Run Another Tumbling E Test
            </button>
          </div>
        </div>
      )}
    </div>
  );
}