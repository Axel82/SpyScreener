import React from 'react';
import { Activity, Camera, Type, Loader } from 'lucide-react';

/**
 * Fix 4 — Visual feedback panel shown while the engine is running.
 * Displays engine status, last tick time, and per-tick capture/decode counts.
 */
const StatusPanel = ({ isRunning, isTickRunning, lastTick }) => {
  if (!isRunning && !lastTick) return null;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '0.625rem',
      padding: '0.75rem',
      background: 'var(--bg-secondary)',
      borderRadius: 'var(--radius-md)',
      border: `1px solid ${isRunning ? 'rgba(16,185,129,0.25)' : 'var(--glass-border)'}`,
      transition: 'border-color 0.3s ease',
    }}>
      {/* Status row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {isTickRunning ? (
          <Loader
            size={13}
            style={{
              color: 'var(--accent-primary)',
              animation: 'spin 1s linear infinite',
              flexShrink: 0,
            }}
          />
        ) : (
          <div style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: isRunning ? 'var(--success)' : 'var(--text-muted)',
            flexShrink: 0,
            boxShadow: isRunning ? '0 0 6px var(--success)' : 'none',
            animation: isRunning && !isTickRunning ? 'pulse-dot 2s ease-in-out infinite' : 'none',
          }} />
        )}
        <span style={{
          fontSize: 'var(--font-size-sm)',
          fontWeight: 600,
          color: isTickRunning
            ? 'var(--accent-primary)'
            : isRunning
              ? 'var(--success)'
              : 'var(--text-muted)',
          transition: 'color 0.3s ease',
        }}>
          {isTickRunning
            ? 'Traitement en cours…'
            : isRunning
              ? 'En attente du prochain tick'
              : 'Arrêté'}
        </span>
      </div>

      {/* Last tick info */}
      {lastTick && (
        <>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.75rem',
            color: 'var(--text-secondary)',
          }}>
            <span>Dernier tick</span>
            <span style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>
              {lastTick.timestamp.toLocaleTimeString()}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <StatBadge
              icon={<Camera size={11} />}
              value={lastTick.captureCount}
              label="capture"
              color="var(--success)"
              bg="rgba(16, 185, 129, 0.1)"
            />
            <StatBadge
              icon={<Type size={11} />}
              value={lastTick.decodeCount}
              label="décode"
              color="var(--accent-primary)"
              bg="rgba(139, 92, 246, 0.1)"
            />
          </div>
        </>
      )}

      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

const StatBadge = ({ icon, value, label, color, bg }) => (
  <div style={{
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.3rem',
    fontSize: '0.75rem',
    fontWeight: 500,
    color,
    background: bg,
    borderRadius: 'var(--radius-sm)',
    padding: '0.3rem 0.5rem',
  }}>
    {icon}
    {value} {label}{value !== 1 ? 's' : ''}
  </div>
);

export default StatusPanel;
