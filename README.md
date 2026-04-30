# SpyScreener 🕵️‍♂️🖥️

SpyScreener est une application web locale moderne permettant de définir des zones de capture sur votre écran pour une surveillance automatisée. Elle capture des images et décode du texte (OCR) depuis votre écran selon une fréquence et des horaires définis.

## 🌟 Fonctionnalités

- **Aperçu en direct** : Sélectionnez votre écran (ou une fenêtre spécifique) et visualisez le flux vidéo en temps réel.
- **Zones personnalisables** : Dessinez directement sur la vidéo pour définir vos zones d'intérêt. L'application respecte les proportions exactes de l'écran capturé.
- **Capture d'image** : Enregistrez automatiquement la portion d'écran sélectionnée sous forme d'image (`.png`).
- **Décodage de texte (OCR)** : Extrayez automatiquement le texte contenu dans une ou plusieurs zones grâce à Tesseract.js. Les résultats sont regroupés pour chaque analyse (tick) et sauvegardés dans un unique fichier `.json`.
- **Sauvegarde locale transparente** : Utilise l'API *File System Access* pour enregistrer silencieusement les données dans le dossier de votre choix, sans backend ni serveur externe.
- **Moteur de planification** : Définissez vos horaires d'activité et la fréquence de capture (en secondes). Le moteur s'arrête automatiquement en dehors des plages horaires.

## 🚀 Installation & Démarrage

Le projet utilise **Vite** et **React**.

1. **Installer les dépendances**
   ```bash
   npm install
   ```

2. **Lancer le serveur de développement**
   ```bash
   npm run dev
   ```
   L'application sera accessible localement, généralement sur [http://localhost:5173/](http://localhost:5173/).

3. **Compiler pour la production**
   ```bash
   npm run build
   ```
   Les fichiers optimisés seront générés dans le dossier `dist/`.
   Vous pouvez prévisualiser la version de production via `npm run preview`.

## 🛠️ Stack Technique

- **Interface** : React, Vanilla CSS (Thème sombre, Glassmorphism, design responsive)
- **Outils de Build** : Vite
- **OCR** : Tesseract.js (Support Français et Anglais par défaut)
- **APIs Web Modernes** : 
  - `Screen Capture API` (`navigator.mediaDevices.getDisplayMedia`)
  - `File System Access API` (`window.showDirectoryPicker`)

## 📂 Architecture

La logique métier a été volontairement séparée de l'interface (`src/core/`) pour faciliter une éventuelle migration future vers une application logicielle native (comme Electron ou Tauri).

- `core/engine.js` : Gère la boucle de capture, la création des canevas et le respect des horaires.
- `core/fileSystem.js` : Gère les permissions et les écritures dans le dossier de l'utilisateur.
- `core/ocr.js` : Wrapper gérant l'initialisation du worker Tesseract et l'extraction de texte.
