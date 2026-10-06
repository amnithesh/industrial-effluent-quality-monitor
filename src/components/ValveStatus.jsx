import React from 'react';
import { ToggleLeft, ToggleRight, Lock, Unlock, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function ValveStatus({ evaluation, reportedValve }) {
  // Enforce central safety logic:
  // If evaluated as NON-COMPLIANT, calculated valve MUST be CLOSED.
  // The UI must NEVER display NON-COMPLIANT + VALVE OPEN.
  const calculatedValve = evaluation?.valve || 'CLOSED';
  const isCompliant = evaluation?.isCompliant === true;

  // Final enforced valve state shown on dashboard
  const displayValveState = isCompliant ? (reportedValve === 'OPEN' ? 'OPEN' : 'OPEN') : 'CLOSED';
  const isOpen = displayValveState === 'OPEN';

  // Check if controller reported a conflict (e.g., if ESP32 reported OPEN during non-compliance)
  const hasHardwareMismatch = !isCompliant && reportedValve === 'OPEN';

  return (
    <div
      className={`industrial-card valve-card ${
        isOpen ? 'card-status-normal' : 'card-status-alert'
      }`}
    >
      <div className="card-header-row">
        <div className="card-title-group">
          <div className={`sensor-icon-avatar ${isOpen ? 'avatar-open' : 'avatar-closed'}`}>
            {isOpen ? <Unlock size={20} /> : <Lock size={20} />}
          </div>
          <div>
            <span className="card-kicker">SOLENOID ACTUATOR</span>
            <h3 className="card-title">DISCHARGE VALVE</h3>
          </div>
        </div>

        <div className={`status-tag ${isOpen ? 'badge-success' : 'badge-danger'}`}>
          <span>{isOpen ? 'VALVE ACTIVE' : 'FAIL-SAFE LOCKED'}</span>
        </div>
      </div>

      <div className="card-metric-container">
        <div className="valve-display-box">
          <div className="valve-state-indicator">
            <span className={`valve-state-badge ${isOpen ? 'state-open' : 'state-closed'}`}>
              {displayValveState}
            </span>
          </div>

          <div className="pipe-schematic">
            <div className={`pipe-flow ${isOpen ? 'flow-active' : 'flow-stopped'}`}>
              <div className="pipe-line left-pipe"></div>
              <div className={`valve-body ${isOpen ? 'body-open' : 'body-closed'}`}>
                {isOpen ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
              </div>
              <div className="pipe-line right-pipe"></div>
            </div>
            <div className="pipe-caption">
              {isOpen ? 'Effluent Discharge Stream Flowing' : 'Effluent Discharge Stream Blocked'}
            </div>
          </div>
        </div>
      </div>

      {/* Safety Logic Explanation & Controller Status */}
      <div className="valve-meta-panel">
        <div className="meta-row">
          <span className="meta-lbl">Calculated Logic:</span>
          <span className={`meta-val ${isOpen ? 'text-green' : 'text-red'}`}>
            {isOpen ? 'OPEN (Water Quality Compliant)' : 'CLOSED (Interlock Tripped)'}
          </span>
        </div>

        <div className="meta-row">
          <span className="meta-lbl">Hardware Report:</span>
          <span className="meta-val mono">
            {reportedValve ? `Reported: ${reportedValve}` : 'Synced with Telemetry'}
          </span>
        </div>

        {hasHardwareMismatch && (
          <div className="valve-warning-callout">
            <AlertTriangle size={14} />
            <span>
              Safety Override: Telemetry is Non-Compliant. Display enforces CLOSED state.
            </span>
          </div>
        )}
      </div>

      <div className="card-footer-info">
        <div className="info-item">
          <span className="info-label">Fail-Safe State:</span>
          <span className="info-val-badge">Normally Closed (NC) Solenoid</span>
        </div>
      </div>
    </div>
  );
}
