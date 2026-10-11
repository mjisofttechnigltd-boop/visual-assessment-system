import React from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Printer, 
  Eye, 
  Download, 
  FileText, 
  Calendar, 
  User, 
  Activity, 
  ExternalLink 
} from 'lucide-react';

export default function PatientResultModal({ result, onClose }) {
  if (!result) return null;

  const {
    patientName = 'Anonymous Patient',
    testType = 'SNELLEN',
    date = new Date().toLocaleDateString(),
    score = '20/20',
    severity = 'normal', // 'normal' | 'moderate' | 'action_required'
    eyeTested = 'OU (Both Eyes)',
    details = {}
  } = result;

  // Configure severity badges & visual indicators
  const severityConfig = {
    normal: {
      label: 'Normal / Within Standard Limits',
      badgeClass: 'bg-success-subtle text-success border-success-subtle',
      icon: <CheckCircle2 className="text-success" size={24} />,
      summary: 'No prominent visual impairment or macular distortion detected during this screening.'
    },
    moderate: {
      label: 'Moderate Screening Finding',
      badgeClass: 'bg-warning-subtle text-warning-emphasis border-warning-subtle',
      icon: <AlertTriangle className="text-warning" size={24} />,
      summary: 'Mild variation from standard vision parameters observed. Monitoring or baseline follow-up recommended.'
    },
    action_required: {
      label: 'Clinical Review Recommended',
      badgeClass: 'bg-danger-subtle text-danger border-danger-subtle',
      icon: <XCircle className="text-danger" size={24} />,
      summary: 'Significant deviation or distortion detected. Formal examination by an optometrist or ophthalmologist is advised.'
    }
  }[severity] || severityConfig.normal;

  // Dynamic functional impact content based on assessment modality
  const getFunctionalImpact = () => {
    switch (testType) {
      case 'AMSLER_GRID':
        return {
          title: 'Central Vision & Macular Health',
          impacts: [
            'Ability to read fine print or continuous book text.',
            'Facial recognition accuracy at conversational distances.',
            'Precision activities such as sewing, craftwork, or tool alignment.'
          ],
          advice: 'If wavy lines (metamorphopsia) or persistent dark spots are present, avoid delaying an in-person retinal evaluation.'
        };
      case 'ISHIHARA':
        return {
          title: 'Color Perception & Discrimination',
          impacts: [
            'Distinguishing signal lights (traffic signals, maritime markers).',
            'Interpreting color-coded electronic schematics or financial charts.',
            'Professional tasks in electrical wiring, graphic design, and logistics.'
          ],
          advice: 'Color perception deficiencies are typically inherited and stable. Consider color-assistive tools or software filters for daily digital tasks.'
        };
      case 'SNELLEN':
      case 'TUMBLING_E':
      default:
        return {
          title: 'Distance Visual Acuity & Clarity',
          impacts: [
            'Reading overhead highway signage while driving.',
            'Recognizing faces across a room or viewing projection screens.',
            'Overall visual confidence during outdoor or low-light navigation.'
          ],
          advice: severity !== 'normal' 
            ? 'Refractive error (nearsightedness or astigmatism) is common. A formal trial lens examination can quickly refine your acuity.'
            : 'Maintain standard yearly eye screenings to keep track of subtle acuity changes.'
        };
    }
  };

  const impactInfo = getFunctionalImpact();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal show d-block tab-modal-backdrop bg-dark bg-opacity-50" tabIndex="-1">
      <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div className="modal-content shadow-lg border-0 rounded-3 overflow-hidden">
          
          {/* Printable & Screen Modal Header */}
          <div className="modal-header bg-dark text-white p-3 d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center gap-2">
              <Eye className="text-primary" size={24} />
              <h5 className="modal-title fw-bold mb-0">Visual Assessment Report</h5>
            </div>
            <button 
              type="button" 
              className="btn-close btn-close-white no-print" 
              onClick={onClose}
              aria-label="Close"
            />
          </div>

          <div className="modal-body p-4 bg-light-subtle" id="printable-report">
            
            {/* Header / Meta Banner */}
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-body p-3">
                <div className="row g-3">
                  <div className="col-6 col-md-3">
                    <span className="text-muted extra-small d-block text-uppercase fw-semibold">Patient Name</span>
                    <span className="fw-bold text-dark d-flex align-items-center gap-1">
                      <User size={16} className="text-primary" /> {patientName}
                    </span>
                  </div>
                  <div className="col-6 col-md-3">
                    <span className="text-muted extra-small d-block text-uppercase fw-semibold">Date Tested</span>
                    <span className="fw-bold text-dark d-flex align-items-center gap-1">
                      <Calendar size={16} className="text-primary" /> {date}
                    </span>
                  </div>
                  <div className="col-6 col-md-3">
                    <span className="text-muted extra-small d-block text-uppercase fw-semibold">Modality</span>
                    <span className="fw-bold text-dark d-flex align-items-center gap-1">
                      <Activity size={16} className="text-primary" /> {testType.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="col-6 col-md-3">
                    <span className="text-muted extra-small d-block text-uppercase fw-semibold">Eye Examined</span>
                    <span className="fw-bold text-dark">{eyeTested}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Severity Status Card */}
            <div className={`card border p-3 mb-4 rounded-3 ${severityConfig.badgeClass}`}>
              <div className="d-flex align-items-start gap-3">
                <div className="p-1">{severityConfig.icon}</div>
                <div className="flex-grow-1">
                  <div className="d-flex align-items-center justify-content-between">
                    <h6 className="fw-bold mb-1">{severityConfig.label}</h6>
                    <span className="fs-4 fw-black text-dark font-monospace">{score}</span>
                  </div>
                  <p className="small mb-0 text-dark-emphasis">{severityConfig.summary}</p>
                </div>
              </div>
            </div>

            {/* Test Details Breakdown */}
            {details && Object.keys(details).length > 0 && (
              <div className="card border-0 shadow-sm mb-4">
                <div className="card-header bg-white fw-bold py-2 border-bottom-0 text-muted extra-small text-uppercase">
                  Screening Technical Metrics
                </div>
                <div className="card-body pt-0">
                  <div className="row g-2">
                    {Object.entries(details).map(([key, val]) => (
                      <div className="col-6 col-md-4" key={key}>
                        <div className="p-2 bg-light rounded border border-light-subtle">
                          <div className="text-muted extra-small text-capitalize">{key.replace(/([A-Z])/g, ' $1')}</div>
                          <div className="fw-bold small text-dark">{String(val)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Functional Impact & Daily Practicality */}
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-body p-3">
                <h6 className="fw-bold text-primary d-flex align-items-center gap-2 mb-2">
                  <FileText size={18} /> Practical Functional Impact
                </h6>
                <p className="small text-muted mb-2">
                  This test evaluates <strong>{impactInfo.title}</strong>. Results may influence performance in:
                </p>
                <ul className="small text-dark mb-3 ps-3">
                  {impactInfo.impacts.map((item, index) => (
                    <li key={index} className="mb-1">{item}</li>
                  ))}
                </ul>
                
                <div className="p-2 bg-info-subtle border border-info-subtle rounded small text-info-emphasis">
                  <strong>Clinical Guidance:</strong> {impactInfo.advice}
                </div>
              </div>
            </div>

            {/* Standard Screening Disclaimer */}
            <div className="text-muted extra-small p-2 bg-white rounded border">
              <strong>Disclaimer:</strong> OptiCheck is a screening assistance tool and does not provide an official diagnostic medical opinion. Results should be reviewed by a licensed eye care clinician.
            </div>

          </div>

          {/* Modal Actions & PDF / Print Controls */}
          <div className="modal-footer bg-white no-print">
            <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
              Close
            </button>
            <button type="button" className="btn btn-primary d-flex align-items-center gap-2" onClick={handlePrint}>
              <Printer size={18} /> Print / Save as PDF
            </button>
          </div>

        </div>
      </div>

      {/* Embedded CSS for clean printing */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .modal-backdrop { display: none !important; }
          .modal { position: static !important; display: block !important; }
          .modal-dialog { max-width: 100% !important; margin: 0 !important; }
          .modal-content { border: none !important; box-shadow: none !important; }
        }
      `}</style>
    </div>
  );
}