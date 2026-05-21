/**
 * Wrapper for File System Access API
 * This allows the app to request a directory from the user and save files to it directly.
 * Designed to be easily swappable with Node.js fs if migrating to Electron/Tauri.
 *
 * NOTE (Fix 7): The directory handle is stored in memory only.
 * It is NOT persisted across page reloads — the user must re-select the folder each session.
 */

let targetDirectoryHandle = null;
let currentSessionDirectoryHandle = null;

export const requestDirectoryAccess = async () => {
  try {
    const handle = await window.showDirectoryPicker({
      mode: 'readwrite',
      startIn: 'pictures'
    });
    targetDirectoryHandle = handle;
    return handle.name;
  } catch (error) {
    // User cancelled or permission denied — not a fatal error
    console.warn("Accès au dossier annulé ou refusé:", error);
    return null;
  }
};

export const hasDirectoryAccess = () => {
  return targetDirectoryHandle !== null;
};

export const createSessionDirectory = async (folderName) => {
  if (!targetDirectoryHandle) return false;
  try {
    currentSessionDirectoryHandle = await targetDirectoryHandle.getDirectoryHandle(folderName, { create: true });
    return true;
  } catch (error) {
    console.error("Erreur lors de la création du sous-dossier:", error);
    return false;
  }
};

/**
 * Resets all directory handles (e.g., when the session context is lost or the user
 * wants to change the output folder).
 */
export const resetDirectoryAccess = () => {
  targetDirectoryHandle = null;
  currentSessionDirectoryHandle = null;
};

/**
 * Saves a Blob (image) to the active session directory.
 */
export const saveImage = async (filename, blob) => {
  const dirHandle = currentSessionDirectoryHandle || targetDirectoryHandle;
  if (!dirHandle) throw new Error("Dossier non défini");

  try {
    const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
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
 * Fix 1 — Appends a single JSON-line (NDJSON) to the log file.
 *
 * Previous approach read the whole file, parsed it, pushed, then rewrote everything.
 * That becomes slow for long sessions (potentially MBs of data).
 *
 * New approach: seek to the end of the file and write one JSON line (\n terminated).
 * The resulting file is NDJSON (Newline-Delimited JSON) — one object per line.
 * Reads/imports can parse it with: lines.split('\n').filter(Boolean).map(JSON.parse)
 */
export const updateJsonLog = async (filename, tickData) => {
  const dirHandle = currentSessionDirectoryHandle || targetDirectoryHandle;
  if (!dirHandle) throw new Error("Dossier non défini");

  try {
    const fileHandle = await dirHandle.getFileHandle(filename, { create: true });

    // Get the current file size so we can seek to the end and append
    const existingFile = await fileHandle.getFile();
    const currentSize = existingFile.size;

    const line = JSON.stringify(tickData) + '\n';

    // Open in append mode: keepExistingData=true + seek to EOF
    const writable = await fileHandle.createWritable({ keepExistingData: true });
    await writable.seek(currentSize);
    await writable.write(line);
    await writable.close();

    return true;
  } catch (error) {
    console.error("Erreur de sauvegarde JSON:", error);
    return false;
  }
};
