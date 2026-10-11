import React, { useState, useEffect } from 'react';
import { 
  Eye, 
  History, 
  Maximize2, 
  User, 
  Activity, 
  CheckCircle2, 
  FileText 
} from 'lucide-react';

// Canvas Test Components
import TumblingECanvas from './components/TumblingECanvas';
import SnellenCanvas from './components/SnellenCanvas';
import IshiharaCanvas from './components/IshiharaCanvas';
import AmslerGridCanvas from './components/AmslerGridCanvas';

// Dashboard & Calibration
import CalibrationModal from './components/CalibrationModal';
import TestHistoryDashboard from './components/TestHistoryDashboard';

export default function App() {
  // Navigation & Workflow State
  const [activeTab, setActiveTab] = useState('test'); // 'test' | 'history'
  const [step, setStep] = useState('calibration'); // 'calibration' | 'patient_info' | 'active_test'
  
  // Clinical / Calibration Setup State
  const [pxPerMm, setPxPerMm] = useState(3.78); // Default ~96 DPI screen calibration
  const [showCalibrationModal, setShowCalibrationModal] = useState(false);
  const [patientName, setPatientName] = useState('');
  const [selectedEye, setSelectedEye] = useState('OU (Both Eyes)');
  const [selectedTest, setSelectedTest] = useState('TUMBLING_E');

  // Assessment History State (Persisted in localStorage)
  const [historyRecords, setHistoryRecords] = useState(() => {
    const saved = localStorage.getItem('opticheck_history');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing stored test history:', e);
      }
    }
    // Default initial mock history if local storage is empty
    return [
      {
        id: 'REC-101',
        patientName: 'Jane Doe',
        date: '2026-10-04',
        testType: 'AMSLER_GRID',
        eyeTested: 'OD (Right Eye)',
        score: 'Distortion Detected',
        severity: 'action_required',
        details: {
          gridResolution: '20x20',
          distortedQuadrants: 'Central & Upper Right',
          metamorphopsia: 'Present',
          scotomaDetected: 'No'
        }
      },
      {
        id: 'REC-102',
        patientName: 'John Smith',
        date: '2026-10-02',
        testType: 'SNELLEN',
        eyeTested: 'OU (Both Eyes)',
        score: '20/20',
        severity: 'normal',
        details: {
          acuityLogMAR: '0.00',
          smallestLineRead: 'Line 8 (20/20)',
          totalErrors: 0,
          testingDistance: '1000 mm'
        }
      }
    ];
  });

  // Sync assessment history to localStorage on change
  useEffect(() => {
    localStorage.setItem('opticheck_history', JSON.stringify(historyRecords));
  }, [historyRecords]);

  // Unified save handler passed into all test canvases
  const handleSaveTestResult = (testResultData) => {
    const newRecord = {
      id: `REC-${Date.now().toString().slice(-4)}`,
      patientName: patientName.trim() || 'Anonymous Patient',
      date: new Date().toISOString().split('T')[0],
      testType: selectedTest,
      eyeTested: testResultData.eyeTested || selectedEye,
      score: testResultData.score || 'N/A',
      severity: testResultData.severity || 'normal',
      details: testResultData.details || {}
    };

    setHistoryRecords((prev) => [newRecord, ...prev]);
    setActiveTab('history'); // Automatically switch to dashboard upon test completion
    setStep('patient_info'); // Reset workflow for the next test session
  };

  // Helper renderer for active test canvas
  const renderActiveTestCanvas = () => {
    const commonProps = {
      pxPerMm,
      eyeSelection: selectedEye,
      onTestComplete: handleSaveTestResult,
      onCancel: () => setStep('patient_info')
    };

    switch (selectedTest) {
      case 'TUMBLING_E':
        return <TumblingECanvas {...commonProps} />;
      case 'SNELLEN':
        return <SnellenCanvas {...commonProps} />;
      case 'ISHIHARA':
        return <IshiharaCanvas {...commonProps} />;
      case 'AMSLER_GRID':
        return <AmslerGridCanvas {...commonProps} />;
      default:
        return <TumblingECanvas {...commonProps} />;
    }
  };

  return (
    <div className="min-vh-100 bg-light d-flex flex-column">
      {/* Global Header / Navigation */}
      <header className="navbar navbar-expand-md navbar-dark bg-dark sticky-top shadow-sm px-4">
        <div className="container-fluid max-w-7xl">
          <div className="navbar-brand d-flex align-items-center gap-2 fw-bold fs-4">
            <Eye className="text-primary" size={28} />
            <span>OptiCheck <span className="badge bg-primary fs-6 fw-normal">Vision Suite</span></span>
          </div>

          <div className="d-flex align-items-center gap-2">
            <button
              className={`btn btn-sm ${activeTab === 'test' ? 'btn-primary' : 'btn-outline-light'}`}
              onClick={() => setActiveTab('test')}
            >
              <Activity size={16} className="me-1" /> Vision Test
            </button>
            <button
              className={`btn btn-sm ${activeTab === 'history' ? 'btn-primary' : 'btn-outline-light'}`}
              onClick={() => setActiveTab('history')}
            >
              <History size={16} className="me-1" /> History Dashboard
              {historyRecords.length > 0 && (
                <span className="badge bg-white text-dark ms-2">{historyRecords.length}</span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="container-fluid max-w-7xl py-4 flex-grow-1">
        {activeTab === 'history' ? (
          /* Render History Dashboard */
          <TestHistoryDashboard records={historyRecords} />
        ) : (
          /* Vision Assessment Workflow */
          <div className="row justify-content-center">
            <div className="col-12 col-lg-10">
              
              {/* Calibration Status Banner */}
              <div className="card border-0 shadow-sm mb-4">
                <div className="card-body d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 bg-white rounded">
                  <div className="d-flex align-items-center gap-3">
                    <div className="p-2 bg-primary-subtle text-primary rounded-circle">
                      <Maximize2 size={22} />
                    </div>
                    <div>
                      <h6 className="mb-0 fw-bold">Display Scale Calibration</h6>
                      <small className="text-muted">
                        Current Scale: <strong>{pxPerMm.toFixed(2)} px/mm</strong> {pxPerMm > 0 ? '(Calibrated)' : '(Uncalibrated)'}
                      </small>
                    </div>
                  </div>
                  <button
                    className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-1"
                    onClick={() => setShowCalibrationModal(true)}
                  >
                    Recalibrate Display
                  </button>
                </div>
              </div>

              {/* Step Flow Navigation */}
              {step !== 'active_test' && (
                <div className="card border-0 shadow-sm mb-4">
                  <div className="card-body p-4">
                    <h5 className="fw-bold mb-3 d-flex align-items-center gap-2">
                      <User className="text-primary" size={20} /> New Vision Assessment Setup
                    </h5>
                    
                    <div className="row g-3">
                      {/* Patient Name Input */}
                      <div className="col-12 col-md-6">
                        <label className="form-label fw-semibold small text-muted">Patient Name / Identifier</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. John Doe or PAT-0042"
                          value={patientName}
                          onChange={(e) => setPatientName(e.target.value)}
                        />
                      </div>

                      {/* Eye Selection */}
                      <div className="col-12 col-md-6">
                        <label className="form-label fw-semibold small text-muted">Eye Under Test</label>
                        <select
                          className="form-select"
                          value={selectedEye}
                          onChange={(e) => setSelectedEye(e.target.value)}
                        >
                          <option value="OU (Both Eyes)">OU (Both Eyes)</option>
                          <option value="OD (Right Eye)">OD (Right Eye)</option>
                          <option value="OS (Left Eye)">OS (Left Eye)</option>
                        </select>
                      </div>

                      {/* Select Assessment Modality */}
                      <div className="col-12">
                        <label className="form-label fw-semibold small text-muted">Select Vision Modality</label>
                        <div className="row g-2">
                          {[
                            { id: 'TUMBLING_E', label: 'Tumbling E Chart', desc: 'Optotype orientation test for visual acuity.' },
                            { id: 'SNELLEN', label: 'Snellen Chart', desc: 'Standard letter-based visual acuity chart.' },
                            { id: 'ISHIHARA', label: 'Ishihara Color', desc: 'Pseudoisochromatic plate red-green deficiency test.' },
                            { id: 'AMSLER_GRID', label: 'Amsler Grid', desc: 'Macular & central visual field distortion grid.' }
                          ].map((t) => (
                            <div key={t.id} className="col-12 col-sm-6">
                              <div
                                className={`p-3 border rounded h-100 cursor-pointer transition-all ${
                                  selectedTest === t.id ? 'border-primary bg-primary-subtle' : 'bg-white'
                                }`}
                                style={{ cursor: 'pointer' }}
                                onClick={() => setSelectedTest(t.id)}
                              >
                                <div className="d-flex align-items-center justify-content-between mb-1">
                                  <span className="fw-bold text-dark">{t.label}</span>
                                  {selectedTest === t.id && <CheckCircle2 size={18} className="text-primary" />}
                                </div>
                                <p className="small text-muted mb-0">{t.desc}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Begin Assessment Action */}
                      <div className="col-12 text-end mt-4">
                        <button
                          className="btn btn-primary px-4 py-2 d-inline-flex align-items-center gap-2 fw-semibold"
                          onClick={() => setStep('active_test')}
                        >
                          <Activity size={18} /> Begin Assessment
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Active Assessment Canvas */}
              {step === 'active_test' && (
                <div className="card border-0 shadow-sm">
                  <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                    <div>
                      <span className="badge bg-primary-subtle text-primary mb-1">Testing Active</span>
                      <h5 className="mb-0 fw-bold">{patientName || 'Anonymous Patient'} &mdash; {selectedTest.replace('_', ' ')}</h5>
                    </div>
                    <button
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => setStep('patient_info')}
                    >
                      Exit Test
                    </button>
                  </div>
                  <div className="card-body p-4">
                    {renderActiveTestCanvas()}
                  </div>
                </div>
              )}

            </div>
          </div>
        )}
      </main>

      {/* Screen Calibration Modal */}
      {showCalibrationModal && (
        <CalibrationModal
          pxPerMm={pxPerMm}
          onSave={(newPxPerMm) => {
            setPxPerMm(newPxPerMm);
            setShowCalibrationModal(false);
          }}
          onClose={() => setShowCalibrationModal(false)}
        />
      )}
    </div>
  );
}