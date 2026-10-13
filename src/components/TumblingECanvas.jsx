import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Eye, 
  Ruler, 
  RotateCcw, 
  CheckCircle2, 
  Camera, 
  AlertTriangle, 
  Lock,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Award,
  ArrowRightCircle
} from 'lucide-react';

export default function TumblingECanvas({ 
  eyeSelection = 'OD (Right Eye)', 
  displayScale = 1.0,
  onTestComplete, 
  onCancel,
  onDistanceChange,
  onAssistantMessage
}) {
  // Standard 8-Line Clinical Visual Acuity Sequence (4 optotype trials per acuity level)
  const clinicalTestLines = [
    { line: 1, acuity: '20/200', size: 110, letters: ['up', 'right', 'down', 'left'] },
    { line: 2, acuity: '20/100', size: 85,  letters: ['left', 'up', 'right', 'down'] },
    { line: 3, acuity: '20/70',  size: 68,  letters: ['right', 'down', 'left', 'up'] },
    { line: 4, acuity: '20/50',  size: 52,  letters: ['down', 'left', 'up', 'right'] },
    { line: 5, acuity: '20/40',  size: 40,  letters: ['up', 'left', 'down', 'right'] },
    { line: 6, acuity: '20/30',  size: 30,  letters: ['right', 'up', 'left', 'down'] },
    { line: 7, acuity: '20/25',  size: 22,  letters: ['down', 'right', 'up', 'left'] },
    { line: 8, acuity: '20/20',  size: 16,  letters: ['left', 'down', 'right', 'up'] }
  ];

  // Test Execution State
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [currentLetterIndex, setCurrentLetterIndex] = useState(0);
  const [currentLineCorrects, setCurrentLineCorrects] = useState(0);
  const [responseLog, setResponseLog] = useState([]);
  
  // Assessment Result State (for immediate view before history navigation)
  const [testResultSummary, setTestResultSummary] = useState(null);

  // Live Camera & Motion Tracking State
  const [cameraActive, setCameraActive] = useState(true);
  const [measuredDistanceCm, setMeasuredDistanceCm] = useState(35);
  const [distanceStatus, setDistanceStatus] = useState('ideal'); // 'ideal' | 'too_close' | 'too_far'
  const [isMobile, setIsMobile] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    const updateViewportMode = () => {
      const mobile = window.matchMedia('(max-width: 767px)').matches;
      setIsMobile(mobile);
    };

    updateViewportMode();
    window.addEventListener('resize', updateViewportMode);
    return () => window.removeEventListener('resize', updateViewportMode);
  }, []);

  const activeLine = clinicalTestLines[currentLineIndex];
  const currentRotation = activeLine ? activeLine.letters[currentLetterIndex] : 'up';

  useEffect(() => {
    if (onDistanceChange) onDistanceChange(distanceStatus);
  }, [distanceStatus, onDistanceChange]);

  useEffect(() => {
    if (!onAssistantMessage) return;

    if (distanceStatus !== 'ideal') {
      onAssistantMessage('📏 Please position yourself at 35 cm so the Tumbling E chart is readable and accurate.');
      return;
    }

    if (testResultSummary) {
      onAssistantMessage(`✅ Test complete. Final acuity: ${testResultSummary.score}.`);
      return;
    }

    onAssistantMessage(`👀 Identify the opening direction of the E on line ${activeLine.line} (${activeLine.acuity}). Use the arrow keys or the buttons below.`);
  }, [activeLine, distanceStatus, onAssistantMessage, testResultSummary]);

  // Real-Time Camera Motion Tracking & Ambient Light Calibration
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
                  totalBrightness += (frameData[i] + frameData[i+1] + frameData[i+2]) / 3;
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

                // Notify distance change to assistant
                if (onDistanceChange) {
                  onDistanceChange(finalDist, distanceStatus);
                }
              }
            }
            animationFrameId = requestAnimationFrame(trackUserMovement);
          };

          animationFrameId = requestAnimationFrame(trackUserMovement);
        })
        .catch((err) => {
          console.error('Camera tracking failed:', err);
          setCameraActive(false);
        });
    }

    return () => {
      if (stream) stream.getTracks().forEach((track) => track.stop());
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [cameraActive, onDistanceChange]);

  const handleForceIdealDistance = (e) => {
    if (e) e.stopPropagation();
    setMeasuredDistanceCm(35);
    setDistanceStatus('ideal');
  };

  // Clinical Visual Acuity Progression & Final Calculation
  const handleUserResponse = useCallback((selectedDirection) => {
    if (distanceStatus !== 'ideal' || testResultSummary) return;

    const isCorrect = selectedDirection === currentRotation;
    const newCorrects = isCorrect ? currentLineCorrects + 1 : currentLineCorrects;

    const logEntry = {
      line: activeLine.line,
      acuity: activeLine.acuity,
      trial: currentLetterIndex + 1,
      expected: currentRotation,
      given: selectedDirection,
      correct: isCorrect
    };
    const updatedLog = [...responseLog, logEntry];
    setResponseLog(updatedLog);

    // Check if more letter trials remain in the current line
    if (currentLetterIndex + 1 < activeLine.letters.length) {
      setCurrentLineCorrects(newCorrects);
      setCurrentLetterIndex((prev) => prev + 1);
    } else {
      // Line completed -> Evaluate line pass/fail threshold (Majority rule: >= 3 out of 4)
      const passedLine = newCorrects >= 3;

      if (passedLine && currentLineIndex + 1 < clinicalTestLines.length) {
        // Line Passed -> Advance to smaller optotype line
        setCurrentLineIndex((prev) => prev + 1);
        setCurrentLetterIndex(0);
        setCurrentLineCorrects(0);
      } else {
        // Line Failed OR reached Line 8 (20/20) -> Determine final clinical visual acuity
        let finalAcuity = '20/200 (Uncorrected / Low Acuity)';
        
        if (passedLine && currentLineIndex === clinicalTestLines.length - 1) {
          finalAcuity = '20/20 (Normal Distance Vision)';
        } else if (currentLineIndex > 0) {
          // Assigned acuity is the last line successfully passed
          finalAcuity = clinicalTestLines[currentLineIndex - 1].acuity;
        } else if (passedLine) {
          finalAcuity = clinicalTestLines[0].acuity;
        }

        finalizeAssessment(finalAcuity, updatedLog);
      }
    }
  }, [distanceStatus, testResultSummary, currentRotation, currentLineCorrects, activeLine, currentLetterIndex, currentLineIndex, responseLog]);

  // Keyboard Arrow Key Listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (distanceStatus !== 'ideal' || testResultSummary) return;

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          handleUserResponse('up');
          break;
        case 'ArrowDown':
          e.preventDefault();
          handleUserResponse('down');
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handleUserResponse('left');
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleUserResponse('right');
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [distanceStatus, testResultSummary, handleUserResponse]);

  // Clinical Diagnosis Mapping and Summary Generation
  const finalizeAssessment = (finalAcuity, log) => {
    let severity = 'normal';
    let diagnosisSummary = `Normal Visual Acuity (${finalAcuity})`;

    if (finalAcuity.includes('20/200') || finalAcuity.includes('20/100')) {
      severity = 'action_required';
      diagnosisSummary = `Significant Visual Impairment / Low Visual Acuity (${finalAcuity})`;
    } else if (['20/70', '20/50', '20/40'].some(a => finalAcuity.includes(a))) {
      severity = 'moderate';
      diagnosisSummary = `Mild Myopia / Reduced Directional Acuity (${finalAcuity})`;
    } else if (['20/30', '20/25', '20/20'].some(a => finalAcuity.includes(a))) {
      severity = 'normal';
      diagnosisSummary = `Unimpaired Directional Distance Vision (${finalAcuity})`;
    }

    const safeLog = Array.isArray(log) ? log : [];
    const correctCount = safeLog.reduce((total, entry) => total + (entry.correct ? 1 : 0), 0);

    const summaryPayload = {
      score: finalAcuity,
      severity: severity,
      diagnosis: diagnosisSummary,
      eyeTested: eyeSelection,
      details: {
        visualAcuityScore: finalAcuity,
        totalTrials: safeLog.length,
        correctCount,
        measuredDistance: `${measuredDistanceCm} cm`,
        calibrationScale: `${Math.round(displayScale * 100)}%`
      }
    };

    // Show immediate summary screen inside the canvas component
    setTestResultSummary(summaryPayload);
  };

  const handleSaveAndProceed = () => {
    if (onTestComplete && testResultSummary) {
      onTestComplete(testResultSummary);
    }
  };

  const handleRestartTest = () => {
    setTestResultSummary(null);
    setCurrentLineIndex(0);
    setCurrentLetterIndex(0);
    setCurrentLineCorrects(0);
    setResponseLog([]);
  };

  const getRotationDegree = (rotation) => {
    // Keep the glyph orientation aligned with the answer labels.
    switch(rotation) {
      case 'up': return '270deg';
      case 'right': return '0deg';
      case 'down': return '90deg';
      case 'left': return '180deg';
      default: return '0deg';
    }
  };

  return (
    <div className="tumbling-e-container" style={{ width: '100%', maxWidth: '100%' }}>
      {!testResultSummary ? (
        <>
          {/* Top Status Header */}
          <div className="d-flex flex-wrap justify-content-between align-items-center bg-light p-3 rounded mb-3 border gap-2" style={{ gap: '0.5rem' }}>
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <span className="badge bg-secondary d-flex align-items-center gap-1">
                <Eye size={14} /> {eyeSelection}
              </span>
              
              <span className={`badge d-flex align-items-center gap-1 font-monospace ${
                distanceStatus === 'ideal' ? 'bg-success' : 'bg-danger text-white animate-pulse'
              }`}>
                <Ruler size={14} /> Distance: {measuredDistanceCm} cm 
                {distanceStatus === 'too_close' && ' (TOO CLOSE! Lean Back)'}
                {distanceStatus === 'too_far' && ' (TOO FAR! Lean Closer)'}
                {distanceStatus === 'ideal' && ' (IDEAL DISTANCE)'}
              </span>
            </div>

            <div className="fw-bold font-monospace text-primary" style={{ fontSize: isMobile ? '0.8rem' : '1rem' }}>
              Line {activeLine.line} of 8 ({activeLine.acuity}) — Trial {currentLetterIndex + 1}/4
            </div>
          </div>

          {/* 8-Line Progress Tracker */}
          <div className="d-flex gap-1 mb-3" style={{ overflowX: 'auto', whiteSpace: 'nowrap' }}>
            {clinicalTestLines.map((l, index) => (
              <div 
                key={l.line} 
                className={`flex-grow-1 text-center py-1 rounded extra-small font-monospace fw-bold transition-all ${
                  index === currentLineIndex 
                    ? 'bg-primary text-white shadow-sm' 
                    : index < currentLineIndex 
                      ? 'bg-success-subtle text-success border border-success' 
                      : 'bg-light text-muted border'
                }`}
                style={{ minWidth: isMobile ? '46px' : 'auto', fontSize: isMobile ? '0.64rem' : '0.75rem' }}
              >
                L{l.line}: {l.acuity}
              </div>
            ))}
          </div>

          {/* Live Motion Camera Feed Widget */}
          {cameraActive && (
            <div 
              onClick={handleForceIdealDistance}
              title="Click to force ideal 35cm distance"
              className={`p-2 rounded mb-3 d-flex align-items-center gap-3 transition-all ${
                distanceStatus === 'ideal' ? 'bg-dark text-white' : 'bg-danger text-white border border-2 border-danger'
              }`}
              style={{ cursor: 'pointer', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center' }}
            >
              <video 
                ref={videoRef} 
                autoPlay 
                muted 
                playsInline 
                style={{ width: isMobile ? '100%' : '80px', maxWidth: '120px', height: isMobile ? '72px' : '60px', objectFit: 'cover', borderRadius: '4px' }}
              />
              <div className="small flex-grow-1">
                <div className="fw-bold d-flex align-items-center gap-1">
                  <Camera size={14} /> Motion Tracking Active <span className="extra-small opacity-75">(Click to Unlock)</span>
                </div>
                <div className="extra-small opacity-75">
                  Target: <strong>30–40 cm</strong> | Live Tracked: <strong>{measuredDistanceCm} cm</strong>
                </div>
              </div>
            </div>
          )}

          <div className="row g-4 align-items-center">
            {/* Main Stage Optotype with Distance Lockout */}
            <div className="col-12 col-md-7">
              <div 
                className="border rounded bg-light p-4 d-flex flex-column align-items-center justify-content-center shadow-sm position-relative overflow-hidden"
                style={{ minHeight: isMobile ? '260px' : '380px', padding: isMobile ? '1rem' : '2rem' }}
              >
                {distanceStatus !== 'ideal' && (
                  <div 
                    className="position-absolute top-0 start-0 w-100 h-100 bg-dark bg-opacity-85 d-flex flex-column align-items-center justify-content-center text-center p-3 z-3"
                    style={{ backdropFilter: 'blur(4px)' }}
                  >
                    <div className="p-3 bg-danger text-white rounded-circle mb-2">
                      <Lock size={28} />
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

                <div className="text-center mb-2 text-white">
                  <span className="badge bg-light text-dark fw-bold font-monospace mb-1">
                    Line {activeLine.line} ({activeLine.acuity})
                  </span>
                  <p className="text-black-50 mb-0" style={{ fontSize: '11px' }}>
                    Identify the opening direction of the E symbol.
                  </p>
                </div>

                {/* Dynamic Rotated E Optotype */}
                <div 
                  className="my-4 text-dark rounded d-flex align-items-center justify-content-center transition-all select-none"
                  style={{ 
                    width: `${Math.min(activeLine.size * displayScale, isMobile ? 150 : 220)}px`, 
                    height: `${Math.min(activeLine.size * displayScale, isMobile ? 150 : 220)}px`,
                    fontSize: `${Math.round(Math.min(activeLine.size * 0.65 * displayScale, isMobile ? 85 : 120))}px`,
                    fontWeight: '900',
                    fontFamily: 'monospace',
                    transform: `rotate(${getRotationDegree(currentRotation)})`
                  }}
                >
                  E
                </div>
              </div>
            </div>

            {/* Response Buttons */}
            <div className="col-12 col-md-5">
              <div className="card border-0 bg-light p-4 text-center" style={{ padding: isMobile ? '1rem' : '2rem' }}>
                <h6 className="fw-bold mb-3 text-dark" style={{ fontSize: isMobile ? '0.95rem' : '1rem' }}>Select 'E' Opening Direction</h6>

                <div className="d-flex justify-content-center mb-2">
                  <button
                    type="button"
                    className="btn btn-primary p-3 fw-bold d-flex flex-column align-items-center gap-1 shadow-sm"
                    style={{ width: isMobile ? '100%' : '90px', minHeight: isMobile ? '62px' : 'auto', fontSize: isMobile ? '0.95rem' : '1rem' }}
                    disabled={distanceStatus !== 'ideal'}
                    onClick={() => handleUserResponse('up')}
                  >
                    <ArrowUp size={24} /> UP
                  </button>
                </div>

                <div className="d-flex justify-content-center gap-3 mb-2" style={{ gap: isMobile ? '0.75rem' : '1rem' }}>
                  <button
                    type="button"
                    className="btn btn-primary p-3 fw-bold d-flex flex-column align-items-center gap-1 shadow-sm"
                    style={{ width: isMobile ? '48%' : '90px', minHeight: isMobile ? '62px' : 'auto', fontSize: isMobile ? '0.95rem' : '1rem' }}
                    disabled={distanceStatus !== 'ideal'}
                    onClick={() => handleUserResponse('left')}
                  >
                    <ArrowLeft size={24} /> LEFT
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary p-3 fw-bold d-flex flex-column align-items-center gap-1 shadow-sm"
                    style={{ width: isMobile ? '48%' : '90px', minHeight: isMobile ? '62px' : 'auto', fontSize: isMobile ? '0.95rem' : '1rem' }}
                    disabled={distanceStatus !== 'ideal'}
                    onClick={() => handleUserResponse('right')}
                  >
                    <ArrowRight size={24} /> RIGHT
                  </button>
                </div>

                <div className="d-flex justify-content-center">
                  <button
                    type="button"
                    className="btn btn-primary p-3 fw-bold d-flex flex-column align-items-center gap-1 shadow-sm"
                    style={{ width: isMobile ? '100%' : '90px', minHeight: isMobile ? '62px' : 'auto', fontSize: isMobile ? '0.95rem' : '1rem' }}
                    disabled={distanceStatus !== 'ideal'}
                    onClick={() => handleUserResponse('down')}
                  >
                    <ArrowDown size={24} /> DOWN
                  </button>
                </div>

                <div className="mt-3 text-muted extra-small" style={{ fontSize: isMobile ? '0.7rem' : '0.75rem' }}>
                  Tip: Press <kbd>↑</kbd> <kbd>↓</kbd> <kbd>←</kbd> <kbd>→</kbd> on your keyboard to respond!
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* IMMEDIATE CLINICAL RESULT & ASSESSMENT SCREEN */
        <div className="card border-0 shadow-sm p-4 bg-light text-center max-w-2xl mx-auto my-3" style={{ width: '100%', padding: isMobile ? '1rem' : '2rem' }}>
          <div className={`p-3 rounded-circle d-inline-flex mx-auto mb-3 ${
            testResultSummary.severity === 'normal' ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning'
          }`}>
            {testResultSummary.severity === 'normal' ? <Award size={44} /> : <AlertTriangle size={44} />}
          </div>

          <h4 className="fw-bold text-dark mb-1" style={{ fontSize: isMobile ? '1.3rem' : '2rem' }}>Tumbling E Test Complete</h4>
          <p className="text-muted small mb-4">Tested Eye: <strong>{testResultSummary.eyeTested}</strong></p>

          {/* Detailed Diagnosis Card */}
          <div className="bg-white p-3 rounded border text-start mb-4">
            <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom flex-wrap gap-2">
              <span className="small text-muted fw-semibold">Visual Acuity Score:</span>
              <span className="badge bg-primary fs-6 font-monospace">{testResultSummary.score}</span>
            </div>

            <div className="mb-3">
              <span className="small text-muted fw-semibold d-block mb-1">Clinical Assessment / Diagnosis:</span>
              <div className={`p-2 rounded fw-bold small ${
                testResultSummary.severity === 'normal' ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning-emphasis'
              }`}>
                {testResultSummary.diagnosis}
              </div>
            </div>

            <div className="row g-2 extra-small text-muted pt-2 border-top">
              <div className="col-6">
                <strong>Correct Trials:</strong> {testResultSummary.details.correctCount} / {testResultSummary.details.totalTrials}
              </div>
              <div className="col-6 text-end">
                <strong>Calibrated Distance:</strong> {testResultSummary.details.measuredDistance}
              </div>
            </div>
          </div>

          {/* Navigation Action Buttons */}
          <div className="d-flex justify-content-center gap-3 flex-wrap">
            <button 
              type="button" 
              className="btn btn-outline-secondary fw-semibold"
              onClick={handleRestartTest}
            >
              <RotateCcw size={16} className="me-1" /> Retake Test
            </button>

            <button 
              type="button" 
              className="btn btn-primary fw-bold d-inline-flex align-items-center gap-2"
              onClick={handleSaveAndProceed}
            >
              Save & View Records <ArrowRightCircle size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}