/**
 * Wrapper for File System Access API
 * This allows the app to request a directory from the user and save files to it directly.
 * Designed to be easily swappable with Node.js fs if migrating to Electron/Tauri.
 */

let targetDirectoryHandle = null;

export const requestDirectoryAccess = async () => {
  try {
    const handle = await window.showDirectoryPicker({
      mode: 'readwrite',
      startIn: 'pictures'
    });
    targetDirectoryHandle = handle;
    return handle.name;
  } catch (error) {
    console.error("Erreur lors de l'accès au dossier:", error);
    return null;
  }
};

export const hasDirectoryAccess = () => {
  return targetDirectoryHandle !== null;
};

/**
 * Saves a Blob (image) to the selected directory
 */
export const saveImage = async (filename, blob) => {
  if (!targetDirectoryHandle) throw new Error("Dossier non défini");
  
  try {
    const fileHandle = await targetDirectoryHandle.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();
    return true;
  } catch (error) {
    console.error("Erreur de sauvegarde d'image:", error);
    return false;
  }
};

/**
 * Appends a JSON tick object to the JSON file
 */
export const updateJsonLog = async (filename, tickData) => {
  if (!targetDirectoryHandle) throw new Error("Dossier non défini");
  
  try {
    const fileHandle = await targetDirectoryHandle.getFileHandle(filename, { create: true });
    
    let currentData = [];
    try {
      const file = await fileHandle.getFile();
      const text = await file.text();
      if (text) {
        currentData = JSON.parse(text);
      }
    } catch (e) {
      // Le fichier est vide ou invalide, on part sur un tableau vide
    }
    
    currentData.push(tickData);
    
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(currentData, null, 2));
    await writable.close();
    return true;
  } catch (error) {
    console.error("Erreur de sauvegarde JSON:", error);
    return false;
  }
};
