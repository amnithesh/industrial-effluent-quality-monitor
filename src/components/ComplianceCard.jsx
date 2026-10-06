import React from 'react';
import { ShieldCheck, ShieldAlert, Check, X, AlertTriangle } from 'lucide-react';

export default function ComplianceCard({ evaluation, settings }) {
  const isCompliant = evaluation?.isCompliant === true;
  const hasError = evaluation?.hasSensorError === true;

  return (
    <div
      className={`industrial-card compliance-card ${
        isCompliant ? 'card-status-normal' : hasError ? 'card-status-warning' : 'card-status-alert'
      }`}
    >
      <div className="card-header-row">
        <div className="card-title-group">
          <div className={`sensor-icon-avatar ${isCompliant ? 'avatar-safe' : 'avatar-danger'}`}>
            {isCompliant ? <ShieldCheck size={20} /> : <ShieldAlert size={20} />}
          </div>
          <div>
            <span className="card-kicker">AUTOMATED EVALUATION</span>
            <h3 className="card-title">DISCHARGE COMPLIANCE</h3>
          </div>
        </div>

        <div className={`status-tag ${isCompliant ? 'badge-success' : 'badge-danger'}`}>
          <span>{isCompliant ? 'PASS' : 'FAIL / INTERLOCK'}</span>
        </div>
      </div>

      <div className="card-metric-container">
        <div className="compliance-main-display">
          <div className={`compliance-status-text ${isCompliant ? 'text-compliant' : 'text-noncompliant'}`}>
            {hasError ? 'NON-COMPLIANT (ERROR)' : evaluation?.compliance || 'EVALUATING...'}
          </div>
          <p className="compliance-description">
            {isCompliant
              ? 'All monitored parameters are within safe project-configured limits.'
              : hasError
              ? 'Sensor stream is interrupted. Discharge safety interlock engaged.'
              : 'Effluent violates quality standards. Automated valve closure enforced.'}
          </p>
        </div>
      </div>

      {/* Compliance Rule Checklist */}
      <div className="compliance-checklist">
        <div className="checklist-item">
          <div className={`check-icon ${evaluation?.statusPh === 'NORMAL' ? 'icon-pass' : 'icon-fail'}`}>
            {evaluation?.statusPh === 'NORMAL' ? <Check size={14} /> : <X size={14} />}
          </div>
          <div className="checklist-text">
            <span className="check-title">pH Criteria: [{settings?.phMin} - {settings?.phMax}]</span>
            <span className="check-sub">
              {evaluation?.statusPh === 'NORMAL' ? 'Within Range' : evaluation?.statusPh || 'Violated'}
            </span>
          </div>
        </div>

        <div className="checklist-item">
          <div className={`check-icon ${evaluation?.statusTurbidity === 'NORMAL' ? 'icon-pass' : 'icon-fail'}`}>
            {evaluation?.statusTurbidity === 'NORMAL' ? <Check size={14} /> : <X size={14} />}
          </div>
          <div className="checklist-text">
            <span className="check-title">Turbidity Criteria: ≤ {settings?.turbidityMax} NTU</span>
            <span className="check-sub">
              {evaluation?.statusTurbidity === 'NORMAL' ? 'Within Limit' : evaluation?.statusTurbidity || 'Violated'}
            </span>
          </div>
        </div>
      </div>

      {/* Footer Note */}
      <div className="card-footer-info">
        <div className="info-item">
          <span className="info-label">Interlock Logic:</span>
          <span className="info-val-badge">
            {isCompliant ? 'Discharge Permitted' : 'Automatic Shutoff'}
          </span>
        </div>
      </div>
    </div>
  );
}
