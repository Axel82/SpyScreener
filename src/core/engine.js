import { saveImage, updateJsonLog, hasDirectoryAccess } from './fileSystem';
import { extractText } from './ocr';

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

  // Draw the specific portion of the video onto the canvas
  ctx.drawImage(videoElement, sx, sy, sWidth, sHeight, 0, 0, sWidth, sHeight);

  const timestamp = getFormattedDate();
  const safeZoneName = zone.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();

  if (zone.type === 'capture') {
    // Save Image
    return new Promise((resolve) => {
      canvas.toBlob(async (blob) => {
        if (blob) {
          const filename = `${timestamp}_${safeZoneName}.png`;
          await saveImage(filename, blob);
        }
        resolve(null);
      }, 'image/png');
    });
  } else if (zone.type === 'decode') {
    // OCR
    const dataUrl = canvas.toDataURL('image/png');
    const text = await extractText(dataUrl);
    return text;
  }
};

export const startEngine = ({ videoElement, zones, frequencySec, startTime, endTime, onFinish }) => {
  if (isEngineRunning) return false;
  if (!hasDirectoryAccess()) {
    alert("Veuillez sélectionner un dossier de destination d'abord.");
    return false;
  }
  if (!videoElement || !videoElement.videoWidth) {
    alert("Veuillez sélectionner l'écran à capturer.");
    return false;
  }

  isEngineRunning = true;
  console.log("Démarrage du moteur de capture...");

  const loop = async () => {
    if (!isEngineRunning) return;

    if (isWithinSchedule(startTime, endTime)) {
      console.log(`Exécution de l'analyse à ${new Date().toLocaleTimeString()}...`);
      
      const tickData = {
        time: new Date().toISOString(),
        zones: []
      };

      for (const zone of zones) {
        try {
          const result = await processZone(zone, videoElement);
          if (zone.type === 'decode' && result) {
            tickData.zones.push({
              id: zone.id,
              name: zone.name,
              content: result
            });
          }
        } catch (error) {
          console.error(`Erreur lors du traitement de la zone ${zone.name}:`, error);
        }
      }

      if (tickData.zones.length > 0) {
        // Group all decoded zones in a daily JSON file
        const d = new Date();
        const jsonFilename = `decodes_${d.getFullYear()}-${padZero(d.getMonth() + 1)}-${padZero(d.getDate())}.json`;
        await updateJsonLog(jsonFilename, tickData);
      }

      // Schedule next execution ONLY after current one is fully completed
      if (isEngineRunning) {
        timeoutId = setTimeout(loop, frequencySec * 1000);
      }

    } else {
      console.log("En dehors des horaires définis. Arrêt automatique.");
      stopEngine();
      if (onFinish) onFinish();
    }
  };

  // Run immediately first time
  loop();
  
  return true;
};

export const stopEngine = () => {
  isEngineRunning = false;
  if (timeoutId) {
    clearTimeout(timeoutId);
    timeoutId = null;
  }
  console.log("Moteur de capture arrêté.");
};
