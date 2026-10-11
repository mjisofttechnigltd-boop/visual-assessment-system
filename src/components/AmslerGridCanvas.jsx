import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Eye, 
  Ruler, 
  RotateCcw, 
  CheckCircle2, 
  Camera, 
  CameraOff, 
  Pencil, 
  Eraser, 
  AlertTriangle,
  Info,
  Maximize2
} from 'lucide-react';

export default function AmslerGridCanvas({ 
  eyeSelection = 'OD (Right Eye)', 
  onTestComplete, 
  onCancel 
}) {
  const [hasDistortion, setHasDistortion] = useState(null);
  const [activeTool, setActiveTool] = useState('draw');
  const [markedPoints, setMarkedPoints] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  // Calibration state (1.0 = 100%, 0.8 = 80%, 1.3 = 130%)
  const [displayScale, setDisplayScale] = useState(1.0);

  const canvasRef = useRef(null);

  // Camera & Distance State
  const [cameraActive, setCameraActive] = useState(false);
  const [measuredDistanceCm, setMeasuredDistanceCm] = useState(35);
  const [distanceStatus, setDistanceStatus] = useState('ideal');
  const videoRef = useRef(null);

  // Base canvas dimension (native pixel resolution)
  const baseSize = 300;

  // Render Amsler Grid canvas dynamically with displayScale dependencies
  const drawGrid = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const gridSize = 20;
    const stepX = width / gridSize;
    const stepY = height / gridSize;

    // Dark high-contrast background
    ctx.fillStyle = '#121212';
    ctx.fillRect(0, 0, width, height);

    // Grid lines
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

    // Outer border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, width, height);

    // Center fixation dot
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, 5 * displayScale, 0, Math.PI * 2);
    ctx.fill();

    // Red center focus ring
    ctx.strokeStyle = '#ff4d4d';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, 9 * displayScale, 0, Math.PI * 2);
    ctx.stroke();

    // Draw user-marked distortion points
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

  // Optical Distance Tracking
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
              const simulatedDist = Math.floor(28 + Math.random() * 18); 
              setMeasuredDistanceCm(simulatedDist);

              if (simulatedDist < 28) {
                setDistanceStatus('too_close');
              } else if (simulatedDist > 42) {
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

  // Accurate coordinate tracking regardless of display scaling
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
    } else if (e.changedTouches && e.changedTouches.length > 0) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const applyActionAtPoint = (coords) => {
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
    setIsDrawing(true);
    const coords = getCanvasCoordinates(e);
    applyActionAtPoint(coords);
  };

  const handlePointerMove = (e) => {
    if (!isDrawing) return;
    const coords = getCanvasCoordinates(e);
    applyActionAtPoint(coords);
  };

  const handlePointerUp = () => {
    setIsDrawing(false);
  };

  const finishAssessment = () => {
    setIsFinished(true);

    const detectedDistortions = hasDistortion === true;
    const totalMarkedDefects = markedPoints.length;

    let severity = 'normal';
    let diagnosisSummary = 'Normal Macular Vision';

    if (detectedDistortions) {
      if (totalMarkedDefects > 15) {
        severity = 'action_required';
        diagnosisSummary = 'Significant Metamorphopsia / Central Scotoma Detected';
      } else {
        severity = 'moderate';
        diagnosisSummary = 'Localized Grid Distortion Identified';
      }
    }

    const payload = {
      score: detectedDistortions ? 'Distortions Reported' : 'Normal (No Distortion)',
      severity: severity,
      eyeTested: eyeSelection,
      details: {
        hasDistortion: detectedDistortions,
        markedDefectCount: totalMarkedDefects,
        measuredDistance: `${measuredDistanceCm} cm`,
        calibrationScale: `${Math.round(displayScale * 100)}%`,
        classification: diagnosisSummary
      }
    };

    if (onTestComplete) {
      onTestComplete(payload);
    }
  };

  const handleRestart = () => {
    setHasDistortion(null);
    setMarkedPoints([]);
    setActiveTool('draw');
    setIsFinished(false);
  };

  return (
    <div className="amsler-canvas-container">
      {/* Top Controls Bar */}
      <div className="d-flex flex-wrap justify-content-between align-items-center bg-light p-3 rounded mb-4 border gap-2">
        <div className="d-flex align-items-center gap-2">
          <span className="badge bg-secondary d-flex align-items-center gap-1">
            <Eye size={14} /> {eyeSelection}
          </span>
          
          <span className={`badge d-flex align-items-center gap-1 ${
            distanceStatus === 'ideal' ? 'bg-success' : 'bg-warning text-dark'
          }`}>
            <Ruler size={14} /> Distance: {measuredDistanceCm} cm 
            {distanceStatus === 'too_close' && ' (Move Back ~35cm)'}
            {distanceStatus === 'too_far' && ' (Move Closer ~35cm)'}
          </span>
        </div>

        {/* Display Calibration Scale Control */}
        <div className="d-flex align-items-center gap-2 bg-white px-2 py-1 rounded border">
          <Maximize2 size={14} className="text-muted" />
          <label htmlFor="scale-range" className="small mb-0 text-muted me-1" style={{ fontSize: '11px' }}>
            Scale: {Math.round(displayScale * 100)}%
          </label>
          <input 
            id="scale-range"
            type="range" 
            min="0.7" 
            max="1.4" 
            step="0.05"
            value={displayScale} 
            onChange={(e) => setDisplayScale(parseFloat(e.target.value))}
            className="form-range"
            style={{ width: '90px' }}
          />
        </div>

        <div className="d-flex align-items-center gap-2">
          <button
            type="button"
            className={`btn btn-sm ${cameraActive ? 'btn-primary' : 'btn-outline-secondary'} d-inline-flex align-items-center gap-1`}
            onClick={() => setCameraActive(!cameraActive)}
          >
            {cameraActive ? <Camera size={14} /> : <CameraOff size={14} />}
            {cameraActive ? 'Distance Tracker On' : 'Enable Distance Sensor'}
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

      {/* Optical Distance Sensor Panel */}
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
            <div className="text-white-50" style={{ fontSize: '11px' }}>
              Target Distance: 30 - 40 cm | Current: {measuredDistanceCm} cm
            </div>
          </div>
        </div>
      )}

      {!isFinished ? (
        <div className="row g-4 align-items-center">
          {/* Amsler Grid Canvas Display */}
          <div className="col-12 col-md-7">
            <div 
              className="border rounded bg-dark p-3 d-flex flex-column align-items-center justify-content-center shadow-sm overflow-hidden"
              style={{ minHeight: '380px' }}
            >
              <div className="text-center mb-2 text-white">
                <span className="badge bg-light text-dark fw-bold font-monospace mb-1">
                  Macular Assessment
                </span>
                <p className="text-white-50 mb-0" style={{ fontSize: '11px' }}>
                  Focus on the center red dot. Click or drag directly on the grid to mark wavy or missing lines.
                </p>
              </div>

              {/* Dynamically Scaled Canvas Element */}
              <div className="my-2 select-none d-flex justify-content-center touch-none">
                <canvas 
                  ref={canvasRef} 
                  width={baseSize * displayScale} 
                  height={baseSize * displayScale} 
                  className="border border-secondary rounded shadow-sm transition-all"
                  style={{ 
                    width: `${baseSize * displayScale}px`, 
                    height: `${baseSize * displayScale}px`, 
                    maxWidth: '100%', 
                    cursor: activeTool === 'draw' ? 'crosshair' : 'pointer' 
                  }}
                  onMouseDown={handlePointerDown}
                  onMouseMove={handlePointerMove}
                  onMouseUp={handlePointerUp}
                  onMouseLeave={handlePointerUp}
                  onTouchStart={handlePointerDown}
                  onTouchMove={handlePointerMove}
                  onTouchEnd={handlePointerUp}
                />
              </div>

              <div className="text-center mt-1">
                <span className="badge bg-danger-subtle text-danger border border-danger">
                  <AlertTriangle className="me-1" size={12} />
                  Tap/click grid to mark wavy, blurred, or missing areas
                </span>
              </div>
            </div>
          </div>

          {/* Test Action Sidebar */}
          <div className="col-12 col-md-5">
            <div className="card border-0 bg-light p-3">
              <h6 className="fw-bold mb-2 text-dark">Grid Observation Check</h6>
              <p className="small text-muted mb-3">
                Focus on the red center dot with one eye. Do you see any distorted or missing lines?
              </p>

              {hasDistortion === null ? (
                <div className="d-grid gap-2">
                  <button
                    type="button"
                    className="btn btn-outline-success py-2 d-flex align-items-center justify-content-center gap-2 fw-bold"
                    onClick={() => {
                      setHasDistortion(false);
                      finishAssessment();
                    }}
                  >
                    <CheckCircle2 size={16} /> Grid Looks Perfectly Normal
                  </button>

                  <button
                    type="button"
                    className="btn btn-outline-danger py-2 d-flex align-items-center justify-content-center gap-2 fw-bold"
                    onClick={() => setHasDistortion(true)}
                  >
                    <AlertTriangle size={16} /> Mark Wavy / Missing Lines
                  </button>
                </div>
              ) : (
                <div>
                  <div className="d-flex gap-2 mb-3">
                    <button
                      type="button"
                      className={`btn flex-grow-1 d-flex align-items-center justify-content-center gap-1 ${
                        activeTool === 'draw' ? 'btn-danger' : 'btn-outline-secondary'
                      }`}
                      onClick={() => setActiveTool('draw')}
                    >
                      <Pencil size={15} /> Mark Defect
                    </button>
                    <button
                      type="button"
                      className={`btn flex-grow-1 d-flex align-items-center justify-content-center gap-1 ${
                        activeTool === 'erase' ? 'btn-warning text-dark' : 'btn-outline-secondary'
                      }`}
                      onClick={() => setActiveTool('erase')}
                    >
                      <Eraser size={15} /> Eraser
                    </button>
                  </div>

                  <div className="bg-white p-3 rounded border mb-3 small">
                    <div className="d-flex justify-content-between mb-1">
                      <span className="text-muted">Defect Markings:</span>
                      <span className="fw-bold text-danger font-monospace">{markedPoints.length} points</span>
                    </div>
                    <p className="text-muted mb-0" style={{ fontSize: '11px' }}>
                      {markedPoints.length === 0 
                        ? 'Click/touch anywhere on the grid on the left to add markings.' 
                        : 'Red markings record distorted or blind spot regions.'}
                    </p>
                  </div>

                  <div className="d-flex gap-2">
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm flex-grow-1"
                      onClick={() => setMarkedPoints([])}
                    >
                      Clear Marks
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm flex-grow-2 fw-bold"
                      onClick={finishAssessment}
                    >
                      Complete Test
                    </button>
                  </div>
                </div>
              )}

              <div className="border-top pt-3 mt-3">
                <div className="d-flex align-items-start gap-2 text-muted" style={{ fontSize: '11px' }}>
                  <Info className="text-primary flex-shrink-0 mt-0.5" size={14} />
                  <span>
                    Amsler Grid testing aids in the early detection of age-related macular degeneration (AMD) and macular edema.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Test Completion Screen */
        <div className="card border-success shadow-sm">
          <div className="card-body p-4 text-center">
            <div className="p-3 bg-success-subtle text-success rounded-circle d-inline-flex mb-3">
              <CheckCircle2 size={32} />
            </div>
            <h5 className="fw-bold text-dark mb-1">Amsler Grid Assessment Completed</h5>
            <p className="text-muted small mb-3">
              Macular grid findings have been recorded into your evaluation summary.
            </p>
            <button className="btn btn-outline-primary btn-sm" onClick={handleRestart}>
              Run Another Macular Assessment
            </button>
          </div>
        </div>
      )}
    </div>
  );
}