import React, { useState } from 'react';
import {
  History,
  Download,
  Search,
  Filter,
  ShieldCheck,
  ShieldAlert,
  Unlock,
  Lock,
  FileSpreadsheet,
  Clock,
  AlertTriangle,
  Trash2
} from 'lucide-react';

export default function HistoryView({ history = [], onClearHistory }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCompliance, setFilterCompliance] = useState('ALL'); // 'ALL' | 'COMPLIANT' | 'CLOSED'

  const formatTimestamp = (ts) => {
    if (!ts) return 'Unknown';
    try {
      const d = new Date(ts);
      return (
        d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) +
        ' ' +
        d.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })
      );
    } catch {
      return String(ts);
    }
  };

  // Filter history records
  const filteredHistory = history.filter((item) => {
    // Compliance & Closed Valve filter
    if (filterCompliance === 'COMPLIANT') {
      if (item.compliance !== 'COMPLIANT') return false;
    } else if (filterCompliance === 'CLOSED') {
      if (item.valve !== 'CLOSED' && item.compliance !== 'NON-COMPLIANT') return false;
    }

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const timeStr = formatTimestamp(item.timestamp).toLowerCase();
      const phStr = item.ph !== undefined ? String(item.ph) : '';
      const turbStr = item.turbidity !== undefined ? String(item.turbidity) : '';
      const compStr = (item.compliance || '').toLowerCase();
      const valveStr = (item.valve || '').toLowerCase();

      return (
        timeStr.includes(term) ||
        phStr.includes(term) ||
        turbStr.includes(term) ||
        compStr.includes(term) ||
        valveStr.includes(term)
      );
    }

    return true;
  });

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredHistory.length === 0) {
      alert('No data to export.');
      return;
    }

    const headers = ['Timestamp_ISO', 'Formatted_Time', 'pH_Level', 'Turbidity_NTU', 'Compliance', 'Valve_Status', 'Mode'];
    const rows = filteredHistory.map((item) => [
      item.timestamp ? new Date(item.timestamp).toISOString() : '',
      `"${formatTimestamp(item.timestamp)}"`,
      item.ph !== undefined ? Number(item.ph).toFixed(2) : '',
      item.turbidity !== undefined ? Number(item.turbidity).toFixed(1) : '',
      `"${item.compliance || ''}"`,
      `"${item.valve || ''}"`,
      `"${item.mode || 'LIVE'}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `effluent_telemetry_history_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const closedCount = history.filter((h) => h.valve === 'CLOSED' || h.compliance === 'NON-COMPLIANT').length;

  return (
    <div className="view-container history-view">
      <div className="view-header-strip">
        <div>
          <h2 className="view-heading">EFFLUENT TELEMETRY ARCHIVE</h2>
          <p className="view-subtext">
            Historical sensor records, compliance auditing, and actuator state logs
          </p>
        </div>

        <div className="view-header-actions">
          <button
            type="button"
            onClick={handleExportCSV}
            className="export-csv-btn"
            disabled={filteredHistory.length === 0}
          >
            <FileSpreadsheet size={16} />
            <span>Export CSV ({filteredHistory.length})</span>
          </button>

          {history.length > 0 && onClearHistory && (
            <button
              type="button"
              onClick={onClearHistory}
              className="clear-history-action-btn"
              title="Clear old history records"
            >
              <Trash2 size={15} />
              <span>Clear History</span>
            </button>
          )}
        </div>
      </div>

      {/* Telemetry Logging Policy Banner */}
      <div className="history-policy-banner">
        <Clock size={15} />
        <span>
          <strong>Archive Policy:</strong> Routine compliant baseline logged <strong>once every 1 minute</strong>.
          Any <strong>CLOSED / NON-COMPLIANT</strong> fault condition is logged <strong>immediately</strong>.
        </span>
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-controls-bar">
        <div className="search-input-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search by time, pH, NTU, or status..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-dropdown-box">
          <Filter size={15} />
          <label htmlFor="comp-filter">Filter:</label>
          <select
            id="comp-filter"
            value={filterCompliance}
            onChange={(e) => setFilterCompliance(e.target.value)}
            className="filter-select"
          >
            <option value="ALL">All Records ({history.length})</option>
            <option value="CLOSED">CLOSED / Faults Only ({closedCount})</option>
            <option value="COMPLIANT">Compliant Only</option>
          </select>
        </div>
      </div>

      {/* History Data Table */}
      <div className="history-table-wrapper industrial-card">
        {filteredHistory.length === 0 ? (
          <div className="empty-history-box">
            <History size={36} className="empty-icon" />
            <div className="empty-title">No Historical Records Found</div>
            <p className="empty-sub">
              {searchTerm || filterCompliance !== 'ALL'
                ? 'No records match the current search or compliance filter.'
                : 'Sensor telemetry written to /effluentMonitor/history will be cataloged here.'}
            </p>
          </div>
        ) : (
          <table className="industrial-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Timestamp</th>
                <th>pH Value</th>
                <th>Turbidity</th>
                <th>Compliance Status</th>
                <th>Valve Actuation</th>
                <th>Mode</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.map((row, index) => {
                const isCompliant = row.compliance === 'COMPLIANT';
                const isOpen = row.valve === 'OPEN';
                return (
                  <tr key={`hist-${row.id || ''}-${row.timestamp || index}`} className={isCompliant ? 'row-compliant' : 'row-noncompliant'}>
                    <td className="mono text-muted">{filteredHistory.length - index}</td>
                    <td className="mono font-semibold">{formatTimestamp(row.timestamp)}</td>
                    <td className="mono font-bold">
                      {row.ph !== undefined && row.ph !== null ? Number(row.ph).toFixed(2) : '--'} pH
                    </td>
                    <td className="mono font-bold">
                      {row.turbidity !== undefined && row.turbidity !== null
                        ? `${Number(row.turbidity).toFixed(1)} NTU`
                        : '--'}
                    </td>
                    <td>
                      <span className={`event-badge ${isCompliant ? 'badge-comp-pass' : 'badge-comp-fail'}`}>
                        {isCompliant ? <ShieldCheck size={13} /> : <ShieldAlert size={13} />}
                        <span>{row.compliance || 'UNKNOWN'}</span>
                      </span>
                    </td>
                    <td>
                      <span className={`event-badge ${isOpen ? 'badge-valve-open' : 'badge-valve-closed'}`}>
                        {isOpen ? <Unlock size={13} /> : <Lock size={13} />}
                        <span>{isOpen ? 'OPEN' : 'CLOSED (INTERLOCK)'}</span>
                      </span>
                    </td>
                    <td>
                      <span className={`mode-tag ${row.mode === 'LIVE' ? 'mode-live' : 'mode-sim'}`}>
                        {row.mode || 'SIM'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
