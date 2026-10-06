import React, { useState, useEffect } from 'react';
import { Settings, Save, RotateCcw, AlertTriangle, CheckCircle2, Shield } from 'lucide-react';
import { DEFAULT_SETTINGS } from '../utils/compliance';

export default function SettingsView({ currentSettings, onSaveSettings, isFirebaseActive }) {
  const [phMin, setPhMin] = useState(currentSettings?.phMin ?? DEFAULT_SETTINGS.phMin);
  const [phMax, setPhMax] = useState(currentSettings?.phMax ?? DEFAULT_SETTINGS.phMax);
  const [turbidityMax, setTurbidityMax] = useState(
    currentSettings?.turbidityMax ?? DEFAULT_SETTINGS.turbidityMax
  );
  const [saveStatus, setSaveStatus] = useState(null); // 'saved' | 'error' | null
  const [errorMessage, setErrorMessage] = useState('');

  // Keep in sync with parent updates if settings change externally
  useEffect(() => {
    if (currentSettings) {
      setPhMin(currentSettings.phMin ?? DEFAULT_SETTINGS.phMin);
      setPhMax(currentSettings.phMax ?? DEFAULT_SETTINGS.phMax);
      setTurbidityMax(currentSettings.turbidityMax ?? DEFAULT_SETTINGS.turbidityMax);
    }
  }, [currentSettings]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaveStatus(null);
    setErrorMessage('');

    const min = parseFloat(phMin);
    const max = parseFloat(phMax);
    const turb = parseFloat(turbidityMax);

    // Validation
    if (isNaN(min) || min < 0 || min > 14) {
      setErrorMessage('pH Minimum must be a number between 0.0 and 14.0.');
      return;
    }
    if (isNaN(max) || max < 0 || max > 14) {
      setErrorMessage('pH Maximum must be a number between 0.0 and 14.0.');
      return;
    }
    if (min >= max) {
      setErrorMessage('pH Minimum must be strictly less than pH Maximum.');
      return;
    }
    if (isNaN(turb) || turb <= 0) {
      setErrorMessage('Turbidity Maximum must be greater than 0 NTU.');
      return;
    }

    try {
      await onSaveSettings({
        phMin: min,
        phMax: max,
        turbidityMax: turb
      });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(null), 4000);
    } catch (err) {
      setSaveStatus('error');
      setErrorMessage(err.message || 'Failed to persist settings.');
    }
  };

  const handleResetDefaults = () => {
    setPhMin(DEFAULT_SETTINGS.phMin);
    setPhMax(DEFAULT_SETTINGS.phMax);
    setTurbidityMax(DEFAULT_SETTINGS.turbidityMax);
    setErrorMessage('');
  };

  return (
    <div className="view-container settings-view">
      <div className="view-header-strip">
        <div>
          <h2 className="view-heading">PROJECT CONFIGURED THRESHOLDS</h2>
          <p className="view-subtext">
            Configure laboratory prototype limits for real-time compliance evaluation & valve interlock
          </p>
        </div>
      </div>

      {/* Critical Academic Notice Box */}
      <div className="academic-disclaimer-box">
        <AlertTriangle size={20} className="disclaimer-icon" />
        <div>
          <h4 className="disclaimer-title">IMPORTANT PROJECT LIMIT SPECIFICATION</h4>
          <p className="disclaimer-text">
            These thresholds are <strong>PROJECT CONFIGURED LIMITS</strong> designed for this prototype
            demonstration. They do not constitute universal statutory discharge limits. Changing these
            parameters immediately updates compliance calculations and solenoid interlock logic across
            the entire dashboard in real time.
          </p>
        </div>
      </div>

      <div className="settings-grid">
        {/* Settings Form */}
        <div className="industrial-card settings-form-card">
          <div className="card-header-row">
            <div className="card-title-group">
              <div className="sensor-icon-avatar avatar-settings">
                <Settings size={20} />
              </div>
              <div>
                <span className="card-kicker">PARAMETER DEFINITIONS</span>
                <h3 className="card-title">Threshold Limits</h3>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="settings-form">
            <div className="form-group">
              <label htmlFor="ph-min">
                <span>Minimum Permitted pH (phMin):</span>
                <span className="unit-hint">Range: 0.0 – 14.0</span>
              </label>
              <div className="input-with-addon">
                <input
                  id="ph-min"
                  type="number"
                  step="0.1"
                  min="0"
                  max="14"
                  value={phMin}
                  onChange={(e) => setPhMin(e.target.value)}
                  className="industrial-input"
                  required
                />
                <span className="input-addon">pH</span>
              </div>
              <span className="field-hint">Default: 6.0 pH</span>
            </div>

            <div className="form-group">
              <label htmlFor="ph-max">
                <span>Maximum Permitted pH (phMax):</span>
                <span className="unit-hint">Range: 0.0 – 14.0</span>
              </label>
              <div className="input-with-addon">
                <input
                  id="ph-max"
                  type="number"
                  step="0.1"
                  min="0"
                  max="14"
                  value={phMax}
                  onChange={(e) => setPhMax(e.target.value)}
                  className="industrial-input"
                  required
                />
                <span className="input-addon">pH</span>
              </div>
              <span className="field-hint">Default: 9.0 pH</span>
            </div>

            <div className="form-group">
              <label htmlFor="turb-max">
                <span>Maximum Permitted Turbidity (turbidityMax):</span>
                <span className="unit-hint">Nephelometric Turbidity Units</span>
              </label>
              <div className="input-with-addon">
                <input
                  id="turb-max"
                  type="number"
                  step="1"
                  min="1"
                  max="500"
                  value={turbidityMax}
                  onChange={(e) => setTurbidityMax(e.target.value)}
                  className="industrial-input"
                  required
                />
                <span className="input-addon">NTU</span>
              </div>
              <span className="field-hint">Default: 50.0 NTU</span>
            </div>

            {errorMessage && (
              <div className="form-feedback-msg error">
                <AlertTriangle size={15} />
                <span>{errorMessage}</span>
              </div>
            )}

            {saveStatus === 'saved' && (
              <div className="form-feedback-msg success">
                <CheckCircle2 size={15} />
                <span>Settings successfully saved and applied to compliance engine!</span>
              </div>
            )}

            <div className="form-action-buttons">
              <button type="submit" className="save-settings-btn">
                <Save size={16} />
                <span>Save Limits to Firebase</span>
              </button>

              <button
                type="button"
                onClick={handleResetDefaults}
                className="reset-defaults-btn"
              >
                <RotateCcw size={16} />
                <span>Reset to Defaults</span>
              </button>
            </div>
          </form>
        </div>

        {/* Real-Time Logic Explanation Card */}
        <div className="industrial-card rule-explanation-card">
          <div className="card-header-row">
            <div className="card-title-group">
              <div className="sensor-icon-avatar avatar-rule">
                <Shield size={20} />
              </div>
              <div>
                <span className="card-kicker">CONTROL SPECIFICATION</span>
                <h3 className="card-title">Interlock Decision Matrix</h3>
              </div>
            </div>
          </div>

          <div className="rule-content-box">
            <div className="formula-block">
              <code>
                IF (pH ≥ {phMin} AND pH ≤ {phMax} AND Turbidity ≤ {turbidityMax})
                <br />
                &nbsp;&nbsp;→ COMPLIANT (Valve: OPEN)
                <br />
                ELSE
                <br />
                &nbsp;&nbsp;→ NON-COMPLIANT (Valve: CLOSED)
              </code>
            </div>

            <h5 className="sub-heading-sm">Fail-Safe Principles:</h5>
            <ul className="safety-bullets">
              <li>
                <strong>Zero Leakage Guarantee:</strong> The web UI and actuator will never permit
                <code>NON-COMPLIANT + VALVE OPEN</code>.
              </li>
              <li>
                <strong>Probe Disconnect Protection:</strong> If either sensor value is null or invalid,
                the system defaults to immediate emergency valve closure.
              </li>
              <li>
                <strong>Cloud Synchronization:</strong> Updated limits are pushed to{' '}
                <code>/effluentMonitor/settings</code> so connected microcontrollers receive the new
                threshold parameters automatically.
              </li>
            </ul>

            <div className="settings-storage-target">
              <span className="storage-label">Database Target:</span>
              <span className="storage-path">
                {isFirebaseActive ? 'Firebase RTDB: /effluentMonitor/settings' : 'Active Local Memory State'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
