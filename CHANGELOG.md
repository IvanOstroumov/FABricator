# Changelog

## [Unreleased] — Fase 2: kernel half-edge, primitive, gerarchia, undo/redo

### Aggiunto

- `geometry/EditableMesh`: struttura half-edge (n-gon supportati), `addVertex`/`addFace` con collegamento automatico dei twin, `faceVertices`, `faceNormal` (metodo di Newell), `validate()` (invarianti next/prev, twin, area minima), `clone()`. La versione con array tipizzati a capacità fissa e free-list arriva con le operazioni di modifica (Fase 4); per ora (solo creazione, nessuna cancellazione) sono semplici array JS.
- `geometry/ops/primitives`: generatori parametrici per cubo, cilindro, cono, sfera (poli a triangoli), piano (suddiviso), toro — con UV per-corner generate direttamente.
- `geometry/triangulate`: triangolazione a ventaglio per il rendering (ear-clipping generico rimandato alla Fase 4/5, quando servirà per n-gon concavi).
- `core/Document` + `core/EventBus`: sorgente di verità della scena (oggetti, mesh, materiali/texture ancora vuoti), eventi tipizzati `objectAdded/Removed/Changed`, `meshChanged`, `revisionChanged`.
- `commands/`: `Command`/`CommandStack` (undo/redo illimitato, gruppi di comandi, budget di memoria), `AddObjectCommand`, `RemoveObjectCommand`, `PropertyCommand` (rinomina, visibilità, blocco, trasformo — generico e supporta il merge per modifiche continue), `GroupObjectsCommand`, `DuplicateObjectCommand` (copia profonda di oggetto+mesh).
- `render/MeshSync`: ponte Document → Three.js; un `THREE.Mesh` (+ overlay wireframe) per oggetto, aggiornato solo sugli eventi del Document.
- UI: menu "Aggiungi" con le 6 primitive, `HierarchyPanel` (selezione, rinomina inline, nascondi/blocca, raggruppa), `PropertiesPanel` (posizione/rotazione/scala numeriche, editing live), scorciatoie globali Ctrl+Z/Ctrl+Shift+Z/Ctrl+Y (redo), Ctrl+D (duplica), Canc (cancella).
- Test: Vitest per i 6 generatori di primitive (validità topologica) e per `CommandStack` (undo/redo singolo, gruppi, 50 cicli consecutivi senza errori — criterio di accettazione M-12); Playwright per il flusso aggiungi→rinomina→undo/redo e duplica→cancella.

### Note

- Selezione: solo a livello di oggetto intero per ora (`useSelectionStore`); le modalità vertice/spigolo/faccia (M-02) arrivano in Fase 3 insieme al picking.
- Materiali: tutti gli oggetti condividono un unico `MeshStandardMaterial` placeholder; C-01…C-05 arrivano in Fase 6.
- `EditableMesh.compact()` e `removeFace`/`removeVertex` sono ancora no-op/assenti: non serve finché non esistono operazioni di modifica che cancellano elementi (Fase 4).

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
