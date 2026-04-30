import Tesseract from 'tesseract.js';

/**
 * Wrapper for Tesseract.js
 * Designed to allow adding more languages later.
 * Current support: eng + fra
 */

let worker = null;
let isReady = false;

export const initializeOCR = async (langs = 'fra+eng') => {
  if (worker) return;
  try {
    console.log(`Initialisation de Tesseract avec les langues: ${langs}...`);
    // Initialize the worker globally for reuse
    worker = await Tesseract.createWorker(langs, 1, {
      logger: m => console.log(m),
    });
    isReady = true;
    console.log("Tesseract est prêt !");
  } catch (error) {
    console.error("Erreur d'initialisation Tesseract:", error);
  }
};

/**
 * Extracts text from an image (dataURL or Blob)
 */
export const extractText = async (imageSource) => {
  if (!isReady || !worker) {
    await initializeOCR();
  }
  
  try {
    const { data: { text } } = await worker.recognize(imageSource);
    return text.trim();
  } catch (error) {
    console.error("Erreur de décodage:", error);
    return "";
  }
};

export const terminateOCR = async () => {
  if (worker) {
    await worker.terminate();
    worker = null;
    isReady = false;
  }
};
