import React, { useState } from 'react';
import { 
  History, 
  Search, 
  Filter, 
  Eye, 
  Calendar, 
  User, 
  ChevronRight, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  FileText,
  Download
} from 'lucide-react';
import PatientResultModal from './PatientResultModal';

export default function TestHistoryDashboard({ records = [] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [selectedResult, setSelectedResult] = useState(null);

  // Filter records based on search term and assessment modality
  const filteredRecords = records.filter((record) => {
    const matchesSearch = 
      record.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = 
      filterType === 'ALL' || record.testType === filterType;

    return matchesSearch && matchesFilter;
  });

  // Severity badge helper
  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'normal':
        return (
          <span className="badge bg-success-subtle text-success border border-success-subtle d-inline-flex align-items-center gap-1">
            <CheckCircle2 size={12} /> Normal
          </span>
        );
      case 'moderate':
        return (
          <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle d-inline-flex align-items-center gap-1">
            <AlertTriangle size={12} /> Moderate
          </span>
        );
      case 'action_required':
        return (
          <span className="badge bg-danger-subtle text-danger border border-danger-subtle d-inline-flex align-items-center gap-1">
            <XCircle size={12} /> Review Needed
          </span>
        );
      default:
        return null;
    }
  };

  // Export filtered records to CSV
  const exportToCSV = () => {
    if (filteredRecords.length === 0) return;

    const headers = ['Record ID', 'Patient Name', 'Date', 'Test Type', 'Eye Tested', 'Score', 'Severity'];
    const rows = filteredRecords.map((r) => [
      `"${r.id}"`,
      `"${r.patientName}"`,
      `"${r.date}"`,
      `"${r.testType}"`,
      `"${r.eyeTested}"`,
      `"${r.score}"`,
      `"${r.severity}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `OptiCheck_History_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export filtered records to JSON
  const exportToJSON = () => {
    if (filteredRecords.length === 0) return;

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(filteredRecords, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `OptiCheck_History_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="card shadow-sm border-0 my-3">
      <div className="card-body p-4">
        
        {/* Dashboard Header */}
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4 pb-3 border-bottom">
          <div>
            <h4 className="fw-bold mb-1 d-flex align-items-center gap-2">
              <History className="text-primary" size={24} /> Assessment History
            </h4>
            <p className="text-muted small mb-0">
              Select any patient record to review clinical findings, functional impact, and export PDF reports.
            </p>
          </div>
          
          <div className="d-flex align-items-center gap-2">
            {/* Bulk Export Actions */}
            <div className="dropdown">
              <button
                className="btn btn-sm btn-outline-secondary dropdown-toggle d-inline-flex align-items-center gap-1"
                type="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
                disabled={filteredRecords.length === 0}
              >
                <Download size={14} /> Export Data
              </button>
              <ul className="dropdown-menu dropdown-menu-end shadow-sm">
                <li>
                  <button className="dropdown-item small" onClick={exportToCSV}>
                    Export as CSV
                  </button>
                </li>
                <li>
                  <button className="dropdown-item small" onClick={exportToJSON}>
                    Export as JSON
                  </button>
                </li>
              </ul>
            </div>

            <div className="text-muted small bg-light px-3 py-1.5 rounded border">
              Total Records: <strong>{filteredRecords.length}</strong>
            </div>
          </div>
        </div>

        {/* Filter & Search Controls */}
        <div className="row g-3 mb-4">
          <div className="col-12 col-md-7">
            <div className="input-group">
              <span className="input-group-text bg-white text-muted border-end-0">
                <Search size={18} />
              </span>
              <input
                type="text"
                className="form-control border-start-0 ps-0"
                placeholder="Search by patient name or record ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="col-12 col-md-5">
            <div className="input-group">
              <span className="input-group-text bg-white text-muted border-end-0">
                <Filter size={18} />
              </span>
              <select
                className="form-select border-start-0 ps-0"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="ALL">All Test Types</option>
                <option value="SNELLEN">Snellen Chart</option>
                <option value="TUMBLING_E">Tumbling E</option>
                <option value="ISHIHARA">Ishihara Color</option>
                <option value="AMSLER_GRID">Amsler Grid</option>
              </select>
            </div>
          </div>
        </div>

        {/* Assessment Records Table */}
        {filteredRecords.length === 0 ? (
          <div className="text-center py-5 bg-light rounded border border-dashed">
            <FileText className="text-muted mb-2" size={32} />
            <p className="fw-semibold text-secondary mb-0">No assessment records found matching your filters.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle border mb-0">
              <thead className="table-light extra-small text-uppercase text-muted">
                <tr>
                  <th scope="col" className="ps-3">Patient</th>
                  <th scope="col">Date</th>
                  <th scope="col">Modality</th>
                  <th scope="col">Eye</th>
                  <th scope="col">Result / Score</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="text-end pe-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((record) => (
                  <tr
                    key={record.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setSelectedResult(record)}
                  >
                    <td className="ps-3 fw-bold text-dark">
                      <div className="d-flex align-items-center gap-2">
                        <User size={16} className="text-primary" />
                        <div>
                          <div>{record.patientName}</div>
                          <div className="extra-small text-muted fw-normal">{record.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="small text-secondary">
                      <div className="d-flex align-items-center gap-1">
                        <Calendar size={14} /> {record.date}
                      </div>
                    </td>
                    <td className="small font-monospace">
                      {record.testType.replace('_', ' ')}
                    </td>
                    <td className="small text-muted">{record.eyeTested}</td>
                    <td className="fw-bold font-monospace text-dark">{record.score}</td>
                    <td>{getSeverityBadge(record.severity)}</td>
                    <td className="text-end pe-3">
                      <button
                        className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedResult(record);
                        }}
                      >
                        <Eye size={14} /> View <ChevronRight size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* Render PatientResultModal on click */}
      {selectedResult && (
        <PatientResultModal
          result={selectedResult}
          onClose={() => setSelectedResult(null)}
        />
      )}
    </div>
  );
}