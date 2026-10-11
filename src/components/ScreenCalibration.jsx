import React, { useState, useEffect } from 'react';
import { CreditCard, Check, RefreshCw, ZoomIn, ZoomOut, ArrowRight } from 'lucide-react';

const STANDARD_CARD_WIDTH_MM = 85.60; // ISO/IEC 7810 ID-1 standard width in mm
const STANDARD_CARD_HEIGHT_MM = 53.98; // ISO/IEC 7810 ID-1 standard height in mm
const ASPECT_RATIO = STANDARD_CARD_HEIGHT_MM / STANDARD_CARD_WIDTH_MM;

export default function ScreenCalibration({ onCalibrationComplete }) {
  // Default width in pixels
  const [cardWidthPx, setCardWidthPx] = useState(320);
  const [isSaved, setIsSaved] = useState(false);
  const [pxPerMm, setPxPerMm] = useState(null);

  // Load existing calibration from localStorage
  useEffect(() => {
    const savedRatio = localStorage.getItem('opticheck_px_per_mm');
    if (savedRatio) {
      const parsed = parseFloat(savedRatio);
      setPxPerMm(parsed);
      setCardWidthPx(Math.round(parsed * STANDARD_CARD_WIDTH_MM));
    }
  }, []);

  const currentPxPerMm = (cardWidthPx / STANDARD_CARD_WIDTH_MM).toFixed(3);
  const calculatedHeightPx = Math.round(cardWidthPx * ASPECT_RATIO);

  const handleSliderChange = (e) => {
    setCardWidthPx(Number(e.target.value));
    setIsSaved(false);
  };

  const adjustWidth = (delta) => {
    setCardWidthPx((prev) => Math.max(150, Math.min(600, prev + delta)));
    setIsSaved(false);
  };

  const handleSaveCalibration = () => {
    const ratio = cardWidthPx / STANDARD_CARD_WIDTH_MM;
    localStorage.setItem('opticheck_px_per_mm', ratio.toString());
    setPxPerMm(ratio.toFixed(3));
    setIsSaved(true);

    if (onCalibrationComplete) {
      onCalibrationComplete({
        pxPerMm: ratio,
        cardWidthPx,
      });
    }
  };

  const handleReset = () => {
    localStorage.removeItem('opticheck_px_per_mm');
    setCardWidthPx(320);
    setPxPerMm(null);
    setIsSaved(false);
  };

  return (
    <div className="card shadow-lg border-0 rounded-4 mx-auto" style={{ maxWidth: '650px' }}>
      <div className="card-body p-4 p-md-5">
        
        {/* Header */}
        <div className="text-center mb-4">
          <div 
            className="d-inline-flex items-center justify-content-center bg-primary-subtle text-primary rounded-circle mb-3 p-3"
            style={{ width: '56px', height: '56px' }}
          >
            <CreditCard className="w-100 h-100" />
          </div>
          <h2 className="fw-bold text-dark h3">Screen Calibration</h2>
          <p className="text-muted small mb-0">
            Calibrate your display scale so vision testing charts render at accurate physical sizes.
          </p>
        </div>

        {/* Instructions */}
        <div className="alert alert-primary border-primary-subtle d-flex align-items-start gap-3 rounded-3 mb-4">
          <span className="badge bg-primary rounded-circle p-1 d-flex align-items-center justify-center" style={{ width: '22px', height: '22px' }}>
            !
          </span>
          <div className="small">
            <strong>How to calibrate:</strong> Hold any physical debit/credit card or national ID card flat against your screen. Adjust the slider until the graphic matches the exact size of your card.
          </div>
        </div>

        {/* Calibration Target Graphic */}
        <div className="bg-light border border-2 border-dashed rounded-3 p-4 min-vh-25 d-flex flex-column align-items-center justify-content-center overflow-auto mb-4">
          
          {/* Credit Card Container */}
          <div
            style={{
              width: `${cardWidthPx}px`,
              height: `${calculatedHeightPx}px`,
              minWidth: `${cardWidthPx}px`,
              minHeight: `${calculatedHeightPx}px`,
              background: 'linear-gradient(135deg, #0d6efd 0%, #0a58ca 100%)',
              boxShadow: '0 10px 20px rgba(13, 110, 253, 0.3)',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.4)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              padding: '16px',
              color: '#ffffff',
              boxSizing: 'border-box',
              userSelect: 'none',
            }}
          >
            <div className="d-flex justify-content-between align-items-center">
              <span style={{ fontSize: '11px', fontWeight: 'bold', letterSpacing: '0.05em', opacity: 0.9 }}>
                OPTICHECK STANDARD
              </span>
              <div style={{ width: '32px', height: '24px', backgroundColor: '#ffc107', borderRadius: '4px', border: '1px solid #ffcd39' }} />
            </div>

            <div className="text-center my-auto">
              <div style={{ fontSize: '13px', letterSpacing: '0.15em', fontFamily: 'monospace', opacity: 0.9 }}>
                •••• •••• •••• 8560
              </div>
              <div style={{ fontSize: '10px', opacity: 0.8, marginTop: '4px', fontFamily: 'monospace' }}>
                TARGET WIDTH: 85.60 mm
              </div>
            </div>

            <div className="d-flex justify-content-between align-items-center" style={{ fontSize: '10px', fontFamily: 'monospace', opacity: 0.8 }}>
              <span>ALIGN PHYSICAL CARD HERE</span>
              <span>{cardWidthPx}px</span>
            </div>
          </div>

          {/* Dimension indicator */}
          <div
            style={{ width: `${cardWidthPx}px` }}
            className="mt-3 d-flex align-items-center justify-content-between text-muted small font-monospace"
          >
            <div className="border-end border-secondary" style={{ height: '8px' }} />
            <div className="border-top border-secondary border-dashed flex-grow-1 mx-2" />
            <span>{STANDARD_CARD_WIDTH_MM} mm ({cardWidthPx} px)</span>
            <div className="border-top border-secondary border-dashed flex-grow-1 mx-2" />
            <div className="border-end border-secondary" style={{ height: '8px' }} />
          </div>
        </div>

        {/* Controls */}
        <div className="d-flex flex-column gap-3">
          <div>
            <div className="d-flex justify-content-between align-items-center text-secondary small fw-medium mb-2">
              <span>Adjust Card Size</span>
              <span className="font-monospace small">
                Scale Factor: <span className="fw-bold text-primary">{currentPxPerMm}</span> px/mm
              </span>
            </div>

            <div className="d-flex align-items-center gap-2">
              <button
                onClick={() => adjustWidth(-1)}
                className="btn btn-light border p-2 d-flex align-items-center justify-content-center"
                title="Decrease width by 1px"
              >
                <ZoomOut className="w-4 h-4" />
              </button>

              <input
                type="range"
                min="200"
                max="500"
                value={cardWidthPx}
                onChange={handleSliderChange}
                className="form-range flex-grow-1"
              />

              <button
                onClick={() => adjustWidth(1)}
                className="btn btn-light border p-2 d-flex align-items-center justify-content-center"
                title="Increase width by 1px"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 d-flex align-items-center justify-content-between gap-3 border-top">
            <button
              onClick={handleReset}
              className="btn btn-link text-decoration-none text-secondary p-0 small d-flex align-items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> Reset Default
            </button>

            <button
              onClick={handleSaveCalibration}
              className={`btn flex-grow-1 py-2 px-4 rounded-3 fw-medium d-flex align-items-center justify-content-center gap-2 ${
                isSaved ? 'btn-success' : 'btn-primary'
              }`}
            >
              {isSaved ? (
                <>
                  <Check className="w-4 h-4" /> Calibration Saved ({pxPerMm} px/mm)
                </>
              ) : (
                <>
                  Confirm Calibration & Proceed <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}