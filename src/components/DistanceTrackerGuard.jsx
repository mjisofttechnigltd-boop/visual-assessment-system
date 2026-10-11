import React from 'react';
import { useDistance } from '../hooks/useDistance';
import { AlertCircle } from 'lucide-react';

export default function DistanceTrackerGuard({ children, targetDistanceMm = 1000 }) {
  const { distanceMm, isFaceDetected, videoRef, isLoading, error } = useDistance({ enabled: true });

  return (
    <div className="d-flex flex-column gap-3">
      {/* Hidden video element required for MediaPipe processing */}
      <video ref={videoRef} className="d-none" playsInline muted />

      {/* Real-time Distance Status Bar */}
      <div className="bg-dark text-white rounded-3 p-3 d-flex align-items-center justify-content-between font-monospace small shadow-sm">
        <div className="d-flex align-items-center gap-2">
          <span
            className={`rounded-circle d-inline-block ${
              isFaceDetected ? 'bg-success' : 'bg-warning'
            }`}
            style={{ width: '8px', height: '8px' }}
          />
          <span>
            {isLoading
              ? 'Initializing Camera...'
              : isFaceDetected
              ? 'Face Tracked'
              : 'Searching for Face...'}
          </span>
        </div>
        <div>
          Distance:{' '}
          <span className="fw-bold text-info">
            {distanceMm ? `${(distanceMm / 1000).toFixed(2)} m (${distanceMm} mm)` : 'Measuring...'}
          </span>
        </div>
      </div>

      {/* Error message if camera permission is denied */}
      {error && (
        <div className="alert alert-warning border-warning-subtle small mb-0 rounded-3" role="alert">
          {error}
        </div>
      )}

      {/* Warning banner if the user steps too close to the monitor */}
      {distanceMm && distanceMm < targetDistanceMm - 200 && (
        <div className="alert alert-danger border-danger-subtle d-flex align-items-center gap-3 mb-0 rounded-3" role="alert">
          <AlertCircle className="flex-shrink-0 text-danger" style={{ width: '20px', height: '20px' }} />
          <div className="small">
            <strong>Too close to screen!</strong> Please step back to at least{' '}
            {(targetDistanceMm / 1000).toFixed(1)} meters for test accuracy.
          </div>
        </div>
      )}

      {/* Renders the child component (e.g., TumblingECanvas) */}
      {children}
    </div>
  );
}