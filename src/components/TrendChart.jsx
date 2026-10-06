import React, { useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { TrendingUp, Layers, Droplet, Waves } from 'lucide-react';

// Register Chart.js modules
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function TrendChart({ historyData = [], currentSettings }) {
  const [viewMode, setViewMode] = useState('both'); // 'both' | 'ph' | 'turbidity'

  // Extract up to latest 30 readings
  const recentData = historyData.slice(-30);

  // Format labels: timestamps as HH:mm:ss
  const labels = recentData.map((item, idx) => {
    if (item.timestamp) {
      try {
        const d = new Date(item.timestamp);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      } catch {
        return `#${idx + 1}`;
      }
    }
    return `#${idx + 1}`;
  });

  const phValues = recentData.map((item) => (item.ph !== undefined ? Number(item.ph) : null));
  const turbValues = recentData.map((item) =>
    item.turbidity !== undefined ? Number(item.turbidity) : null
  );

  const showPh = viewMode === 'both' || viewMode === 'ph';
  const showTurb = viewMode === 'both' || viewMode === 'turbidity';

  const datasets = [];

  if (showPh) {
    datasets.push({
      label: 'pH Level (pH)',
      data: phValues,
      borderColor: '#06b6d4', // Cyan
      backgroundColor: 'rgba(6, 182, 212, 0.1)',
      borderWidth: 2.5,
      pointRadius: 3,
      pointHoverRadius: 6,
      pointBackgroundColor: '#06b6d4',
      yAxisID: 'y_ph',
      tension: 0.3,
      fill: false
    });
  }

  if (showTurb) {
    datasets.push({
      label: 'Turbidity (NTU)',
      data: turbValues,
      borderColor: '#f59e0b', // Amber
      backgroundColor: 'rgba(245, 158, 11, 0.1)',
      borderWidth: 2.5,
      pointRadius: 3,
      pointHoverRadius: 6,
      pointBackgroundColor: '#f59e0b',
      yAxisID: 'y_turb',
      tension: 0.3,
      fill: false
    });
  }

  const chartData = {
    labels: labels.length ? labels : ['Waiting for telemetry...'],
    datasets: datasets.length
      ? datasets
      : [
          {
            label: 'No data',
            data: [0],
            borderColor: '#64748b'
          }
        ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#cbd5e1',
          font: { family: 'Inter, sans-serif', size: 12, weight: '500' },
          usePointStyle: true,
          boxWidth: 8
        }
      },
      tooltip: {
        backgroundColor: '#0f172a',
        titleColor: '#f8fafc',
        bodyColor: '#e2e8f0',
        borderColor: '#334155',
        borderWidth: 1,
        padding: 10,
        boxPadding: 4,
        usePointStyle: true,
        callbacks: {
          label: function (context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += context.parsed.y.toFixed(2);
            }
            return label;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.05)'
        },
        ticks: {
          color: '#94a3b8',
          font: { size: 11, family: 'monospace' },
          maxRotation: 45,
          minRotation: 0,
          maxTicksLimit: 10
        }
      },
      y_ph: {
        type: 'linear',
        display: showPh,
        position: 'left',
        min: 0,
        max: 14,
        grid: {
          color: 'rgba(255, 255, 255, 0.05)'
        },
        ticks: {
          color: '#06b6d4',
          stepSize: 2,
          font: { size: 11, family: 'monospace' }
        },
        title: {
          display: true,
          text: 'pH (0 – 14)',
          color: '#06b6d4',
          font: { size: 11, weight: 'bold' }
        }
      },
      y_turb: {
        type: 'linear',
        display: showTurb,
        position: 'right',
        min: 0,
        suggestedMax: 100,
        grid: {
          drawOnChartArea: !showPh, // avoid duplicate gridlines when dual axis
          color: 'rgba(255, 255, 255, 0.05)'
        },
        ticks: {
          color: '#f59e0b',
          font: { size: 11, family: 'monospace' }
        },
        title: {
          display: true,
          text: 'Turbidity (NTU)',
          color: '#f59e0b',
          font: { size: 11, weight: 'bold' }
        }
      }
    }
  };

  return (
    <div className="industrial-card trend-chart-card">
      <div className="card-header-row">
        <div className="card-title-group">
          <div className="sensor-icon-avatar avatar-trend">
            <TrendingUp size={20} />
          </div>
          <div>
            <span className="card-kicker">HISTORICAL TELEMETRY (LATEST 30 READINGS)</span>
            <h3 className="card-title">Effluent Quality Trend</h3>
          </div>
        </div>

        {/* View Toggle Buttons */}
        <div className="chart-view-selector">
          <button
            type="button"
            className={`chart-btn ${viewMode === 'both' ? 'active' : ''}`}
            onClick={() => setViewMode('both')}
            title="Show Dual Axes"
          >
            <Layers size={13} />
            <span>Dual Axis</span>
          </button>
          <button
            type="button"
            className={`chart-btn ${viewMode === 'ph' ? 'active' : ''}`}
            onClick={() => setViewMode('ph')}
            title="Show pH Only"
          >
            <Droplet size={13} />
            <span>pH Only</span>
          </button>
          <button
            type="button"
            className={`chart-btn ${viewMode === 'turbidity' ? 'active' : ''}`}
            onClick={() => setViewMode('turbidity')}
            title="Show Turbidity Only"
          >
            <Waves size={13} />
            <span>Turbidity Only</span>
          </button>
        </div>
      </div>

      <div className="chart-wrapper">
        <Line data={chartData} options={chartOptions} />
      </div>

      <div className="chart-legend-strip">
        <div className="legend-chip">
          <span className="legend-dot dot-cyan"></span>
          <span>pH Safe Band: {currentSettings?.phMin} - {currentSettings?.phMax} pH</span>
        </div>
        <div className="legend-chip">
          <span className="legend-dot dot-amber"></span>
          <span>Turbidity Threshold: ≤ {currentSettings?.turbidityMax} NTU</span>
        </div>
        <div className="legend-chip">
          <span className="sample-counter">Data Points: {recentData.length} / 30</span>
        </div>
      </div>
    </div>
  );
}
