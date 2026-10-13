import React, { useState, useEffect } from 'react';
import { 
  Eye, 
  Activity, 
  ArrowLeft, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  FileSpreadsheet,
  CreditCard,
  Cloud,
  Database,
  ShieldCheck
} from 'lucide-react';

import HomePage from './HomePage';
import SnellenCanvas from './components/SnellenCanvas';
import TumblingECanvas from './components/TumblingECanvas';
import IshiharaCanvas from './components/IshiharaCanvas';
import AmslerGridCanvas from './components/AmslerGridCanvas';
import AdminDashboard from './components/AdminDashboard';
import { supabase } from './supabaseClient';
import VirtualAssistant from './components/VirtualAssistant';

export default function App() {
  // Navigation State: 'home' | 'selection' | 'calibration' | 'test' | 'admin'
  const [currentView, setCurrentView] = useState('home');
  const [distanceStatus, setDistanceStatus] = useState('ideal');
  const [assistantMessage, setAssistantMessage] = useState('');
  
  // Test Configuration State
  const [selectedTest, setSelectedTest] = useState('snellen'); 
  const [eyeSelection, setEyeSelection] = useState('OU (Both Eyes)');
  
  // Screen Physical Calibration State
  const [cardWidthPx, setCardWidthPx] = useState(280); 
  const [displayScale, setDisplayScale] = useState(1.0);
  const [isMobile, setIsMobile] = useState(false);

  const [testResultsHistory, setTestResultsHistory] = useState([]);
  const [latestTestSummary, setLatestTestSummary] = useState(null);
  const [isLoadingCloud, setIsLoadingCloud] = useState(false);

  const mobileCardWidth = cardWidthPx * 0.62;
  const mobileCardHeight = mobileCardWidth * 1.58;
  const maxScalePercent = 150;
  const clampDisplayScale = (value) => Math.max(0.8, Math.min(value, 1.5));
  const visibleScalePercent = Math.min(Math.round(displayScale * 100), maxScalePercent);

  // Fetch test history from Supabase on mount (with localStorage fallback)
  useEffect(() => {
    async function fetchRecords() {
      setIsLoadingCloud(true);
      try {
        const { data, error } = await supabase
          .from('assessments')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (data && data.length > 0) {
          // Map snake_case database columns to frontend record properties
          const formatted = data.map(item => ({
            id: item.id,
            date: item.created_at,
            testName: item.test_name,
            eyeTested: item.eye_tested,
            score: item.score,
            severity: item.severity,
            diagnosis: item.diagnosis,
            details: item.details || {}
          }));
          setTestResultsHistory(formatted);
        } else {
          // Fallback to localStorage if table is empty
          const local = localStorage.getItem('visual_assessment_history');
          if (local) setTestResultsHistory(JSON.parse(local));
        }
      } catch (err) {
        console.warn('Supabase fetch failed, falling back to localStorage:', err.message);
        const savedHistory = localStorage.getItem('visual_assessment_history');
        if (savedHistory) setTestResultsHistory(JSON.parse(savedHistory));
      } finally {
        setIsLoadingCloud(false);
      }
    }

    fetchRecords();
  }, []);

  useEffect(() => {
    if (currentView !== 'test') {
      setAssistantMessage('');
    }
  }, [currentView]);

  // Save result payload to Supabase Database
  const handleTestComplete = async (resultPayload) => {
    let diagnosis = resultPayload.diagnosis;
    if (!diagnosis) {
      if (resultPayload.severity === 'normal') {
        diagnosis = 'Normal Vision Function - No Significant Deficit Identified';
      } else if (resultPayload.severity === 'moderate') {
        diagnosis = 'Mild Visual Anomaly / Borderline Screening Result';
      } else {
        diagnosis = 'Clinical Deficit Identified - Professional Evaluation Recommended';
      }
    }

    const newRecordPayload = {
      test_name: selectedTest.toUpperCase(),
      eye_tested: eyeSelection,
      score: resultPayload.score || 'Completed',
      severity: resultPayload.severity || 'normal',
      diagnosis: diagnosis,
      details: resultPayload.details || {}
    };

    // Optimistic local state update
    const tempEntry = {
      id: Date.now(),
      date: new Date().toISOString(),
      testName: newRecordPayload.test_name,
      eyeTested: newRecordPayload.eye_tested,
      score: newRecordPayload.score,
      severity: newRecordPayload.severity,
      diagnosis: newRecordPayload.diagnosis,
      details: newRecordPayload.details
    };

    const updatedHistory = [tempEntry, ...testResultsHistory];
    setTestResultsHistory(updatedHistory);
    setLatestTestSummary(tempEntry);

    // Save backup to localStorage
    localStorage.setItem('visual_assessment_history', JSON.stringify(updatedHistory));

    try {
      // Insert into Supabase cloud table
      const { error } = await supabase
        .from('assessments')
        .insert([newRecordPayload]);

      if (error) throw error;
    } catch (err) {
      console.error('Failed to sync record to Supabase cloud:', err.message);
    }
  };

  const handleClearHistory = async () => {
    if (window.confirm('Are you sure you want to clear all screening records?')) {
      setTestResultsHistory([]);
      setLatestTestSummary(null);
      localStorage.removeItem('visual_assessment_history');

      try {
        await supabase.from('assessments').delete().neq('id', 0); // Deletes all rows
      } catch (err) {
        console.error('Error clearing cloud database:', err.message);
      }
    }
  };

  const exportToCSV = () => {
    if (testResultsHistory.length === 0) return;
    const headers = ['ID', 'Date', 'Test Name', 'Eye Tested', 'Score', 'Severity', 'Diagnosis', 'Details'];
    const rows = testResultsHistory.map(r => [
      r.id,
      new Date(r.date).toLocaleString(),
      r.testName,
      r.eyeTested,
      `"${r.score}"`,
      r.severity,
      `"${r.diagnosis}"`,
      `"${JSON.stringify(r.details || {}).replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + 
      [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `visual_assessment_records_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    const updateViewportMode = () => {
      setIsMobile(window.matchMedia('(max-width: 767px)').matches);
    };

    updateViewportMode();
    window.addEventListener('resize', updateViewportMode);
    return () => window.removeEventListener('resize', updateViewportMode);
  }, []);

  return (
    <div className="min-vh-100 bg-white d-flex flex-column">
      {/* Navbar */}
      <nav className="navbar navbar-expand-lg navbar-light bg-light border-bottom px-3 px-md-4 py-2">
        <div className="container-fluid">
          <a 
            className="navbar-brand fw-bold d-flex align-items-center gap-2" 
            onClick={() => { setLatestTestSummary(null); setCurrentView('home'); }}
            style={{ cursor: 'pointer' }}
          >
            <div className="p-2 bg-primary text-white rounded shadow-xs">
              <Eye size={20} />
            </div>
            <span>OPTICHECK <span className="text-primary">System</span></span>
          </a>

          <div className="d-flex align-items-center gap-2">
            {currentView !== 'home' && currentView !== 'admin' && (
              <button 
                type="button" 
                className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-1"
                onClick={() => { setLatestTestSummary(null); setCurrentView('home'); }}
              >
                <ArrowLeft size={16} /> Home
              </button>
            )}

            <button 
              type="button" 
              className="btn btn-dark btn-sm d-inline-flex align-items-center gap-1 font-monospace fw-bold"
              onClick={() => setCurrentView('admin')}
            >
              <ShieldCheck size={16} /> Admin Portal
            </button>
          </div>
        </div>
      </nav>

      {/* Main Viewport */}
      <main className="flex-grow-1">
        {currentView === 'home' && (
          <HomePage 
            onStartAssessment={() => setCurrentView('selection')}
            onViewHistory={() => setCurrentView('admin')}
          />
        )}

        {currentView === 'admin' && (
          <AdminDashboard onBackToHome={() => setCurrentView('home')} />
        )}

        {currentView === 'selection' && (
          <div className="container py-5">
            <div className="row justify-content-center">
              <div className="col-12 col-lg-9">
                <div className="card border-0 shadow-sm p-4 bg-light">
                  <h3 className="fw-bold text-dark mb-1">Select Screening Module</h3>
                  <p className="text-muted small mb-4">Choose target eye configuration and ophthalmic testing protocol.</p>

                  <div className="mb-4">
                    <label className="form-label fw-bold text-dark small">1. Eye Selection:</label>
                    <div className="row g-2">
                      {['OU (Both Eyes)', 'OD (Right Eye)', 'OS (Left Eye)'].map((eye) => (
                        <div className="col-12 col-md-4" key={eye}>
                          <div 
                            className={`p-3 rounded border text-center transition-all ${
                              eyeSelection === eye ? 'bg-primary text-white border-primary shadow-sm' : 'bg-white text-dark'
                            }`}
                            onClick={() => setEyeSelection(eye)}
                            style={{ cursor: 'pointer' }}
                          >
                            <span className="fw-semibold small">{eye}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="form-label fw-bold text-dark small">2. Clinical Test Module:</label>
                    <div className="row g-3">
                      {[
                        { id: 'snellen', title: 'Snellen Visual Acuity', desc: 'Standardized letter chart for distance visual acuity evaluation.' },
                        { id: 'tumbling', title: 'Tumbling E Chart', desc: 'Directional optotype assessment suitable for pediatric or illiterate screening.' },
                        { id: 'ishihara', title: 'Ishihara Color Plates', desc: 'Procedural dot-matrix pseudo-isochromatic plates for red-green color deficiency.' },
                        { id: 'amsler', title: 'Amsler Grid Macular Test', desc: 'High-contrast grid evaluation for metamorphopsia and central scotomas.' }
                      ].map((mod) => (
                        <div className="col-12 col-md-6" key={mod.id}>
                          <div 
                            className={`card h-100 border p-3 ${
                              selectedTest === mod.id ? 'border-primary bg-primary-subtle shadow-sm' : 'bg-white'
                            }`}
                            onClick={() => setSelectedTest(mod.id)}
                            style={{ cursor: 'pointer' }}
                          >
                            <div className="d-flex justify-content-between align-items-start mb-1">
                              <h6 className="fw-bold text-dark mb-0">{mod.title}</h6>
                              {selectedTest === mod.id && <CheckCircle2 size={16} className="text-primary" />}
                            </div>
                            <p className="extra-small text-muted mb-0">{mod.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="text-end">
                    <button 
                      type="button" 
                      className="btn btn-primary px-4 py-2 fw-bold d-inline-flex align-items-center gap-2"
                      onClick={() => setCurrentView('calibration')}
                    >
                      Proceed to Display Calibration →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentView === 'calibration' && (
          <div className="container py-5">
            <div className="row justify-content-center">
              <div className="col-12 col-lg-8">
                <div className="card border-0 shadow-sm p-4 bg-light">
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <CreditCard className="text-primary" size={24} />
                    <h4 className="fw-bold text-dark mb-0">Physical Display Calibration</h4>
                  </div>
                  <p className="text-muted small mb-4">
                    Place a physical ID card or credit card against your screen. Adjust the slider until the on-screen box matches your physical card width.
                  </p>

                  <div className="d-flex justify-content-center my-4 p-4 bg-white rounded border overflow-hidden">
                    <div 
                      className="d-flex flex-column align-items-center justify-content-center shadow-sm transition-all position-relative"
                      style={{
                        width: isMobile ? `${mobileCardWidth}px` : `${cardWidthPx}px`,
                        height: isMobile ? `${mobileCardHeight}px` : `${cardWidthPx * 0.63}px`,
                        minWidth: isMobile ? '110px' : '180px',
                        maxWidth: '100%',
                        borderRadius: isMobile ? '18px' : '12px',
                        border: '2px solid rgba(13, 110, 253, 0.7)',
                        background: 'linear-gradient(135deg, #f8fbff 0%, #dfeaff 100%)',
                        boxShadow: '0 18px 40px rgba(13,110,253,0.15)',
                        padding: isMobile ? '10px' : '14px',
                        transform: 'none'
                      }}
                    >
                      <div
                        className="position-absolute top-0 start-0 w-100"
                        style={{
                          height: isMobile ? '24%' : '22%',
                          background: 'linear-gradient(180deg, rgba(255,255,255,0.25), rgba(255,255,255,0.02))',
                          borderTopLeftRadius: isMobile ? '18px' : '12px',
                          borderTopRightRadius: isMobile ? '18px' : '12px'
                        }}
                      />

                      <div className="position-absolute top-3 start-3 d-flex align-items-center gap-2">
                        <div
                          style={{
                            width: isMobile ? '18px' : '22px',
                            height: isMobile ? '14px' : '18px',
                            borderRadius: '4px',
                            background: 'linear-gradient(135deg, #d7dfe8, #aab7c7)',
                            border: '1px solid rgba(102, 119, 136, 0.4)'
                          }}
                        />
                        <div
                          style={{
                            height: isMobile ? '8px' : '10px',
                            width: isMobile ? '40px' : '52px',
                            borderRadius: '3px',
                            background: 'rgba(108, 117, 125, 0.25)'
                          }}
                        />
                      </div>

                      <div
                        className="position-absolute start-0 end-0"
                        style={{
                          top: isMobile ? '30%' : '28%',
                          height: isMobile ? '10px' : '12px',
                          background: 'linear-gradient(90deg, rgba(35,42,55,0.9), rgba(35,42,55,0.55), rgba(35,42,55,0.9))'
                        }}
                      />

                      <div className="position-relative d-flex flex-column align-items-center justify-content-center text-center" style={{ zIndex: 2 }}>
                        <CreditCard className="text-primary mb-1" size={isMobile ? 18 : 28} />
                        <span className="fw-bold text-dark extra-small text-center">Align Physical Card Here</span>
                        <span className="text-muted extra-small font-monospace text-center">{Math.round(cardWidthPx)} px (~85.6 mm)</span>
                      </div>
                    </div>
                  </div>

                  <div className="mb-4 max-w-md mx-auto">
                    <label className="form-label small fw-bold text-dark d-flex justify-content-between">
                      <span>{isMobile ? 'Adjust Card Height:' : 'Adjust Size Slider:'}</span>
                      <span className="text-primary font-monospace">{visibleScalePercent}% Scale</span>
                    </label>
                    <input 
                      type="range" 
                      className="form-range" 
                      min={isMobile ? 110 : 180} 
                      max={isMobile ? 390 : 600} 
                      step="2"
                      value={cardWidthPx}
                      onChange={(e) => {
                        const newWidth = parseFloat(e.target.value);
                        const nextScale = newWidth / (isMobile ? 240 : 400);
                        setCardWidthPx(newWidth);
                        setDisplayScale(clampDisplayScale(nextScale));
                      }}
                    />
                  </div>

                  <div className="d-flex justify-content-between align-items-center border-top pt-3">
                    <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setCurrentView('selection')}>
                      ← Back to Selection
                    </button>
                    <button type="button" className="btn btn-primary px-4 py-2 fw-bold" onClick={() => setCurrentView('test')}>
                      Confirm Calibration & Start Test
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentView === 'test' && (
          <div className="container py-4">
            <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 bg-light p-3 rounded border">
              <div>
                <span className="badge bg-primary text-uppercase font-monospace me-2">{selectedTest} Module</span>
                <span className="badge bg-secondary">{eyeSelection}</span>
              </div>
              <div className="d-flex align-items-center gap-2">
                <span className="extra-small text-muted font-monospace">Scale: {Math.round(displayScale * 100)}%</span>
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => { setLatestTestSummary(null); setCurrentView('selection'); }}>
                  Exit Test
                </button>
              </div>
            </div>

            {!latestTestSummary ? (
              <>
                {selectedTest === 'snellen' && (
                  <SnellenCanvas 
                    eyeSelection={eyeSelection} 
                    displayScale={displayScale} 
                    onTestComplete={handleTestComplete} 
                    onCancel={() => setCurrentView('selection')} 
                    onDistanceChange={(status) => setDistanceStatus(status)}
                    onAssistantMessage={(msg) => setAssistantMessage(msg)}
                  />
                )}
                {selectedTest === 'tumbling' && (
                  <TumblingECanvas 
                    eyeSelection={eyeSelection} 
                    displayScale={displayScale} 
                    onTestComplete={handleTestComplete} 
                    onCancel={() => setCurrentView('selection')} 
                    onDistanceChange={(status) => setDistanceStatus(status)}
                    onAssistantMessage={(msg) => setAssistantMessage(msg)}
                  />
                )}
                {selectedTest === 'ishihara' && (
                  <IshiharaCanvas 
                    eyeSelection={eyeSelection} 
                    onTestComplete={handleTestComplete} 
                    onCancel={() => setCurrentView('selection')} 
                    onDistanceChange={(status) => setDistanceStatus(status)}
                    onAssistantMessage={(msg) => setAssistantMessage(msg)}
                  />
                )}
                {selectedTest === 'amsler' && (
                  <AmslerGridCanvas 
                    eyeSelection={eyeSelection} 
                    onTestComplete={handleTestComplete} 
                    onCancel={() => setCurrentView('selection')} 
                    onDistanceChange={(status) => setDistanceStatus(status)}
                    onAssistantMessage={(msg) => setAssistantMessage(msg)}
                  />
                )}
              </>
            ) : (
              <div className="card border-0 shadow-sm p-4 bg-light text-center max-w-2xl mx-auto">
                <div className={`p-3 rounded-circle d-inline-flex mx-auto mb-3 ${
                  latestTestSummary.severity === 'normal' ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning'
                }`}>
                  {latestTestSummary.severity === 'normal' ? <CheckCircle2 size={40} /> : <AlertTriangle size={40} />}
                </div>

                <h4 className="fw-bold text-dark mb-1">Assessment Complete</h4>
                <p className="text-muted small mb-3">Module: {latestTestSummary.testName} ({latestTestSummary.eyeTested})</p>

                <div className="bg-white p-3 rounded border mb-4 text-start">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="small text-muted fw-semibold">Clinical Score / Visual Result:</span>
                    <span className="badge bg-primary fs-6 font-monospace">{latestTestSummary.score}</span>
                  </div>
                  <div className="mb-2">
                    <span className="small text-muted fw-semibold d-block mb-1">Diagnosis / Clinical Classification:</span>
                    <div className={`p-2 rounded fw-bold small ${
                      latestTestSummary.severity === 'normal' ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning-emphasis'
                    }`}>
                      {latestTestSummary.diagnosis}
                    </div>
                  </div>
                </div>

                <div className="d-flex justify-content-center gap-3">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setLatestTestSummary(null)}>
                    Retake Test
                  </button>
                  <button type="button" className="btn btn-primary fw-bold" onClick={() => setCurrentView('history')}>
                    View Cloud Records →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {currentView === 'history' && (
          <div className="container py-5">
            <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
              <div>
                <h3 className="fw-bold text-dark mb-1">Cloud Screening Records</h3>
                <p className="text-muted small mb-0">Persistent clinical evaluations synchronized with Supabase database.</p>
              </div>

              <div className="d-flex gap-2">
                {testResultsHistory.length > 0 && (
                  <>
                    <button type="button" className="btn btn-outline-success btn-sm d-inline-flex align-items-center gap-1 fw-semibold" onClick={exportToCSV}>
                      <FileSpreadsheet size={16} /> Export CSV
                    </button>
                    <button type="button" className="btn btn-outline-danger btn-sm d-inline-flex align-items-center gap-1" onClick={handleClearHistory}>
                      Clear Records
                    </button>
                  </>
                )}
              </div>
            </div>

            {isLoadingCloud ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary mb-2" role="status"></div>
                <p className="text-muted small">Loading records from Supabase cloud...</p>
              </div>
            ) : testResultsHistory.length === 0 ? (
              <div className="text-center py-5 bg-light rounded border">
                <History size={48} className="text-muted mb-3" />
                <h5 className="fw-bold text-dark">No Cloud Records Found</h5>
                <p className="text-muted small mb-4">Complete a screening module to save records to the database.</p>
                <button type="button" className="btn btn-primary fw-bold" onClick={() => setCurrentView('selection')}>
                  Start Screening
                </button>
              </div>
            ) : (
              <div className="row g-3">
                {testResultsHistory.map((record) => (
                  <div className="col-12" key={record.id}>
                    <div className="card border-0 shadow-sm p-3 bg-light">
                      <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-2">
                        <div className="d-flex align-items-center gap-3">
                          <div className={`p-2 rounded ${record.severity === 'normal' ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning'}`}>
                            {record.severity === 'normal' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
                          </div>
                          <div>
                            <div className="d-flex align-items-center gap-2">
                              <h6 className="fw-bold text-dark mb-0 font-monospace">{record.testName} Module</h6>
                              <span className="badge bg-secondary">{record.eyeTested}</span>
                            </div>
                            <span className="text-muted extra-small">{new Date(record.date).toLocaleString()}</span>
                          </div>
                        </div>

                        <div className="text-end">
                          <span className="badge bg-white text-dark border shadow-xs px-3 py-2 fw-bold font-monospace fs-6">
                            Score: {record.score}
                          </span>
                        </div>
                      </div>

                      <div className="bg-white p-2 rounded border mb-2">
                        <span className="extra-small text-muted fw-bold d-block">Clinical Diagnosis / Classification:</span>
                        <span className={`small fw-bold ${record.severity === 'normal' ? 'text-success' : 'text-danger'}`}>
                          {record.diagnosis}
                        </span>
                      </div>

                      {record.details && (
                        <div className="extra-small text-muted d-flex flex-wrap gap-3">
                          {Object.entries(record.details).map(([key, val]) => (
                            <span key={key}>
                              <strong className="text-dark">{key}:</strong> {String(val)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="bg-light border-top py-3 text-center text-muted small mt-auto">
        <div className="container">
          Visual Assessment System &copy; 2026 | MJI SOFT TECH
        </div>
      </footer>

      <VirtualAssistant 
        currentModule={currentView}
        distanceStatus={distanceStatus}
        eyeTested={eyeSelection}
        assistantMessage={assistantMessage}
      />
    </div>
  );
}
