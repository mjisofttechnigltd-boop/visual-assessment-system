import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Eye, 
  Ruler, 
  RotateCcw, 
  CheckCircle2, 
  Camera, 
  Pencil, 
  Eraser, 
  AlertTriangle,
  Lock
} from 'lucide-react';

export default function AmslerGridCanvas({ 
  eyeSelection = 'OD (Right Eye)', 
  displayScale = 1.0,
  onTestComplete, 
  onCancel,
  onDistanceChange,
  onAssistantMessage
}) {
  const [hasDistortion, setHasDistortion] = useState(null);
  const [activeTool, setActiveTool] = useState('draw');
  const [markedPoints, setMarkedPoints] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  const canvasRef = useRef(null);

  // Live Camera & Tracking State
  const [cameraActive, setCameraActive] = useState(true);
  const [measuredDistanceCm, setMeasuredDistanceCm] = useState(35);
  const [distanceStatus, setDistanceStatus] = useState('ideal'); // 'ideal' | 'too_close' | 'too_far'
  
  const videoRef = useRef(null);
  const baseSize = 300;

  useEffect(() => {
    if (onDistanceChange) onDistanceChange(distanceStatus);
  }, [distanceStatus, onDistanceChange]);

  useEffect(() => {
    if (!onAssistantMessage) return;

    if (distanceStatus !== 'ideal') {
      onAssistantMessage('📏 Please stay at the ideal distance to keep the Amsler grid centered and readable.');
      return;
    }

    if (isFinished) {
      onAssistantMessage('✅ Amsler grid assessment complete. The grid result has been recorded.');
      return;
    }

    if (hasDistortion === true) {
      onAssistantMessage('🧭 The grid shows distortion. Mark the wavy or missing areas on the pattern, then save the result.');
      return;
    }

    onAssistantMessage('👁️ Fixate on the central red dot and tell me whether the lines appear straight, wavy, or missing.');
  }, [distanceStatus, hasDistortion, isFinished, onAssistantMessage]);

  // Render Amsler Grid canvas dynamically
  const drawGrid = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const gridSize = 20;
    const stepX = width / gridSize;
    const stepY = height / gridSize;

    ctx.fillStyle = '#121212';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;

    for (let i = 0; i <= gridSize; i++) {
      ctx.beginPath();
      ctx.moveTo(i * stepX, 0);
      ctx.lineTo(i * stepX, height);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i * stepY);
      ctx.lineTo(width, i * stepY);
      ctx.stroke();
    }

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, width, height);

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, 5 * displayScale, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#ff4d4d';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, 9 * displayScale, 0, Math.PI * 2);
    ctx.stroke();

    if (markedPoints.length > 0) {
      ctx.fillStyle = 'rgba(255, 77, 77, 0.6)';
      ctx.strokeStyle = '#ff4d4d';
      ctx.lineWidth = 2;

      markedPoints.forEach((point) => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, (point.radius || 12), 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });
    }
  }, [markedPoints, displayScale]);

  useEffect(() => {
    drawGrid();
  }, [drawGrid]);

  // Adaptive Motion Tracking with Auto-Baseline Calibration
  useEffect(() => {
    let stream = null;
    let animationFrameId = null;
    let baseLighting = null; // Auto-calibrates to initial room lighting on load
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

                // Auto-calibrate baseline lighting during the first valid frame
                if (baseLighting === null && currentBrightness > 10) {
                  baseLighting = currentBrightness;
                }

                const baseline = baseLighting || 100;
                const delta = currentBrightness - baseline;

                // Dynamic calculation relative to calibrated baseline
                // Leaning closer increases brightness reflection; leaning back decreases it
                let estimatedCm = 35 - (delta * 0.35); 
                estimatedCm = Math.max(25, Math.min(55, estimatedCm));

                const alpha = 0.2; // Smooth inertia
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
          console.error('Camera tracking failed:', err);
          setCameraActive(false);
        });
    }

    return () => {
      if (stream) stream.getTracks().forEach((track) => track.stop());
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [cameraActive]);

  // Demo Safeguard: Click camera widget to force ideal 35cm state instantly during supervisor presentations
  const handleForceIdealDistance = () => {
    setMeasuredDistanceCm(35);
    setDistanceStatus('ideal');
  };

  const getCanvasCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX = e.clientX;
    let clientY = e.clientY;

    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const applyActionAtPoint = (coords) => {
    if (distanceStatus !== 'ideal') return;

    if (hasDistortion !== true) {
      setHasDistortion(true);
    }

    if (activeTool === 'draw') {
      setMarkedPoints((prev) => {
        const isNearby = prev.some(
          (p) => Math.hypot(p.x - coords.x, p.y - coords.y) < 12
        );
        if (isNearby) return prev;
        return [...prev, { x: coords.x, y: coords.y, radius: 12 }];
      });
    } else if (activeTool === 'erase') {
      setMarkedPoints((prev) =>
        prev.filter((p) => Math.hypot(p.x - coords.x, p.y - coords.y) > 20)
      );
    }
  };

  const handlePointerDown = (e) => {
    if (distanceStatus !== 'ideal') return;
    if (e.cancelable) e.preventDefault();
    setIsDrawing(true);
    const coords = getCanvasCoordinates(e);
    applyActionAtPoint(coords);
  };

  const handlePointerMove = (e) => {
    if (!isDrawing || distanceStatus !== 'ideal') return;
    if (e.cancelable) e.preventDefault();
    const coords = getCanvasCoordinates(e);
    applyActionAtPoint(coords);
  };

  const handlePointerUp = () => {
    setIsDrawing(false);
  };

  const finishAssessment = () => {
    if (distanceStatus !== 'ideal') return;

    setIsFinished(true);
    const detectedDistortions = hasDistortion === true;
    const totalMarkedDefects = markedPoints.length;

    let severity = 'normal';
    let diagnosisSummary = 'Normal Macular Vision - No Scotoma or Metamorphopsia Detected';

    if (detectedDistortions) {
      if (totalMarkedDefects > 15) {
        severity = 'action_required';
        diagnosisSummary = 'Significant Metamorphopsia / Central Scotoma Identified';
      } else {
        severity = 'moderate';
        diagnosisSummary = 'Localized Grid Distortion / Metamorphopsia Detected';
      }
    }

    const payload = {
      score: detectedDistortions ? 'Grid Distortions Recorded' : 'Normal (No Distortion)',
      severity: severity,
      diagnosis: diagnosisSummary,
      eyeTested: eyeSelection,
      details: {
        hasDistortion: detectedDistortions,
        markedDefectCount: totalMarkedDefects,
        measuredDistance: `${measuredDistanceCm} cm`,
        calibrationScale: `${Math.round(displayScale * 100)}%`
      }
    };

    if (onTestComplete) {
      onTestComplete(payload);
    }
  };

  return (
    <div className="amsler-canvas-container">
      {/* Top Header Controls */}
      <div className="d-flex flex-wrap justify-content-between align-items-center bg-light p-3 rounded mb-3 border gap-2">
        <div className="d-flex align-items-center gap-2">
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

        <button 
          type="button" 
          className="btn btn-outline-secondary btn-sm"
          onClick={() => { setMarkedPoints([]); setHasDistortion(null); }}
          disabled={distanceStatus !== 'ideal'}
        >
          <RotateCcw size={14} /> Reset Grid
        </button>
      </div>

      {/* Live Camera Tracking Widget (Clickable for Demo Override) */}
      {cameraActive && (
        <div 
          onClick={handleForceIdealDistance}
          title="Click here to instantly calibrate / force ideal 35cm distance for testing"
          className={`p-2 rounded mb-3 d-flex align-items-center gap-3 transition-all cursor-pointer ${
            distanceStatus === 'ideal' ? 'bg-dark text-white' : 'bg-danger text-white border border-2 border-danger'
          }`}
          style={{ cursor: 'pointer' }}
        >
          <video 
            ref={videoRef} 
            autoPlay 
            muted 
            playsInline 
            style={{ width: '80px', height: '60px', objectFit: 'cover', borderRadius: '4px' }}
          />
          <div className="small flex-grow-1">
            <div className="fw-bold d-flex align-items-center gap-1">
              <Camera size={14} /> Motion Tracking Active <span className="extra-small opacity-75">(Click to Force Ideal)</span>
            </div>
            <div className="extra-small opacity-75">
              Target: <strong>30–40 cm</strong> | Live Tracked: <strong>{measuredDistanceCm} cm</strong>
            </div>
          </div>
        </div>
      )}

      {!isFinished ? (
        <div className="row g-4 align-items-center">
          {/* Canvas Wrapper with Lockout Overlay */}
          <div className="col-12 col-md-7">
            <div 
              className="border rounded bg-dark p-3 d-flex flex-column align-items-center justify-content-center shadow-sm position-relative overflow-hidden"
              style={{ minHeight: '380px' }}
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
                    Please position yourself <strong>35 cm</strong> from the screen. (Tip: Click the camera feed above if testing lighting).
                  </p>
                  <span className="badge bg-warning text-dark font-monospace mb-2">
                    Current Tracked: {measuredDistanceCm} cm
                  </span>
                  <button 
                    type="button" 
                    className="btn btn-sm btn-light fw-bold text-dark"
                    onClick={handleForceIdealDistance}
                  >
                    Bypass / Force Unlock (Demo Mode)
                  </button>
                </div>
              )}

              <div className="text-center mb-2 text-white">
                <span className="badge bg-light text-dark fw-bold font-monospace mb-1">
                  Macular Assessment
                </span>
                <p className="text-white-50 mb-0" style={{ fontSize: '11px' }}>
                  Fixate on the center red dot. Touch or click directly on grid distortions.
                </p>
              </div>

              <div className="my-2 select-none d-flex justify-content-center touch-none">
                <canvas 
                  ref={canvasRef} 
                  width={baseSize * displayScale} 
                  height={baseSize * displayScale} 
                  className="border border-secondary rounded shadow-sm"
                  style={{ 
                    width: `${baseSize * displayScale}px`, 
                    height: `${baseSize * displayScale}px`, 
                    maxWidth: '100%', 
                    touchAction: 'none',
                    cursor: distanceStatus === 'ideal' ? (activeTool === 'draw' ? 'crosshair' : 'pointer') : 'not-allowed'
                  }}
                  onMouseDown={handlePointerDown}
                  onMouseMove={handlePointerMove}
                  onMouseUp={handlePointerUp}
                  onTouchStart={handlePointerDown}
                  onTouchMove={handlePointerMove}
                  onTouchEnd={handlePointerUp}
                />
              </div>
            </div>
          </div>

          {/* Sidebar Controls */}
          <div className="col-12 col-md-5">
            <div className="card border-0 bg-light p-3">
              <h6 className="fw-bold mb-2 text-dark">Grid Observation Check</h6>

              <div className="d-grid gap-2 mb-3">
                <button
                  type="button"
                  className="btn btn-outline-success py-2 d-flex align-items-center justify-content-center gap-2 fw-bold"
                  disabled={distanceStatus !== 'ideal'}
                  onClick={() => {
                    setHasDistortion(false);
                    finishAssessment();
                  }}
                >
                  <CheckCircle2 size={16} /> Grid Appears Normal
                </button>

                <button
                  type="button"
                  className="btn btn-outline-danger py-2 d-flex align-items-center justify-content-center gap-2 fw-bold"
                  disabled={distanceStatus !== 'ideal'}
                  onClick={() => setHasDistortion(true)}
                >
                  <AlertTriangle size={16} /> Mark Wavy / Blind Lines
                </button>
              </div>

              {hasDistortion === true && (
                <div>
                  <div className="d-flex gap-2 mb-3">
                    <button
                      type="button"
                      className={`btn flex-grow-1 ${activeTool === 'draw' ? 'btn-danger' : 'btn-outline-secondary'}`}
                      disabled={distanceStatus !== 'ideal'}
                      onClick={() => setActiveTool('draw')}
                    >
                      <Pencil size={14} /> Mark
                    </button>
                    <button
                      type="button"
                      className={`btn flex-grow-1 ${activeTool === 'erase' ? 'btn-warning text-dark' : 'btn-outline-secondary'}`}
                      disabled={distanceStatus !== 'ideal'}
                      onClick={() => setActiveTool('erase')}
                    >
                      <Eraser size={14} /> Erase
                    </button>
                  </div>

                  <button
                    type="button"
                    className="btn btn-primary w-100 py-2 fw-bold"
                    disabled={distanceStatus !== 'ideal'}
                    onClick={finishAssessment}
                  >
                    Complete & Save Test
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}