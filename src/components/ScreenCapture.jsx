import React, { useRef, useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { MonitorPlay, StopCircle } from 'lucide-react';

/**
 * Fix 3 — Zones are now draggable (move) and resizable (bottom-right handle).
 *
 * Interaction model:
 *  - Click + drag on empty video area  → draw a new zone
 *  - Click + drag on an existing zone  → move that zone
 *  - Click + drag on resize handle     → resize that zone
 *
 * Global mousemove/mouseup listeners are used for drag and resize so the
 * interaction keeps working even if the cursor leaves the container.
 * The drawing preview stays on local container events only.
 */
const ScreenCapture = ({ zones, onAddZone, onUpdateZone, onDeleteZone, videoRef, onStreamEnd }) => {
  const [stream, setStream] = useState(null);
  const [drawingRect, setDrawingRect] = useState(null); // pixel rect currently being drawn

  const containerRef = useRef(null);

  /**
   * Interaction ref avoids stale-closure issues in global event listeners.
   * Shape:
   *   null
   *   | { type: 'draw',   startX, startY }
   *   | { type: 'drag',   zoneId, startMouseX, startMouseY, origX, origY }
   *   | { type: 'resize', zoneId, startMouseX, startMouseY, origWidth, origHeight }
   */
  const interactionRef = useRef(null);

  // Keep mutable refs in sync so global listeners always see fresh props/state
  const zonesRef = useRef(zones);
  const onUpdateZoneRef = useRef(onUpdateZone);
  const onAddZoneRef = useRef(onAddZone);
  useEffect(() => { zonesRef.current = zones; }, [zones]);
  useEffect(() => { onUpdateZoneRef.current = onUpdateZone; }, [onUpdateZone]);
  useEffect(() => { onAddZoneRef.current = onAddZone; }, [onAddZone]);

  // ─── Global listeners for drag & resize (survive leaving the container) ────
  useEffect(() => {
    const getRelPos = (e) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0, w: 1, h: 1 };
      return {
        x: Math.max(0, Math.min(e.clientX - rect.left, rect.width)),
        y: Math.max(0, Math.min(e.clientY - rect.top,  rect.height)),
        w: rect.width,
        h: rect.height,
      };
    };

    const onGlobalMouseMove = (e) => {
      const ia = interactionRef.current;
      if (!ia || ia.type === 'draw') return;

      const { x, y, w, h } = getRelPos(e);
      const currentZones = zonesRef.current;

      if (ia.type === 'drag') {
        const dx = ((x - ia.startMouseX) / w) * 100;
        const dy = ((y - ia.startMouseY) / h) * 100;
        const zone = currentZones.find(z => z.id === ia.zoneId);
        if (!zone) return;
        onUpdateZoneRef.current(ia.zoneId, {
          x: Math.max(0, Math.min(100 - zone.width,  ia.origX + dx)),
          y: Math.max(0, Math.min(100 - zone.height, ia.origY + dy)),
        });
      } else if (ia.type === 'resize') {
        const dx = ((x - ia.startMouseX) / w) * 100;
        const dy = ((y - ia.startMouseY) / h) * 100;
        const zone = currentZones.find(z => z.id === ia.zoneId);
        if (!zone) return;
        onUpdateZoneRef.current(ia.zoneId, {
          width:  Math.max(3, Math.min(100 - zone.x, ia.origWidth  + dx)),
          height: Math.max(3, Math.min(100 - zone.y, ia.origHeight + dy)),
        });
      }
    };

    const onGlobalMouseUp = () => {
      const ia = interactionRef.current;
      if (!ia || ia.type === 'draw') return;
      interactionRef.current = null;
      document.body.style.cursor = '';
    };

    document.addEventListener('mousemove', onGlobalMouseMove);
    document.addEventListener('mouseup',   onGlobalMouseUp);
    return () => {
      document.removeEventListener('mousemove', onGlobalMouseMove);
      document.removeEventListener('mouseup',   onGlobalMouseUp);
    };
  }, []); // empty — uses only refs

  // ─── Screen capture ───────────────────────────────────────────────────────
  const startCapture = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) videoRef.current.srcObject = mediaStream;
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
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  // ─── Container mouse handlers (draw only) ────────────────────────────────
  const handleContainerMouseDown = (e) => {
    if (!stream) return;
    // Only start drawing if clicking directly on the container or video,
    // not on a zone overlay (zone handlers call stopPropagation).
    const { left, top } = containerRef.current.getBoundingClientRect();
    const x = e.clientX - left;
    const y = e.clientY - top;
    interactionRef.current = { type: 'draw', startX: x, startY: y };
    setDrawingRect({ x, y, width: 0, height: 0 });
  };

  const handleContainerMouseMove = (e) => {
    const ia = interactionRef.current;
    if (!ia || ia.type !== 'draw') return;
    const { left, top, width, height } = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - left, width));
    const y = Math.max(0, Math.min(e.clientY - top,  height));
    setDrawingRect({
      x: Math.min(ia.startX, x),
      y: Math.min(ia.startY, y),
      width:  Math.abs(x - ia.startX),
      height: Math.abs(y - ia.startY),
    });
  };

  const handleContainerMouseUp = () => {
    const ia = interactionRef.current;
    if (!ia || ia.type !== 'draw') return;

    if (drawingRect && drawingRect.width > 20 && drawingRect.height > 20) {
      const { width: cw, height: ch } = containerRef.current.getBoundingClientRect();
      onAddZoneRef.current({
        id:     uuidv4(),
        type:   'capture',
        name:   `Zone ${zonesRef.current.length + 1}`,
        x:      (drawingRect.x      / cw) * 100,
        y:      (drawingRect.y      / ch) * 100,
        width:  (drawingRect.width  / cw) * 100,
        height: (drawingRect.height / ch) * 100,
      });
    }
    
    setDrawingRect(null);
    interactionRef.current = null;
  };

  // ─── Zone interaction starters ────────────────────────────────────────────
  const handleZoneMouseDown = (e, zone) => {
    e.stopPropagation();
    const { left, top, width, height } = containerRef.current.getBoundingClientRect();
    interactionRef.current = {
      type: 'drag',
      zoneId: zone.id,
      startMouseX: Math.max(0, Math.min(e.clientX - left, width)),
      startMouseY: Math.max(0, Math.min(e.clientY - top,  height)),
      origX: zone.x,
      origY: zone.y,
    };
    document.body.style.cursor = 'move';
  };

  const handleResizeMouseDown = (e, zone) => {
    e.stopPropagation();
    const { left, top, width, height } = containerRef.current.getBoundingClientRect();
    interactionRef.current = {
      type: 'resize',
      zoneId: zone.id,
      startMouseX: Math.max(0, Math.min(e.clientX - left, width)),
      startMouseY: Math.max(0, Math.min(e.clientY - top,  height)),
      origWidth:  zone.width,
      origHeight: zone.height,
    };
    document.body.style.cursor = 'se-resize';
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem' }}>
      {/* Header */}
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

      {/* Video area */}
      <div style={{
        flex: 1,
        backgroundColor: '#000',
        borderRadius: 'var(--radius-md)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        minHeight: 0,
        minWidth: 0,
      }}>
        {!stream && (
          <p style={{ color: 'var(--text-muted)' }}>Aucun écran sélectionné.</p>
        )}

        {/* Interaction container — always mounted but hidden when no stream */}
        <div
          ref={containerRef}
          style={{
            position: 'relative',
            cursor: stream ? 'crosshair' : 'default',
            display: stream ? 'flex' : 'none',
            maxWidth: '100%',
            maxHeight: '100%',
            userSelect: 'none',
          }}
          onMouseDown={handleContainerMouseDown}
          onMouseMove={handleContainerMouseMove}
          onMouseUp={handleContainerMouseUp}
          onMouseLeave={handleContainerMouseUp}
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
              pointerEvents: 'none',
            }}
          />

          {/* Existing zones */}
          {zones.map(zone => {
            const isCapture = zone.type === 'capture';
            const borderColor = isCapture ? 'var(--zone-capture-border)' : 'var(--zone-decode-border)';
            const bgColor     = isCapture ? 'var(--zone-capture)'        : 'var(--zone-decode)';
            return (
              <div
                key={zone.id}
                title={`${zone.name} — glisser pour déplacer`}
                style={{
                  position: 'absolute',
                  left:   `${zone.x}%`,
                  top:    `${zone.y}%`,
                  width:  `${zone.width}%`,
                  height: `${zone.height}%`,
                  border: `2px solid ${borderColor}`,
                  backgroundColor: bgColor,
                  boxSizing: 'border-box',
                  cursor: 'move',
                }}
                onMouseDown={(e) => handleZoneMouseDown(e, zone)}
              >
                {/* Zone label */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  background: 'rgba(0,0,0,0.72)',
                  color: 'white',
                  fontSize: '10px',
                  padding: '2px 5px',
                  borderBottomRightRadius: '4px',
                  pointerEvents: 'none',
                  userSelect: 'none',
                  whiteSpace: 'nowrap',
                }}>
                  {zone.name}
                </div>

                {/* Resize handle — bottom-right corner */}
                <div
                  title="Redimensionner"
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: 14,
                    height: 14,
                    cursor: 'se-resize',
                    background: borderColor,
                    borderTopLeftRadius: 4,
                    opacity: 0.85,
                  }}
                  onMouseDown={(e) => handleResizeMouseDown(e, zone)}
                />
              </div>
            );
          })}

          {/* Live drawing preview */}
          {drawingRect && drawingRect.width > 1 && drawingRect.height > 1 && (
            <div style={{
              position: 'absolute',
              left:   drawingRect.x,
              top:    drawingRect.y,
              width:  drawingRect.width,
              height: drawingRect.height,
              border: '2px dashed var(--accent-primary)',
              backgroundColor: 'rgba(139, 92, 246, 0.15)',
              pointerEvents: 'none',
            }} />
          )}
        </div>
      </div>

      {stream && (
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', textAlign: 'center' }}>
          Dessinez sur la vidéo pour créer une zone · Glissez une zone pour la déplacer · ↘ pour redimensionner
        </p>
      )}
    </div>
  );
};

export default ScreenCapture;
