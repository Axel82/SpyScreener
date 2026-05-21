import React, { useState, useRef, useEffect, useCallback } from 'react';
import './index.css';
import ScreenCapture from './components/ScreenCapture';
import ZoneList from './components/ZoneList';
import StatusPanel from './components/StatusPanel';
import { ToastContainer } from './components/Toast';
import { requestDirectoryAccess } from './core/fileSystem';
import { startEngine, stopEngine } from './core/engine';
import { Play, FolderOpen, AlertTriangle } from 'lucide-react';
import { version } from '../package.json';

// Monotonic counter for unique toast IDs
let _toastId = 0;

// Fix 5: human-readable messages for engine error codes
const ENGINE_ERROR_MESSAGES = {
  no_directory:         "Veuillez sélectionner un dossier de destination d'abord.",
  no_screen:            "Veuillez sélectionner l'écran à capturer avant de démarrer.",
  out_of_schedule:      "L'heure actuelle est en dehors de la plage horaire définie. Démarrage annulé.",
  session_create_failed:"Impossible de créer le dossier de session. Vérifiez les permissions.",
  already_running:      "Le moteur est déjà en cours d'exécution.",
};

function App() {
  const [zones,         setZones]         = useState([]);
  const [outputFolder,  setOutputFolder]  = useState(null);
  const [isRunning,     setIsRunning]     = useState(false);
  const [isTickRunning, setIsTickRunning] = useState(false); // Fix 4
  const [lastTick,      setLastTick]      = useState(null);  // Fix 4
  const [useSchedule,   setUseSchedule]   = useState(false);
  const [startTime,     setStartTime]     = useState('08:00');
  const [endTime,       setEndTime]       = useState('18:00');
  const [frequency,     setFrequency]     = useState(10);
  const [toasts,        setToasts]        = useState([]);    // Fix 5
  const [isCompatible,  setIsCompatible]  = useState(true); // Fix 6

  const videoRef = useRef(null);

  // ─── Fix 6: Browser compatibility check on mount ─────────────────────────
  useEffect(() => {
    if (typeof window.showDirectoryPicker !== 'function') {
      setIsCompatible(false);
      addToast(
        "Ce navigateur ne supporte pas l'API File System Access. Veuillez utiliser Google Chrome ou Microsoft Edge.",
        'warning',
        12000
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Fix 7: Warn before page unload when a session is active ─────────────
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isRunning || outputFolder) {
        e.preventDefault();
        // Modern browsers show a generic message; the custom message is ignored
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isRunning, outputFolder]);

  // ─── Fix 5: Toast helpers ─────────────────────────────────────────────────
  const addToast = useCallback((message, type = 'info', duration = 5000) => {
    const id = ++_toastId;
    setToasts(prev => [...prev, { id, message, type, duration }]);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // ─── Zone management ──────────────────────────────────────────────────────
  const handleAddZone    = useCallback((zone)         => setZones(prev => [...prev, zone]), []);
  const handleUpdateZone = useCallback((id, updates)  => setZones(prev => prev.map(z => z.id === id ? { ...z, ...updates } : z)), []);
  const handleDeleteZone = useCallback((id)           => setZones(prev => prev.filter(z => z.id !== id)), []);

  // ─── Folder selection ─────────────────────────────────────────────────────
  const handleSelectFolder = async () => {
    const folderName = await requestDirectoryAccess();
    if (folderName) {
      setOutputFolder(folderName);
      addToast(`Dossier sélectionné : "${folderName}"`, 'success');
    }
  };

  // ─── Engine toggle ────────────────────────────────────────────────────────
  const toggleEngine = async () => {
    if (isRunning) {
      await stopEngine(); // Fix 2: now async, also terminates OCR worker
      setIsRunning(false);
      setIsTickRunning(false);
      addToast("Analyse arrêtée.", 'info');
      return;
    }

    // Fix 5: startEngine returns { success, error } instead of calling alert()
    const result = await startEngine({
      videoElement: videoRef.current,
      zones,
      frequencySec: frequency,
      startTime:    useSchedule ? startTime : null,
      endTime:      useSchedule ? endTime   : null,
      onFinish: () => {
        setIsRunning(false);
        setIsTickRunning(false);
        addToast("Analyse terminée automatiquement (fin de plage horaire).", 'info');
      },
      // Fix 4: live tick feedback
      onTickStart: () => setIsTickRunning(true),
      onTickEnd:   (data) => {
        setIsTickRunning(false);
        setLastTick(data);
      },
    });

    if (result.success) {
      setIsRunning(true);
      addToast("Analyse démarrée.", 'success');
    } else {
      const msg = ENGINE_ERROR_MESSAGES[result.error] ?? "Une erreur inattendue est survenue.";
      addToast(msg, 'error');
    }
  };

  const handleStreamEnd = useCallback(async () => {
    await stopEngine();
    setIsRunning(false);
    setIsTickRunning(false);
  }, []);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="app-container" style={{ display: 'flex', width: '100%', height: '100%', padding: '1rem', gap: '1rem' }}>

      {/* ── Left: Screen Capture ── */}
      <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '1rem' }}>
        <ScreenCapture
          zones={zones}
          onAddZone={handleAddZone}
          onUpdateZone={handleUpdateZone}
          onDeleteZone={handleDeleteZone}
          videoRef={videoRef}
          onStreamEnd={handleStreamEnd}
        />
      </div>

      {/* ── Right: Configuration panel ── */}
      <div className="glass-panel" style={{ width: '350px', display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h2 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600 }}>Configuration</h2>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>v{version}</span>
        </div>

        <div style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem', minHeight: 0, overflowY: 'auto' }}>

          {/* Fix 6: Incompatibility banner */}
          {!isCompatible && (
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.5rem',
              padding: '0.75rem',
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--font-size-sm)',
              color: '#f59e0b',
            }}>
              <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
              <span>Navigateur incompatible. Cette application requiert <strong>Chrome</strong> ou <strong>Edge</strong>.</span>
            </div>
          )}

          {/* Output folder */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
              Dossier de destination
            </label>
            <button
              className="secondary"
              style={{ width: '100%', justifyContent: 'flex-start' }}
              onClick={handleSelectFolder}
              disabled={!isCompatible}
            >
              <FolderOpen size={16} />
              {outputFolder ?? "Choisir un dossier…"}
            </button>

            {/* Fix 7: session-only access notice */}
            {outputFolder && (
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                ⚠ L'accès est valable pour cette session uniquement. Un rechargement de la page nécessitera une nouvelle sélection.
              </p>
            )}
          </div>

          {/* Schedule */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                id="useSchedule"
                checked={useSchedule}
                onChange={e => setUseSchedule(e.target.checked)}
                disabled={isRunning}
              />
              <label htmlFor="useSchedule" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                Utiliser une plage horaire
              </label>
            </div>
            {useSchedule && (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} disabled={isRunning} style={{ flex: 1 }} />
                <span style={{ color: 'var(--text-muted)' }}>à</span>
                <input type="time" value={endTime}   onChange={e => setEndTime(e.target.value)}   disabled={isRunning} style={{ flex: 1 }} />
              </div>
            )}
          </div>

          {/* Frequency */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
              Fréquence de capture (sec)
            </label>
            <input
              type="number"
              value={frequency}
              onChange={e => setFrequency(Math.max(1, parseInt(e.target.value) || 1))}
              min="1"
              disabled={isRunning}
            />
          </div>

          {/* Fix 4: Status panel */}
          <StatusPanel
            isRunning={isRunning}
            isTickRunning={isTickRunning}
            lastTick={lastTick}
          />

          {/* Zone list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, minHeight: 0 }}>
            <label style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
              Zones définies ({zones.length})
            </label>
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
              <ZoneList
                zones={zones}
                onUpdateZone={handleUpdateZone}
                onDeleteZone={handleDeleteZone}
              />
            </div>
          </div>
        </div>

        {/* Start / Stop button — pinned to bottom */}
        <div style={{ padding: '1rem', borderTop: '1px solid var(--glass-border)', backgroundColor: 'rgba(30, 41, 59, 0.4)' }}>
          <button
            className={isRunning ? 'secondary' : 'primary'}
            style={{
              width: '100%',
              padding: '1rem',
              fontSize: 'var(--font-size-md)',
              ...(isRunning ? { color: 'var(--danger)', borderColor: 'var(--danger)' } : {}),
            }}
            onClick={toggleEngine}
            disabled={!isCompatible}
          >
            {isRunning
              ? (isTickRunning ? '⏳ Traitement en cours…' : '⏹ Arrêter l\'analyse')
              : <><Play size={18} fill="currentColor" /> Démarrer l'analyse</>
            }
          </button>
        </div>
      </div>

      {/* Fix 5: Toast notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default App;
