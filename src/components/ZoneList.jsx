import React from 'react';
import { Trash2, Image, Type } from 'lucide-react';

const ZoneList = ({ zones, onUpdateZone, onDeleteZone }) => {
  if (zones.length === 0) {
    return (
      <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0' }}>
        Aucune zone définie. Dessinez sur la vidéo pour en ajouter une.
      </p>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {zones.map((zone) => (
        <div key={zone.id} style={{
          backgroundColor: 'var(--bg-primary)',
          border: `1px solid ${zone.type === 'capture' ? 'var(--zone-capture-border)' : 'var(--zone-decode-border)'}`,
          borderRadius: 'var(--radius-md)',
          padding: '0.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <input 
              type="text" 
              value={zone.name}
              onChange={(e) => onUpdateZone(zone.id, { name: e.target.value })}
              style={{ 
                background: 'transparent', 
                border: 'none', 
                padding: 0, 
                fontSize: 'var(--font-size-sm)', 
                fontWeight: 600,
                width: '120px'
              }}
            />
            <button 
              onClick={() => onDeleteZone(zone.id)}
              style={{ background: 'transparent', padding: '4px', color: 'var(--danger)' }}
              title="Supprimer la zone"
            >
              <Trash2 size={16} />
            </button>
          </div>
          
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              className={zone.type === 'capture' ? 'primary' : 'secondary'}
              style={{ flex: 1, padding: '4px 8px', fontSize: '0.75rem' }}
              onClick={() => onUpdateZone(zone.id, { type: 'capture' })}
            >
              <Image size={14} /> Capture
            </button>
            <button 
              className={zone.type === 'decode' ? 'primary' : 'secondary'}
              style={{ flex: 1, padding: '4px 8px', fontSize: '0.75rem', backgroundColor: zone.type === 'decode' ? 'var(--accent-primary)' : '' }}
              onClick={() => onUpdateZone(zone.id, { type: 'decode' })}
            >
              <Type size={14} /> Décode
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ZoneList;
