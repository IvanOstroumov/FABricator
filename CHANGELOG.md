# Changelog

## [Unreleased] — Fase 1: setup e viewport

### Aggiunto

- Progetto Tauri 2 + React 19 + TypeScript (strict) + Vite, con struttura di cartelle secondo il PRD (`src/core`, `src/render`, `src/ui`, `src/geometry`, ecc., ancora vuote dove non richiesto in questa fase).
- Viewport 3D (Three.js/WebGL2): griglia con assi X (rosso) / Z (blu), luce direzionale + ambientale + `RoomEnvironment` PMREM, cubo dimostrativo.
- `CameraController`: orbit (Alt+clic sinistro o clic centrale), pan (Alt+Maiusc+clic sinistro o Maiusc+clic centrale), zoom a rotella; camera prospettica e ortografica sincronizzate.
- Viste rapide Frontale/Laterale/Dall'alto/Prospettiva (tastierino 1/3/7/5) con passaggio automatico a ortografica per le viste assonometriche.
- Modalità di visualizzazione: solido, wireframe, solido+wireframe, texture (bottoni nella barra viewport; "texture" è un placeholder in attesa dei materiali di Fase 6).
- Layout fisso dell'interfaccia: menu, toolbar strumenti a sinistra (Q/W/E/R, non ancora funzionanti), colonna viewport, pannello laterale con Gerarchia/Proprietà/Materiali (placeholder, popolati in Fase 2/6), barra di stato con FPS e suggerimento contestuale.
- Internazionalizzazione it/en con `i18next`, lingua predefinita rilevata dal browser/OS.
- Render on demand: il renderer ridisegna solo quando la camera o le opzioni di shading cambiano.
- Backend Tauri (Rust) minimo: `tauri-plugin-single-instance` per inoltrare il percorso di un `.fab` aperto con doppio clic a una finestra già aperta, comando `get_startup_project_path` per leggere l'argomento da riga di comando all'avvio, plugin `dialog` e `fs` predisposti per l'I/O di Fase 6-7.
- `tauri.conf.json`: target NSIS, associazione file `.fab`, `embedBootstrapper` per WebView2, installer per-utente o per-tutti-gli-utenti, selezione lingua IT/EN.
- Licenza MIT.
- Test: Vitest (`tests/unit`) per `core/math` e `core/Id`; Playwright (`tests/e2e`) per il caricamento del workspace e il cambio di vista/shading.
- GitHub Actions: `ci.yml` (lint, typecheck, unit test) e `release.yml` (build installer NSIS su `windows-latest` a ogni tag `v*`).

### Note

- Il cubo dimostrativo e il pannello Materiali sono segnaposto: le primitive parametriche (M-01) e i materiali PBR (C-01) arrivano nelle fasi 2 e 6.
- La griglia usa `THREE.GridHelper` con `frustumCulled = false`: è emerso durante i test in ambiente headless (renderer software) che alcuni angoli di camera facevano sparire le linee più vicine; su GPU reali (Windows/WebView2/ANGLE) non è un problema noto, ma disabilitare il culling è comunque economico per un elemento sempre visibile ed evita il rischio.
- I pannelli non sono ancora ridimensionabili (`react-resizable-panels` è installato ma non cablato): la spec lo richiede, verrà integrato quando i pannelli avranno contenuto reale.
