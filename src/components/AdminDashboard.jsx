import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Search, 
  FileSpreadsheet, 
  Trash2, 
  RefreshCw, 
  Users, 
  CheckCircle2, 
  AlertTriangle,
  ArrowLeft,
  Lock,
  User,
  LogOut
} from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function AdminDashboard({ onBackToHome }) {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);

  // Records & Dashboard State
  const [records, setRecords] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);

  // Check sessionStorage on mount so admin stays logged in during the session
  useEffect(() => {
    const adminSession = sessionStorage.getItem('admin_auth_session');
    if (adminSession === 'true') {
      setIsAuthenticated(true);
      fetchAdminRecords();
    }
  }, []);

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoadingAuth(true);

    try {
      // Option A: Check against environment variables (Configured in Vercel)
      const expectedUser = import.meta.env.VITE_ADMIN_USER || 'admin';
      const expectedPass = import.meta.env.VITE_ADMIN_PASS || 'clinical123';

      if (username.trim() === expectedUser && password === expectedPass) {
        setIsAuthenticated(true);
        sessionStorage.setItem('admin_auth_session', 'true');
        fetchAdminRecords();
      } else {
        // Option B (Fallback): Check against Supabase admin_users table if table exists
        const { data, error } = await supabase
          .from('admin_users')
          .select('*')
          .eq('username', username.trim())
          .eq('password_hash', password)
          .single();

        if (data && !error) {
          setIsAuthenticated(true);
          sessionStorage.setItem('admin_auth_session', 'true');
          fetchAdminRecords();
        } else {
          setErrorMsg('Invalid username or password. Access denied.');
        }
      }
    } catch (err) {
      console.error('Authentication error:', err);
      setErrorMsg('Invalid username or password. Access denied.');
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('admin_auth_session');
    setIsAuthenticated(false);
    setUsername('');
    setPassword('');
  };

  const fetchAdminRecords = async () => {
    setIsLoadingRecords(true);
    try {
      const { data, error } = await supabase
        .from('assessments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formatted = (data || []).map(item => ({
        id: item.id,
        date: item.created_at,
        testName: item.test_name,
        eyeTested: item.eye_tested,
        score: item.score,
        severity: item.severity,
        diagnosis: item.diagnosis,
        details: item.details || {}
      }));

      setRecords(formatted);
    } catch (err) {
      console.error('Failed to fetch admin records:', err.message);
    } finally {
      setIsLoadingRecords(false);
    }
  };

  const handleDeleteRecord = async (id) => {
    if (window.confirm(`Are you sure you want to permanently delete record #${id}?`)) {
      try {
        const { error } = await supabase.from('assessments').delete().eq('id', id);
        if (error) throw error;
        setRecords(records.filter(r => r.id !== id));
      } catch (err) {
        alert(`Delete failed: ${err.message}`);
      }
    }
  };

  const exportCSV = () => {
    if (records.length === 0) return;
    const headers = ['Record ID', 'Date', 'Test Module', 'Eye Tested', 'Score', 'Severity', 'Diagnosis'];
    const rows = records.map(r => [
      r.id,
      new Date(r.date).toLocaleString(),
      r.testName,
      r.eyeTested,
      `"${r.score}"`,
      r.severity,
      `"${r.diagnosis}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `clinical_records_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter records based on search input
  const filteredRecords = records.filter(r => 
    r.testName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.diagnosis?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.eyeTested?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(r.id).includes(searchTerm)
  );

  const totalAssessments = records.length;
  const normalCount = records.filter(r => r.severity === 'normal').length;
  const deficitCount = records.filter(r => r.severity !== 'normal').length;

  // LOGIN SCREEN VIEW
  if (!isAuthenticated) {
    return (
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-12 col-md-5">
            <div className="card border-0 shadow p-4 bg-light">
              <div className="text-center mb-3">
                <div className="p-3 bg-primary text-white rounded-circle d-inline-flex mb-2 shadow-sm">
                  <Lock size={32} />
                </div>
                <h4 className="fw-bold text-dark mb-1">Admin Portal Login</h4>
                <p className="text-muted small">Enter clinical administrator credentials to view patient records.</p>
              </div>

              {errorMsg && (
                <div className="alert alert-danger extra-small p-2 text-center" role="alert">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleAdminLogin}>
                <div className="mb-3">
                  <label className="form-label small fw-bold text-dark">Admin Username:</label>
                  <div className="input-group">
                    <span className="input-group-text bg-white">
                      <User size={16} className="text-muted" />
                    </span>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Enter username..."
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="form-label small fw-bold text-dark">Admin Password:</label>
                  <div className="input-group">
                    <span className="input-group-text bg-white">
                      <Lock size={16} className="text-muted" />
                    </span>
                    <input 
                      type="password" 
                      className="form-control" 
                      placeholder="Enter password..."
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="btn btn-primary w-100 fw-bold py-2 mb-2 shadow-sm"
                  disabled={isLoadingAuth}
                >
                  {isLoadingAuth ? 'Authenticating...' : 'Sign In to Dashboard'}
                </button>
                <button type="button" className="btn btn-outline-secondary w-100 btn-sm" onClick={onBackToHome}>
                  ← Return to Home
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // PROTECTED ADMIN DASHBOARD VIEW
  return (
    <div className="container py-4">
      {/* Top Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3 bg-light p-3 rounded border">
        <div>
          <div className="d-flex align-items-center gap-2">
            <ShieldCheck className="text-primary" size={24} />
            <h4 className="fw-bold text-dark mb-0">Clinical Admin Management Dashboard</h4>
          </div>
          <span className="text-muted extra-small">Authenticated Session Active | Supabase Cloud Database</span>
        </div>

        <div className="d-flex align-items-center gap-2">
          <button type="button" className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1" onClick={fetchAdminRecords}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button type="button" className="btn btn-success btn-sm d-flex align-items-center gap-1 fw-bold" onClick={exportCSV}>
            <FileSpreadsheet size={14} /> Export CSV
          </button>
          <button type="button" className="btn btn-outline-danger btn-sm d-flex align-items-center gap-1" onClick={handleLogout}>
            <LogOut size={14} /> Logout
          </button>
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onBackToHome}>
            <ArrowLeft size={14} /> Home
          </button>
        </div>
      </div>

      {/* Analytical Metrics Summary Cards */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-md-4">
          <div className="card border-0 shadow-sm p-3 bg-primary text-white">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <span className="extra-small text-white-50 text-uppercase fw-bold d-block">Total Assessments Logged</span>
                <h2 className="fw-bold mb-0 font-monospace">{totalAssessments}</h2>
              </div>
              <Users size={32} className="opacity-75" />
            </div>
          </div>
        </div>

        <div className="col-12 col-md-4">
          <div className="card border-0 shadow-sm p-3 bg-success text-white">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <span className="extra-small text-white-50 text-uppercase fw-bold d-block">Normal Acuity / Unimpaired</span>
                <h2 className="fw-bold mb-0 font-monospace">{normalCount}</h2>
              </div>
              <CheckCircle2 size={32} className="opacity-75" />
            </div>
          </div>
        </div>

        <div className="col-12 col-md-4">
          <div className="card border-0 shadow-sm p-3 bg-warning text-dark">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <span className="extra-small text-dark-50 text-uppercase fw-bold d-block">Clinical Deficits Identified</span>
                <h2 className="fw-bold mb-0 font-monospace">{deficitCount}</h2>
              </div>
              <AlertTriangle size={32} className="opacity-75" />
            </div>
          </div>
        </div>
      </div>

      {/* Search Filter Bar */}
      <div className="card border-0 shadow-sm p-3 bg-light mb-4">
        <div className="input-group">
          <span className="input-group-text bg-white border-end-0">
            <Search size={18} className="text-muted" />
          </span>
          <input 
            type="text" 
            className="form-control border-start-0 ps-0" 
            placeholder="Search by test module, diagnosis keyword, eye configuration, or record ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Records Data Table */}
      {isLoadingRecords ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary mb-2" role="status"></div>
          <p className="text-muted small">Retrieving records from Supabase cloud...</p>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="text-center py-5 bg-light rounded border">
          <h6 className="fw-bold text-dark">No Diagnostic Records Found</h6>
          <p className="text-muted small mb-0">No patient entries match your search filter.</p>
        </div>
      ) : (
        <div className="table-responsive bg-white rounded border shadow-sm">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light extra-small text-uppercase">
              <tr>
                <th>ID</th>
                <th>Timestamp</th>
                <th>Module</th>
                <th>Eye</th>
                <th>Score</th>
                <th>Diagnosis / Classification</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody className="small">
              {filteredRecords.map((r) => (
                <tr key={r.id}>
                  <td className="fw-bold font-monospace extra-small">#{r.id}</td>
                  <td className="text-muted extra-small">{new Date(r.date).toLocaleString()}</td>
                  <td>
                    <span className="badge bg-primary-subtle text-primary fw-bold">{r.testName}</span>
                  </td>
                  <td>
                    <span className="badge bg-secondary">{r.eyeTested}</span>
                  </td>
                  <td className="fw-bold font-monospace">{r.score}</td>
                  <td>
                    <span className={`fw-semibold ${r.severity === 'normal' ? 'text-success' : 'text-danger'}`}>
                      {r.diagnosis}
                    </span>
                  </td>
                  <td className="text-end">
                    <button 
                      type="button" 
                      className="btn btn-outline-danger btn-sm p-1"
                      title="Delete Record"
                      onClick={() => handleDeleteRecord(r.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}