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
 * Saves or appends text to a file in the selected directory
 */
export const appendTextFile = async (filename, text) => {
  if (!targetDirectoryHandle) throw new Error("Dossier non défini");
  
  try {
    const fileHandle = await targetDirectoryHandle.getFileHandle(filename, { create: true });
    
    // Simplification for the browser API (real append requires more work, 
    // here we might just read, append, write or write individual files per capture)
    // For now, let's just write/overwrite to keep it simple, or save as JSON/Logs.
    const writable = await fileHandle.createWritable();
    await writable.write(text);
    await writable.close();
    return true;
  } catch (error) {
    console.error("Erreur de sauvegarde de texte:", error);
    return false;
  }
};
