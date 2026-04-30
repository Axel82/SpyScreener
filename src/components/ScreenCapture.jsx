import React, { useRef, useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { MonitorPlay, StopCircle } from 'lucide-react';

const ScreenCapture = ({ zones, onAddZone, onUpdateZone, onDeleteZone, videoRef, onStreamEnd }) => {
  const [stream, setStream] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentRect, setCurrentRect] = useState(null);
  
  const containerRef = useRef(null);

  const startCapture = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "always" },
        audio: false
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      mediaStream.getVideoTracks()[0].onended = () => {
        stopCapture();
        if (onStreamEnd) onStreamEnd();
      };
    } catch (err) {
      console.error("Erreur de capture d'écran:", err);
    }
  };

  const stopCapture = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Drawing logic
  const handleMouseDown = (e) => {
    if (!stream) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setIsDrawing(true);
    setStartPos({ x, y });
    setCurrentRect({ x, y, width: 0, height: 0 });
  };

  const handleMouseMove = (e) => {
    if (!isDrawing) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));

    setCurrentRect({
      x: Math.min(startPos.x, x),
      y: Math.min(startPos.y, y),
      width: Math.abs(x - startPos.x),
      height: Math.abs(y - startPos.y)
    });
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    
    // Only add if it's large enough to avoid accidental clicks
    if (currentRect && currentRect.width > 20 && currentRect.height > 20) {
      // Calculate relative percentages to handle resizing
      const rect = containerRef.current.getBoundingClientRect();
      const relativeRect = {
        id: uuidv4(),
        type: 'capture', // Default type
        name: `Zone ${zones.length + 1}`,
        x: (currentRect.x / rect.width) * 100,
        y: (currentRect.y / rect.height) * 100,
        width: (currentRect.width / rect.width) * 100,
        height: (currentRect.height / rect.height) * 100,
      };
      onAddZone(relativeRect);
    }
    setCurrentRect(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600 }}>Aperçu de l'écran</h2>
        {!stream ? (
          <button className="primary" onClick={startCapture}>
            <MonitorPlay size={18} /> Sélectionner l'écran
          </button>
        ) : (
          <button className="secondary" onClick={stopCapture} style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}>
            <StopCircle size={18} /> Arrêter la capture
          </button>
        )}
      </div>

      <div style={{ 
        flex: 1, 
        backgroundColor: '#000', 
        borderRadius: 'var(--radius-md)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        minHeight: 0,
        minWidth: 0
      }}>
        {!stream && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
            <p style={{ color: 'var(--text-muted)' }}>Aucun écran sélectionné.</p>
          </div>
        )}

        <div 
          ref={containerRef}
          style={{ 
            position: 'relative', 
            cursor: stream ? 'crosshair' : 'default',
            display: stream ? 'flex' : 'none',
            maxWidth: '100%',
            maxHeight: '100%'
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <video 
            ref={videoRef} 
            autoPlay 
            muted 
            style={{ 
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              display: 'block',
              pointerEvents: 'none'
            }} 
          />

        {/* Render existing zones */}
        {zones.map(zone => (
          <div
            key={zone.id}
            style={{
              position: 'absolute',
              left: `${zone.x}%`,
              top: `${zone.y}%`,
              width: `${zone.width}%`,
              height: `${zone.height}%`,
              border: `2px solid ${zone.type === 'capture' ? 'var(--zone-capture-border)' : 'var(--zone-decode-border)'}`,
              backgroundColor: zone.type === 'capture' ? 'var(--zone-capture)' : 'var(--zone-decode)',
              pointerEvents: 'none'
            }}
          >
            <div style={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              background: 'rgba(0,0,0,0.7)', 
              color: 'white', 
              fontSize: '10px', 
              padding: '2px 4px',
              borderBottomRightRadius: '4px'
            }}>
              {zone.name}
            </div>
          </div>
        ))}

        {/* Render current drawing rectangle */}
        {isDrawing && currentRect && (
          <div
            style={{
              position: 'absolute',
              left: currentRect.x,
              top: currentRect.y,
              width: currentRect.width,
              height: currentRect.height,
              border: '2px dashed var(--accent-primary)',
              backgroundColor: 'rgba(139, 92, 246, 0.2)',
              pointerEvents: 'none'
            }}
          />
        )}
        </div>
      </div>
      
      {stream && (
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', textAlign: 'center' }}>
          Dessinez sur la vidéo pour créer une zone de capture.
        </p>
      )}
    </div>
  );
};

export default ScreenCapture;
