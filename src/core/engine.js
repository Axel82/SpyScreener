import { saveImage, updateJsonLog, hasDirectoryAccess, createSessionDirectory } from './fileSystem';
import { extractText, terminateOCR } from './ocr';

let timeoutId = null;
let isEngineRunning = false;

const padZero = (num) => num.toString().padStart(2, '0');

const getFormattedDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${padZero(d.getMonth() + 1)}-${padZero(d.getDate())}_${padZero(d.getHours())}-${padZero(d.getMinutes())}-${padZero(d.getSeconds())}`;
};

const isWithinSchedule = (startStr, endStr) => {
  if (!startStr || !endStr) return true;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [startH, startM] = startStr.split(':').map(Number);
  const startTotal = startH * 60 + startM;

  const [endH, endM] = endStr.split(':').map(Number);
  const endTotal = endH * 60 + endM;

  if (startTotal <= endTotal) {
    return currentMinutes >= startTotal && currentMinutes <= endTotal;
  } else {
    // Crosses midnight
    return currentMinutes >= startTotal || currentMinutes <= endTotal;
  }
};

const processZone = async (zone, videoElement) => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  // Calculate actual pixel coordinates based on video source resolution
  const vw = videoElement.videoWidth;
  const vh = videoElement.videoHeight;

  const sx = (zone.x / 100) * vw;
  const sy = (zone.y / 100) * vh;
  const sWidth = (zone.width / 100) * vw;
  const sHeight = (zone.height / 100) * vh;

  canvas.width = sWidth;
  canvas.height = sHeight;

  ctx.drawImage(videoElement, sx, sy, sWidth, sHeight, 0, 0, sWidth, sHeight);

  const timestamp = getFormattedDate();
  const safeZoneName = zone.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();

  if (zone.type === 'capture') {
    return new Promise((resolve) => {
      canvas.toBlob(async (blob) => {
        if (blob) {
          const filename = `${timestamp}_${safeZoneName}.png`;
          await saveImage(filename, blob);
        }
        resolve({ type: 'capture' });
      }, 'image/png');
    });
  } else if (zone.type === 'decode') {
    const dataUrl = canvas.toDataURL('image/png');
    const text = await extractText(dataUrl);
    return { type: 'decode', text };
  }
};

/**
 * Starts the capture engine.
 *
 * Fix 5: Instead of calling alert() (which blocks the UI and is not styleable),
 * this function now returns a result object: { success: true } or
 * { success: false, error: <errorCode> }. The caller is responsible for
 * displaying a user-friendly message.
 *
 * Fix 4: Accepts onTickStart and onTickEnd callbacks for live UI feedback.
 */
export const startEngine = async ({
  videoElement,
  zones,
  frequencySec,
  startTime,
  endTime,
  onFinish,
  onTickStart,
  onTickEnd,
}) => {
  if (isEngineRunning) return { success: false, error: 'already_running' };

  if (!hasDirectoryAccess()) {
    return { success: false, error: 'no_directory' };
  }

  if (!videoElement || !videoElement.videoWidth) {
    return { success: false, error: 'no_screen' };
  }

  if (!isWithinSchedule(startTime, endTime)) {
    return { success: false, error: 'out_of_schedule' };
  }

  isEngineRunning = true;
  console.log('Démarrage du moteur de capture...');

  const timestamp = getFormattedDate();
  const sessionFolderName = `Session_${timestamp}`;
  const sessionCreated = await createSessionDirectory(sessionFolderName);
  if (!sessionCreated) {
    isEngineRunning = false;
    return { success: false, error: 'session_create_failed' };
  }

  const loop = async () => {
    if (!isEngineRunning) return;

    if (isWithinSchedule(startTime, endTime)) {
      console.log(`Exécution de l'analyse à ${new Date().toLocaleTimeString()}...`);

      // Fix 4: notify UI that a tick has started
      if (onTickStart) onTickStart();

      const tickData = {
        time: new Date().toISOString(),
        zones: [],
      };

      let captureCount = 0;
      let decodeCount = 0;

      for (const zone of zones) {
        try {
          const result = await processZone(zone, videoElement);
          if (result?.type === 'decode' && result.text) {
            tickData.zones.push({ id: zone.id, name: zone.name, content: result.text });
            decodeCount++;
          } else if (result?.type === 'capture') {
            captureCount++;
          }
        } catch (error) {
          console.error(`Erreur lors du traitement de la zone "${zone.name}":`, error);
        }
      }

      if (tickData.zones.length > 0) {
        // Group all decoded zones in a daily NDJSON file (Fix 1: append-only)
        const d = new Date();
        const jsonFilename = `decodes_${d.getFullYear()}-${padZero(d.getMonth() + 1)}-${padZero(d.getDate())}.ndjson`;
        await updateJsonLog(jsonFilename, tickData);
      }

      // Fix 4: notify UI that a tick has finished with its stats
      if (onTickEnd) onTickEnd({ captureCount, decodeCount, timestamp: new Date() });

      // Schedule next execution ONLY after current one is fully completed
      if (isEngineRunning) {
        timeoutId = setTimeout(loop, frequencySec * 1000);
      }
    } else {
      console.log('En dehors des horaires définis. Arrêt automatique.');
      await stopEngine();
      if (onFinish) onFinish();
    }
  };

  // Run immediately on first tick
  loop();

  return { success: true };
};

/**
 * Fix 2: terminateOCR is now called on stop, so the Tesseract worker is properly
 * cleaned up and does not linger in the background after the engine is stopped.
 * The worker will be lazily re-initialized on the next startEngine call.
 */
export const stopEngine = async () => {
  isEngineRunning = false;
  if (timeoutId) {
    clearTimeout(timeoutId);
    timeoutId = null;
  }
  await terminateOCR();
  console.log('Moteur de capture arrêté.');
};
