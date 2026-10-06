import React from 'react';
import {
  Activity,
  Wifi,
  WifiOff,
  Cpu,
  Clock,
  LayoutDashboard,
  History,
  Settings,
  Terminal,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';

export default function Header({
  systemOnline,
  isFirebaseActive,
  dataSource,
  controller = 'ESP32',
  lastUpdate,
  activeTab,
  setActiveTab,
  complianceState
}) {
  const [liveClock, setLiveClock] = React.useState(new Date());

  React.useEffect(() => {
    const timer = setInterval(() => {
      setLiveClock(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatPacketTime = (ts) => {
    if (!ts) return 'Waiting for data...';
    try {
      const d = new Date(ts);
      if (isNaN(d.getTime())) return String(ts);
      return (
        d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) +
        ' ' +
        d.toLocaleDateString([], { day: '2-digit', month: 'short' })
      );
    } catch {
      return 'Invalid time';
    }
  };

  const getRelativeAge = (ts) => {
    if (!ts) return '';
    const diffSec = Math.max(0, Math.floor((liveClock.getTime() - Number(ts)) / 1000));
    if (diffSec < 5) return 'Just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    return `${diffHours}h ago`;
  };

  return (
    <header className="industrial-header">
      {/* Top Banner with Brand and Telemetry Meta */}
      <div className="header-top">
        <div className="header-branding">
          <div className="brand-icon-box">
            <Activity className="brand-icon" size={26} />
          </div>
          <div>
            <div className="project-tag">COLLEGE ENGINEERING CAPSTONE PROTOTYPE</div>
            <h1 className="header-title">INDUSTRIAL EFFLUENT QUALITY MONITOR</h1>
            <p className="header-subtitle">
              Real-Time Effluent Monitoring & Automatic Discharge Control
            </p>
          </div>
        </div>

        {/* SCADA Status Panel */}
        <div className="scada-telemetry-panel">
          {/* Status Indicator */}
          <div className="scada-stat-box">
            <span className="stat-label">SYSTEM STATUS</span>
            <div className={`status-pill ${systemOnline ? 'status-online' : 'status-offline'}`}>
              <span className="status-dot"></span>
              <span className="status-text">{systemOnline ? 'ONLINE' : 'OFFLINE'}</span>
            </div>
          </div>

          {/* Data Source Indicator */}
          <div className="scada-stat-box">
            <span className="stat-label">DATA SOURCE</span>
            <div className={`source-pill ${dataSource === 'LIVE FIREBASE' ? 'source-firebase' : 'source-sim'}`}>
              {isFirebaseActive ? (
                <Wifi size={14} className="icon-pulse" />
              ) : (
                <WifiOff size={14} />
              )}
              <span>{dataSource}</span>
            </div>
          </div>

          {/* Microcontroller */}
          <div className="scada-stat-box">
            <span className="stat-label">CONTROLLER</span>
            <div className="controller-badge">
              <Cpu size={14} />
              <span>{controller}</span>
            </div>
          </div>

          {/* Last Update Timestamp */}
          <div className="scada-stat-box scada-stat-time">
            <span className="stat-label">LAST UPDATE</span>
            <div className="time-badge">
              <Clock size={14} />
              <span className="mono-time">{formatPacketTime(lastUpdate || liveClock.getTime())}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation and Quick Safety Status Bar */}
      <div className="header-nav-bar">
        <nav className="nav-tabs" aria-label="Main Navigation">
          <button
            type="button"
            className={`nav-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <LayoutDashboard size={16} />
            <span>Dashboard</span>
          </button>

          <button
            type="button"
            className={`nav-tab ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <History size={16} />
            <span>History & Logs</span>
          </button>

          <button
            type="button"
            className={`nav-tab ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <Settings size={16} />
            <span>Threshold Settings</span>
          </button>

          <button
            type="button"
            className={`nav-tab ${activeTab === 'hardware' ? 'active' : ''}`}
            onClick={() => setActiveTab('hardware')}
          >
            <Terminal size={16} />
            <span>ESP32 Hardware & Code</span>
          </button>
        </nav>

        {/* Quick Safety State Ribbon */}
        <div className="quick-safety-strip">
          <span className="safety-label">AUTO-DISCHARGE INTERLOCK:</span>
          {complianceState?.isCompliant ? (
            <span className="safety-badge badge-safe">
              <ShieldCheck size={14} /> INTERLOCK ACTIVE (PERMITTED)
            </span>
          ) : (
            <span className="safety-badge badge-danger">
              <AlertTriangle size={14} /> DISCHARGE LOCKED (PROHIBITED)
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
