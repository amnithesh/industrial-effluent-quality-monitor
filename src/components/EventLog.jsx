import React from 'react';
import { Terminal, ShieldCheck, ShieldAlert, Lock, Unlock } from 'lucide-react';

export default function EventLog({ events = [] }) {
  // Take latest 12 events for clean dashboard display
  const displayEvents = events.slice(0, 15);

  const formatTime = (ts) => {
    if (!ts) return '--:--:--';
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return String(ts);
    }
  };

  return (
    <div className="industrial-card event-log-card">
      <div className="card-header-row">
        <div className="card-title-group">
          <div className="sensor-icon-avatar avatar-terminal">
            <Terminal size={20} />
          </div>
          <div>
            <div className="card-kicker">REAL-TIME TELEMETRY FEED</div>
            <h3 className="card-title">Event Log</h3>
          </div>
        </div>

        <div className="status-tag badge-neutral">
          <span>{displayEvents.length} Recent Cycles</span>
        </div>
      </div>

      <div className="event-log-container">
        {displayEvents.length === 0 ? (
          <div className="empty-log-box">
            <Terminal size={24} className="empty-terminal-icon" />
            <div className="empty-log-text">Awaiting incoming telemetry packets...</div>
            <div className="empty-log-sub">Readings will appear automatically as received from Firebase.</div>
          </div>
        ) : (
          <div className="event-log-table-wrapper">
            <table className="industrial-table event-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>pH</th>
                  <th>Turbidity</th>
                  <th>Compliance</th>
                  <th>Valve</th>
                  <th>Origin</th>
                </tr>
              </thead>
              <tbody>
                {displayEvents.map((ev, index) => {
                  const isCompliant = ev.compliance === 'COMPLIANT';
                  const isValveOpen = ev.valve === 'OPEN';
                  const phVal = ev.ph !== undefined && ev.ph !== null ? Number(ev.ph).toFixed(2) : '--';
                  const turbVal = ev.turbidity !== undefined && ev.turbidity !== null ? Number(ev.turbidity).toFixed(1) : '--';

                  return (
                    <tr
                      key={`event-${ev.id || ''}-${ev.timestamp || index}`}
                      className={isCompliant ? 'row-compliant' : 'row-noncompliant'}
                    >
                      <td className="mono font-semibold">{formatTime(ev.timestamp)}</td>
                      <td className="mono">{phVal}</td>
                      <td className="mono">{turbVal} NTU</td>
                      <td>
                        <span className={`event-badge ${isCompliant ? 'badge-comp-pass' : 'badge-comp-fail'}`}>
                          {isCompliant ? <ShieldCheck size={12} /> : <ShieldAlert size={12} />}
                          <span>{ev.compliance || 'UNKNOWN'}</span>
                        </span>
                      </td>
                      <td>
                        <span className={`event-badge ${isValveOpen ? 'badge-valve-open' : 'badge-valve-closed'}`}>
                          {isValveOpen ? <Unlock size={12} /> : <Lock size={12} />}
                          <span>{ev.valve || 'CLOSED'}</span>
                        </span>
                      </td>
                      <td>
                        <span className={`mode-tag ${ev.mode === 'LIVE' ? 'mode-live' : 'mode-sim'}`}>
                          {ev.mode || 'SIM'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Terminal raw string display bar */}
      {displayEvents[0] && (
        <div className="raw-stream-footer">
          <span className="raw-label">Latest Raw Stream:</span>
          <code className="raw-code">
            {formatTime(displayEvents[0].timestamp)} | {Number(displayEvents[0].ph).toFixed(2)} pH |{' '}
            {Number(displayEvents[0].turbidity).toFixed(1)} NTU | {displayEvents[0].compliance} |{' '}
            {displayEvents[0].valve}
          </code>
        </div>
      )}
    </div>
  );
}
