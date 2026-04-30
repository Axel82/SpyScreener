import React, { useState, useRef } from 'react';
import './index.css';
import ScreenCapture from './components/ScreenCapture';
import ZoneList from './components/ZoneList';
import { requestDirectoryAccess } from './core/fileSystem';
import { startEngine, stopEngine } from './core/engine';
import { Play, FolderOpen } from 'lucide-react';
import { version } from '../package.json';

function App() {
  const [zones, setZones] = useState([]);
  const [outputFolder, setOutputFolder] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [useSchedule, setUseSchedule] = useState(false);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('18:00');
  const [frequency, setFrequency] = useState(10);
  const videoRef = useRef(null);

  const handleAddZone = (newZone) => {
    setZones([...zones, newZone]);
  };

  const handleUpdateZone = (id, updates) => {
    setZones(zones.map(z => z.id === id ? { ...z, ...updates } : z));
  };

  const handleDeleteZone = (id) => {
    setZones(zones.filter(z => z.id !== id));
  };

  const handleSelectFolder = async () => {
    const folderName = await requestDirectoryAccess();
    if (folderName) {
      setOutputFolder(folderName);
    }
  };

  const toggleEngine = async () => {
    if (isRunning) {
      stopEngine();
      setIsRunning(false);
    } else {
      const success = await startEngine({
        videoElement: videoRef.current,
        zones,
        frequencySec: frequency,
        startTime: useSchedule ? startTime : null,
        endTime: useSchedule ? endTime : null,
        onFinish: () => setIsRunning(false)
      });
      if (success) {
        setIsRunning(true);
      }
    }
  };

  return (
    <div className="app-container" style={{ display: 'flex', width: '100%', height: '100%', padding: '1rem', gap: '1rem' }}>
      
      {/* Left side: Screen Capture Area */}
      <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '1rem' }}>
        <ScreenCapture 
          zones={zones} 
          onAddZone={handleAddZone}
          onUpdateZone={handleUpdateZone}
          onDeleteZone={handleDeleteZone}
          videoRef={videoRef}
          onStreamEnd={() => {
            stopEngine();
            setIsRunning(false);
          }}
        />
      </div>

      {/* Right side: Settings Panel */}
      <div className="glass-panel" style={{ width: '350px', display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h2 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600 }}>Configuration</h2>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>v{version}</span>
        </div>
        
        <div style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem', minHeight: 0, overflow: 'hidden' }}>
          
          {/* Static Config Part (Scrollable if needed, but we prefer grouping) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Output Folder Settings */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>Dossier de destination</label>
              <button className="secondary" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={handleSelectFolder}>
                <FolderOpen size={16} /> 
                {outputFolder ? outputFolder : "Choisir un dossier..."}
              </button>
            </div>

            {/* Schedule Settings */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input type="checkbox" id="useSchedule" checked={useSchedule} onChange={e => setUseSchedule(e.target.checked)} disabled={isRunning} />
                  <label htmlFor="useSchedule" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', cursor: 'pointer' }}>Utiliser une plage horaire</label>
               </div>
               {useSchedule && (
                 <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.25rem' }}>
                    <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} disabled={isRunning} style={{ flex: 1 }} />
                    <span style={{ color: 'var(--text-muted)' }}>à</span>
                    <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} disabled={isRunning} style={{ flex: 1 }} />
                 </div>
               )}
            </div>

            {/* Frequency Settings */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>Fréquence de capture (sec)</label>
              <input type="number" value={frequency} onChange={e => setFrequency(parseInt(e.target.value) || 1)} min="1" disabled={isRunning} />
            </div>
          </div>

          {/* Zone List - This part will scroll */}
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

        {/* Start Engine Button - Fixed at bottom */}
        <div style={{ padding: '1rem', borderTop: '1px solid var(--glass-border)', backgroundColor: 'rgba(30, 41, 59, 0.4)' }}>
           <button 
              className={isRunning ? "secondary" : "primary"} 
              style={{ width: '100%', padding: '1rem', fontSize: 'var(--font-size-md)', ...(isRunning ? { color: 'var(--danger)', borderColor: 'var(--danger)' } : {}) }}
              onClick={toggleEngine}
           >
             {isRunning ? "⏹ Arrêter l'analyse" : <><Play size={18} fill="currentColor" /> Démarrer l'analyse</>}
           </button>
        </div>
      </div>
    </div>
  );
}

export default App;
