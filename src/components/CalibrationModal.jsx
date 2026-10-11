import React, { useState } from 'react';
import { CreditCard, Check, X } from 'lucide-react';

export default function CalibrationModal({ pxPerMm, onSave, onClose }) {
  // Standard credit card width in millimeters (ID-1 format)
  const CREDIT_CARD_WIDTH_MM = 85.60;
  
  // Initialize slider width in pixels based on current calibration
  const [cardWidthPx, setCardWidthPx] = useState(() => Math.round(pxPerMm * CREDIT_CARD_WIDTH_MM));

  const handleConfirm = () => {
    const calculatedPxPerMm = cardWidthPx / CREDIT_CARD_WIDTH_MM;
    onSave(calculatedPxPerMm);
  };

  return (
    <div className="modal fade show d-block bg-dark bg-opacity-50" tabIndex="-1">
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content border-0 shadow">
          <div className="modal-header bg-primary text-white">
            <h5 className="modal-header-title mb-0 d-flex align-items-center gap-2">
              <CreditCard size={20} /> Screen Scale Calibration
            </h5>
            <button 
              type="button" 
              className="btn-close btn-close-white" 
              onClick={onClose}
            ></button>
          </div>

          <div className="modal-body p-4 text-center">
            <p className="small text-muted mb-3">
              Hold a standard physical credit card or ID card up to your screen. 
              Adjust the slider below until the blue box matches the exact width of your card.
            </p>

            {/* Visual Card Target */}
            <div className="d-flex justify-content-center my-4">
              <div
                className="bg-primary bg-opacity-10 border border-2 border-primary rounded d-flex flex-column align-items-center justify-content-center text-primary shadow-sm transition-all"
                style={{
                  width: `${cardWidthPx}px`,
                  height: `${cardWidthPx * 0.63}px`, // Maintains credit card aspect ratio
                  maxWidth: '100%',
                  minWidth: '150px'
                }}
              >
                <CreditCard size={32} className="mb-2" />
                <span className="extra-small fw-bold font-monospace">
                  {cardWidthPx}px ({(cardWidthPx / CREDIT_CARD_WIDTH_MM).toFixed(2)} px/mm)
                </span>
              </div>
            </div>

            {/* Scale Slider Control */}
            <div className="mt-3">
              <label className="form-label small text-muted d-flex justify-content-between">
                <span>Adjust Card Size:</span>
                <span className="fw-bold font-monospace">{cardWidthPx} px</span>
              </label>
              <input
                type="range"
                className="form-range"
                min="200"
                max="600"
                step="1"
                value={cardWidthPx}
                onChange={(e) => setCardWidthPx(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="modal-footer bg-light">
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onClose}>
              <X size={14} className="me-1" /> Cancel
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={handleConfirm}>
              <Check size={14} className="me-1" /> Save Calibration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}