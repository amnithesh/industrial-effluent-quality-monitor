import React from 'react';
import { Droplet, Waves, AlertOctagon, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function SensorCard({
  type = 'ph', // 'ph' | 'turbidity'
  value,
  status = 'NORMAL', // 'NORMAL' | 'OUT OF LIMIT' | 'HIGH' | 'DATA_UNAVAILABLE'
  settings,
  hasError = false
}) {
  const isPh = type === 'ph';
  const isMissing = value === null || value === undefined || isNaN(Number(value)) || hasError;

  const numVal = !isMissing ? Number(value) : null;

  // Format large value
  const displayValue = isMissing
    ? null
    : isPh
    ? numVal.toFixed(2)
    : numVal.toFixed(1);

  // Status badge logic
  const isNormal = status === 'NORMAL';
  const statusBadgeClass = isMissing
    ? 'badge-warning'
    : isNormal
    ? 'badge-success'
    : 'badge-danger';

  const statusLabel = isMissing
    ? isPh
      ? 'pH SENSOR DATA UNAVAILABLE'
      : 'TURBIDITY SENSOR DATA UNAVAILABLE'
    : status;

  // Gauge percentage calculation
  let gaugePercent = 0;
  if (!isMissing) {
    if (isPh) {
      // pH scale 0 to 14
      gaugePercent = Math.min(Math.max((numVal / 14) * 100, 0), 100);
    } else {
      // Turbidity scale 0 to 100 NTU nominal max for bar
      gaugePercent = Math.min(Math.max((numVal / 100) * 100, 0), 100);
    }
  }

  // Safe range zone markers
  const phMinPercent = (settings?.phMin / 14) * 100;
  const phMaxPercent = (settings?.phMax / 14) * 100;
  const turbLimitPercent = Math.min((settings?.turbidityMax / 100) * 100, 100);

  return (
    <div className={`industrial-card sensor-card ${isNormal ? 'card-status-normal' : isMissing ? 'card-status-warning' : 'card-status-alert'}`}>
      <div className="card-header-row">
        <div className="card-title-group">
          <div className={`sensor-icon-avatar ${isPh ? 'avatar-ph' : 'avatar-turb'}`}>
            {isPh ? <Droplet size={20} /> : <Waves size={20} />}
          </div>
          <div>
            <span className="card-kicker">REAL-TIME TELEMETRY</span>
            <h3 className="card-title">{isPh ? 'pH LEVEL' : 'TURBIDITY'}</h3>
          </div>
        </div>

        <div className={`status-tag ${statusBadgeClass}`}>
          {isMissing ? (
            <AlertTriangle size={13} />
          ) : isNormal ? (
            <CheckCircle2 size={13} />
          ) : (
            <AlertOctagon size={13} />
          )}
          <span>{statusLabel}</span>
        </div>
      </div>

      <div className="card-metric-container">
        {isMissing ? (
          <div className="sensor-unavailable-box">
            <AlertTriangle size={28} className="unavailable-icon" />
            <div className="unavailable-text">
              {isPh ? 'pH SENSOR DATA UNAVAILABLE' : 'TURBIDITY SENSOR DATA UNAVAILABLE'}
            </div>
            <span className="unavailable-sub">Check physical probe ADC channel or simulated stream</span>
          </div>
        ) : (
          <div className="metric-display">
            <span className="metric-value">{displayValue}</span>
            <span className="metric-unit">{isPh ? 'pH' : 'NTU'}</span>
          </div>
        )}
      </div>

      {/* Visual Industrial Gauge Bar */}
      <div className="gauge-container">
        <div className="gauge-track">
          {/* Target range marker */}
          {isPh ? (
            <div
              className="gauge-safe-zone"
              style={{
                left: `${phMinPercent}%`,
                width: `${phMaxPercent - phMinPercent}%`
              }}
              title={`Permitted Range: ${settings?.phMin} - ${settings?.phMax}`}
            />
          ) : (
            <div
              className="gauge-safe-zone"
              style={{
                left: '0%',
                width: `${turbLimitPercent}%`
              }}
              title={`Permitted Maximum: ≤ ${settings?.turbidityMax} NTU`}
            />
          )}

          {/* Current reading pointer */}
          {!isMissing && (
            <div
              className={`gauge-pointer ${isNormal ? 'pointer-normal' : 'pointer-alert'}`}
              style={{ left: `${gaugePercent}%` }}
            />
          )}
        </div>

        <div className="gauge-scale-labels">
          <span>{isPh ? '0 pH (Acidic)' : '0 NTU (Clear)'}</span>
          <span>{isPh ? '7.0 (Neutral)' : `${settings?.turbidityMax} NTU Limit`}</span>
          <span>{isPh ? '14 pH (Alkaline)' : '100+ NTU'}</span>
        </div>
      </div>

      {/* Configuration & Threshold Footer */}
      <div className="card-footer-info">
        <div className="info-item">
          <span className="info-label">{isPh ? 'Configured Range:' : 'Configured Limit:'}</span>
          <span className="info-val">
            {isPh
              ? `${settings?.phMin?.toFixed(1)} – ${settings?.phMax?.toFixed(1)} pH`
              : `≤ ${settings?.turbidityMax?.toFixed(1)} NTU`}
          </span>
        </div>
        <div className="info-item">
          <span className="info-label">Threshold Type:</span>
          <span className="info-val-badge">Prototype Limit</span>
        </div>
      </div>
    </div>
  );
}
