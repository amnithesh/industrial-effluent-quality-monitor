import React, { useState } from 'react';
import {
  Bell,
  AlertTriangle,
  AlertOctagon,
  Info,
  CheckCheck,
  Filter,
  Trash2
} from 'lucide-react';

export default function AlertPanel({ alerts = [], onClearAlerts }) {
  const [filterSeverity, setFilterSeverity] = useState('ALL');

  const filteredAlerts = alerts.filter((alert) => {
    if (filterSeverity === 'ALL') return true;
    return alert.severity === filterSeverity;
  });

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'CRITICAL':
        return {
          icon: <AlertOctagon size={14} />,
          badgeClass: 'badge-danger',
          label: 'CRITICAL'
        };
      case 'WARNING':
        return {
          icon: <AlertTriangle size={14} />,
          badgeClass: 'badge-warning',
          label: 'WARNING'
        };
      case 'INFO':
      default:
        return {
          icon: <Info size={14} />,
          badgeClass: 'badge-info',
          label: 'INFO'
        };
    }
  };

  const formatTimestamp = (ts) => {
    if (!ts) return 'Just now';
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return String(ts);
    }
  };

  const criticalCount = alerts.filter((a) => a.severity === 'CRITICAL').length;
  const warningCount = alerts.filter((a) => a.severity === 'WARNING').length;

  return (
    <div className="industrial-card alert-panel-card">
      <div className="card-header-row">
        <div className="card-title-group">
          <div className="sensor-icon-avatar avatar-alert">
            <Bell size={20} />
          </div>
          <div>
            <div className="card-kicker">SCADA ALARM LOG</div>
            <h3 className="card-title">Alert & Interlock Events</h3>
          </div>
        </div>

        <div className="alert-header-actions">
          {/* Severity Counters */}
          <div className="alarm-summary-pills">
            {criticalCount > 0 && (
              <span className="summary-pill pill-critical">
                <AlertOctagon size={12} /> {criticalCount} Critical
              </span>
            )}
            {warningCount > 0 && (
              <span className="summary-pill pill-warning">
                <AlertTriangle size={12} /> {warningCount} Warn
              </span>
            )}
          </div>

          {/* Filter dropdown */}
          <select
            className="industrial-select"
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            aria-label="Filter alerts by severity"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical Only</option>
            <option value="WARNING">Warnings Only</option>
            <option value="INFO">Info Only</option>
          </select>

          {alerts.length > 0 && onClearAlerts && (
            <button
              type="button"
              className="clear-alerts-btn"
              onClick={onClearAlerts}
              title="Clear Alert History"
            >
              <Trash2 size={13} />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      <div className="alerts-list-container">
        {filteredAlerts.length === 0 ? (
          <div className="empty-alerts-box">
            <CheckCheck size={28} className="text-green-icon" />
            <div className="empty-alert-msg">No active alarms or security interlocks.</div>
            <div className="empty-alert-sub">All monitored effluent parameters are within nominal thresholds.</div>
          </div>
        ) : (
          <div className="alert-items-stream">
            {filteredAlerts.map((alert, idx) => {
              const { icon, badgeClass, label } = getSeverityBadge(alert.severity);
              return (
                <div key={alert.id || idx} className={`alert-row severity-${(alert.severity || 'info').toLowerCase()}`}>
                  <div className="alert-meta-col">
                    <span className={`alert-severity-badge ${badgeClass}`}>
                      {icon}
                      <span>{label}</span>
                    </span>
                    <span className="alert-timestamp mono">{formatTimestamp(alert.timestamp)}</span>
                  </div>

                  <div className="alert-body-col">
                    <div className="alert-primary-msg">{alert.message}</div>
                    {alert.type && <div className="alert-type-code">Code: {alert.type}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="card-footer-info">
        <span className="info-label">Active Monitoring Policy:</span>
        <span className="info-val-badge">State Transition De-duplication Enabled</span>
      </div>
    </div>
  );
}
