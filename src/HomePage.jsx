import React from 'react';
import { 
  Eye, 
  Activity, 
  ShieldCheck, 
  FileText, 
  ArrowRight, 
  CheckCircle2, 
  Camera, 
  Mic 
} from 'lucide-react';

export default function HomePage({ onStartAssessment, onViewHistory }) {
  return (
    <div className="container py-5">
      {/* Hero Section */}
      <div className="row align-items-center mb-5 pb-3">
        <div className="col-12 col-lg-7 text-center text-lg-start mb-4 mb-lg-0">
          <span className="badge bg-primary-subtle text-primary fw-bold font-monospace px-3 py-2 mb-3">
            Clinical-Grade Digital Vision Screening
          </span>
          <h1 className="display-5 fw-bold text-dark mb-3">
            Visual Assessment <span className="text-primary">System</span>
          </h1>
          <p className="lead text-muted mb-4">
            A comprehensive, web-based ophthalmic screening platform featuring real-time optical distance tracking, procedural color plates, and precise visual acuity evaluations.
          </p>
          <div className="d-flex flex-wrap justify-content-center justify-content-lg-start gap-3">
            <button 
              type="button" 
              className="btn btn-primary btn-lg px-4 fw-bold d-inline-flex align-items-center gap-2 shadow-sm"
              onClick={onStartAssessment}
            >
              Start New Assessment <ArrowRight size={18} />
            </button>
            <button 
              type="button" 
              className="btn btn-outline-secondary btn-lg px-4 fw-semibold"
              onClick={onViewHistory}
            >
              View Test Records
            </button>
          </div>
        </div>

        {/* Hero Visual Card */}
        <div className="col-12 col-lg-5">
          <div className="card border-0 shadow-sm bg-light p-4 text-center">
            <div className="p-4 bg-primary-subtle text-primary rounded-circle d-inline-flex mx-auto mb-3 shadow-inner">
              <Eye size={48} />
            </div>
            <h5 className="fw-bold text-dark mb-2">Integrated Suite</h5>
            <p className="small text-muted mb-3">
              Standardized distance monitoring via WebCam ensures clinical accuracy right from your browser.
            </p>
            <div className="d-flex justify-content-center gap-2">
              <span className="badge bg-white text-dark border shadow-xs">Snellen Acuity</span>
              <span className="badge bg-white text-dark border shadow-xs">Tumbling E</span>
              <span className="badge bg-white text-dark border shadow-xs">Ishihara Plates</span>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Grid Highlights */}
      <div className="row g-4 pt-3 border-top">
        <div className="col-12 col-md-6 col-lg-3">
          <div className="card h-100 border-0 bg-light p-3">
            <div className="p-2 bg-white rounded shadow-xs d-inline-flex text-primary mb-3">
              <Activity size={24} />
            </div>
            <h6 className="fw-bold text-dark">Visual Acuity</h6>
            <p className="text-muted small mb-0">
              Snellen & Tumbling E modules with automated scoring and keyboard/voice input support.
            </p>
          </div>
        </div>

        <div className="col-12 col-md-6 col-lg-3">
          <div className="card h-100 border-0 bg-light p-3">
            <div className="p-2 bg-white rounded shadow-xs d-inline-flex text-success mb-3">
              <ShieldCheck size={24} />
            </div>
            <h6 className="fw-bold text-dark">Color Vision</h6>
            <p className="text-muted small mb-0">
              Procedural Ishihara dot-matrix generation preventing image predictability and spotting deficiencies.
            </p>
          </div>
        </div>

        <div className="col-12 col-md-6 col-lg-3">
          <div className="card h-100 border-0 bg-light p-3">
            <div className="p-2 bg-white rounded shadow-xs d-inline-flex text-warning mb-3">
              <Camera size={24} />
            </div>
            <h6 className="fw-bold text-dark">Distance Tracking</h6>
            <p className="text-muted small mb-0">
              Real-time optical distance sensors alert users if they move too close or too far from the screen.
            </p>
          </div>
        </div>

        <div className="col-12 col-md-6 col-lg-3">
          <div className="card h-100 border-0 bg-light p-3">
            <div className="p-2 bg-white rounded shadow-xs d-inline-flex text-info mb-3">
              <FileText size={24} />
            </div>
            <h6 className="fw-bold text-dark">Persistent Records</h6>
            <p className="text-muted small mb-0">
              Secure local storage recording with instant CSV and JSON export options for clinical review.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}