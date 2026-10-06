import React, { useState } from 'react';
import {
  Play,
  RotateCcw,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Sliders,
  SlidersHorizontal,
  Zap,
  WifiOff,
  Radio
} from 'lucide-react';

export default function SimulationPanel({
  onInjectReading,
  isAutoSimulating,
  setIsAutoSimulating,
  isFirebaseActive
}) {
  const [customPh, setCustomPh] = useState(7.2);
  const [customTurbidity, setCustomTurbidity] = useState(18.0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Preset triggers
  const handlePreset = async (presetType) => {
    setIsSubmitting(true);
    try {
      switch (presetType) {
        case 'NORMAL':
          await onInjectReading(7.2, 18.0, 'SIMULATION');
          break;
        case 'PH_FAULT':
          await onInjectReading(4.8, 18.0, 'SIMULATION');
          break;
        case 'TURB_FAULT':
          await onInjectReading(7.2, 72.0, 'SIMULATION');
          break;
        case 'BOTH_FAULT':
          await onInjectReading(4.8, 72.0, 'SIMULATION');
          break;
        case 'SENSOR_DISCONNECT':
          await onInjectReading(null, null, 'SIMULATION');
          break;
        default:
          break;
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCustomSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onInjectReading(Number(customPh), Number(customTurbidity), 'SIMULATION');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="industrial-card simulation-panel-card">
      <div className="card-header-row">
        <div className="card-title-group">
          <div className="sensor-icon-avatar avatar-sim">
            <Radio size={20} />
          </div>
          <div>
            <div className="simulation-badge-banner">SIMULATION MODE (TEST ENGINE)</div>
            <h3 className="card-title">Telemetry Signal Generator</h3>
          </div>
        </div>

        <div className="auto-sim-toggle-group">
          <span className="auto-sim-label">Continuous Live Ticker:</span>
          <button
            type="button"
            className={`toggle-switch-btn ${isAutoSimulating ? 'active-sim' : ''}`}
            onClick={() => setIsAutoSimulating(!isAutoSimulating)}
            title="Automatically generates drifting test readings every 3.5s"
          >
            <span className="toggle-switch-knob" />
            <span className="toggle-switch-text">
              {isAutoSimulating ? 'STREAMING ACTIVE' : 'STOPPED'}
            </span>
          </button>
        </div>
      </div>

      <div className="simulation-notice-banner">
        <AlertTriangle size={15} />
        <span>
          <strong>SIMULATION MODE:</strong> Physical ESP32 sensors not connected. Values generated below
          are test data written to <code>/effluentMonitor/current</code> with <code>mode = "SIMULATION"</code>.
        </span>
      </div>

      {/* Preset Action Buttons requested by user */}
      <div className="sim-presets-grid">
        <button
          type="button"
          disabled={isSubmitting}
          className="sim-btn sim-btn-normal"
          onClick={() => handlePreset('NORMAL')}
        >
          <CheckCircle2 size={16} />
          <div className="sim-btn-text">
            <strong>[Normal Condition]</strong>
            <span>pH: 7.20 | Turbidity: 18.0 NTU</span>
          </div>
        </button>

        <button
          type="button"
          disabled={isSubmitting}
          className="sim-btn sim-btn-warning"
          onClick={() => handlePreset('PH_FAULT')}
        >
          <AlertTriangle size={16} />
          <div className="sim-btn-text">
            <strong>[Simulate pH Fault]</strong>
            <span>pH: 4.80 | Turbidity: 18.0 NTU</span>
          </div>
        </button>

        <button
          type="button"
          disabled={isSubmitting}
          className="sim-btn sim-btn-warning"
          onClick={() => handlePreset('TURB_FAULT')}
        >
          <Flame size={16} />
          <div className="sim-btn-text">
            <strong>[Simulate Turbidity Fault]</strong>
            <span>pH: 7.20 | Turbidity: 72.0 NTU</span>
          </div>
        </button>

        <button
          type="button"
          disabled={isSubmitting}
          className="sim-btn sim-btn-danger"
          onClick={() => handlePreset('BOTH_FAULT')}
        >
          <Zap size={16} />
          <div className="sim-btn-text">
            <strong>[Simulate Both Faults]</strong>
            <span>pH: 4.80 | Turbidity: 72.0 NTU</span>
          </div>
        </button>
      </div>

      {/* Manual Custom Sliders / Edge Case Form */}
      <div className="custom-injection-section">
        <div className="section-title-sm">
          <SlidersHorizontal size={14} />
          <span>Manual Parameter Injection (Test Boundary Thresholds)</span>
        </div>

        <form onSubmit={handleCustomSubmit} className="custom-injection-form">
          <div className="input-group-row">
            <div className="slider-control">
              <label htmlFor="custom-ph">
                Custom pH Value: <strong className="mono">{Number(customPh).toFixed(2)}</strong>
              </label>
              <input
                id="custom-ph"
                type="range"
                min="0"
                max="14"
                step="0.05"
                value={customPh}
                onChange={(e) => setCustomPh(parseFloat(e.target.value))}
                className="range-slider"
              />
              <div className="slider-endpoints">
                <span>0.0 (Acid)</span>
                <span>7.0 (Neutral)</span>
                <span>14.0 (Base)</span>
              </div>
            </div>

            <div className="slider-control">
              <label htmlFor="custom-turb">
                Custom Turbidity: <strong className="mono">{Number(customTurbidity).toFixed(1)} NTU</strong>
              </label>
              <input
                id="custom-turb"
                type="range"
                min="0"
                max="120"
                step="0.5"
                value={customTurbidity}
                onChange={(e) => setCustomTurbidity(parseFloat(e.target.value))}
                className="range-slider range-turb"
              />
              <div className="slider-endpoints">
                <span>0 NTU (Clear)</span>
                <span>50 NTU (Limit)</span>
                <span>120 NTU (Muddy)</span>
              </div>
            </div>
          </div>

          <div className="custom-submit-actions">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inject-btn"
            >
              <Play size={14} />
              <span>Inject Custom Telemetry</span>
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              className="disconnect-test-btn"
              onClick={() => handlePreset('SENSOR_DISCONNECT')}
              title="Test behavior when sensors fail or send null"
            >
              <WifiOff size={14} />
              <span>Simulate Missing / Faulty Sensor</span>
            </button>
          </div>
        </form>
      </div>

      <div className="card-footer-info">
        <span className="info-label">Destination Node:</span>
        <span className="info-val-badge">
          {isFirebaseActive ? 'Firebase RTDB (/effluentMonitor/current)' : 'Active Memory Session'}
        </span>
      </div>
    </div>
  );
}
