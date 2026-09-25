# Changelog

## [Unreleased] — Fase 4: estrudi, inset, cancella

### Aggiunto

- `geometry/ops/regionOffset`: base condivisa per estrudi/inset — duplica i vertici delle facce selezionate, ricrea le facce non toccate, costruisce la nuova "cappa" e un quad laterale per ogni half-edge di bordo della regione (bordo = twin assente o non nella selezione).
- `geometry/ops/extrude`: estrude un insieme di facce lungo la normale media, con una distanza di default (0.5) così il risultato non è mai degenere; l'utente può poi rifinire con G (Fase 3) in modalità faccia/vertice.
- `geometry/ops/inset`: inset per faccia (indipendente per ogni faccia selezionata, non "regione" unificata), spostamento verso il centroide della faccia — approssimazione più semplice della formula bisettrice/`sin(θ/2)` del PRD, robusta per gli n-gon convessi delle primitive attuali.
- `geometry/ops/deleteElements`: cancellazione coerente con la modalità di selezione — faccia: solo le facce; spigolo: le facce adiacenti; vertice: vertici e facce adiacenti (i vertici isolati risultanti spariscono automaticamente nella ricostruzione).
- `commands/MeshTopologyCommand` + `commands/meshOps.commitMeshOp`: snapshot before/after dell'intera mesh per operazioni che cambiano la topologia; il commit avviene solo se `validate()` passa sul risultato, altrimenti l'operazione viene scartata e riportata (barra di stato) — per ora senza state "prev" persistito, il barra si pulisce dopo 3 s.
- Scorciatoie: Ctrl+E (estrudi), I (inset) e Canc ora consapevole della modalità di selezione (cancella componenti di mesh in modalità vertice/spigolo/faccia, l'intero oggetto in modalità oggetto).
- Test: Vitest per extrude/inset/delete (validità topologica, conteggio facce atteso, rifiuto di un'estrusione a distanza zero) e Playwright per il flusso completo estrudi→inset→cancella→annulla×3 verificato tramite il conteggio triangoli in barra di stato.

### Note

- **Inset non implementa ancora la "modalità regione"** del PRD (inset di più facce come un'unica area): ogni faccia selezionata viene insettata indipendentemente. Adeguato per l'uso più comune (una faccia alla volta).
- **Formula di inset approssimata**: sposta ogni vertice verso il centroide della faccia anziché lungo la bisettrice esatta tra gli spigoli adiacenti; per gli n-gon regolari delle primitive attuali il risultato è visivamente equivalente, ma diverge su poligoni molto irregolari.
- **Nessun feedback di anteprima interattiva** per estrudi/inset (il PRD descrive un'anteprima live col mouse prima di confermare): l'operazione si applica subito con un valore di default; l'utente regola il risultato dopo, a mano, con gli strumenti della Fase 3.
- **`EditableMesh` non compatta ancora gli elementi cancellati con una free-list**: le operazioni di cancellazione ricostruiscono l'intera mesh da zero (O(n) per operazione) invece di marcare e riusare gli slot, più semplice e sufficientemente veloce per le dimensioni di mesh attuali; da rivedere se servirà su mesh molto più grandi.

## [Unreleased] — Fase 3: selezione vertice/spigolo/faccia, trasformo modale, snap

### Aggiunto

- `geometry/EditableMesh`: `edges()` (enumerazione univoca), `edgeLoop()` (attraversamento per quad, per M-03), `connectedFaces()` (BFS via twin, per "seleziona collegati"/L), `vertexFaces()`, `setVertexPosition()`. `addFace` ora richiede una UV esplicita per corner invece di una UV "per vertice": era una scorciatoia della Fase 2 che impediva la condivisione dei vertici tra facce adiacenti (ogni faccia aveva i propri vertici, quindi i twin non si risolvevano mai e l'intera mesh risultava "non connessa").
- **Correzione dei generatori di primitive** (`geometry/ops/primitives`): riscritti per condividere i vertici tra facce adiacenti (vertici del cubo, anelli del cilindro/sfera/toro, apice unico per cono/poli sfera), così la topologia half-edge è realmente connessa; le UV restano corrette ai seam grazie alla UV per-corner (`heUv`), non per-vertice.
- `selection/Selection`: tipo `SelectMode`, `expandSelectionToVertices` (vertice/spigolo/faccia → indici di vertice univoci).
- `render/Picking`: selezione vertice/spigolo per prossimità in spazio schermo (10 px / 6 px, come da PRD), selezione faccia via raycasting sulla mesh triangolata con mappa triangolo→faccia.
- `render/SelectionOverlay`: evidenzia vertici/spigoli/facce selezionati (arancione) sopra quelli non selezionati (bianco/grigio), come figlio del mesh dell'oggetto in modifica.
- `tools/ModalTransform`: trasformazione modale in stile Blender (sposta/ruota/scala) con vincolo di asse X/Y/Z, inserimento numerico, snap a griglia/incrementi di rotazione, conferma (clic/Invio) o annulla (clic destro/Esc); opera sia sul transform dell'oggetto (modalità oggetto) sia direttamente sulle posizioni dei vertici selezionati (modalità vertice/spigolo/faccia), pivot al centroide della selezione.
- `commands/MeshEditCommand`: snapshot before/after dell'intero array di posizioni per un edit di componenti, undoable.
- UI: pulsanti modalità 1-4 nella barra viewport; tasti 1-4 per cambiare modalità, G per spostare, Maiusc+E per ruotare, Maiusc+R per scalare (tutti col focus sul viewport); barra di stato con conteggio triangoli/selezione reali e suggerimento contestuale durante la trasformazione modale.
- Test: Vitest per `edges()`/`edgeLoop()`/`connectedFaces()`/`expandSelectionToVertices` e per `MeshEditCommand` (undo/redo); Playwright per il flusso seleziona faccia → sposta (G) → conferma → annulla.

### Note

- **Picking di vertici/spigoli è O(n) per clic** (proiezione di ogni vertice/spigolo in spazio schermo): adeguato alle mesh delle primitive attuali; il BVH (`three-mesh-bvh`) previsto dal PRD per le mesh grandi resta da integrare quando servirà per prestazioni.
- **Loop di spigoli semplificato**: `edgeLoop()` attraversa solo quad (bordo opposto via `next(next(h))`), non implementa ancora la regola generale "valenza 4" del PRD per mesh non a griglia.
- **Scorciatoie modali (G/Maiusc+E/Maiusc+R/1-4) richiedono il focus sul viewport** (come tipico in un editor 3D): un clic su un pulsante della UI sposta il focus e va ricliccato nel viewport prima di usarle. Le scorciatoie globali (Ctrl+Z/Y/D/Canc) restano invece attive ovunque.
- **Vincolo di asse è globale, non locale all'oggetto**: X/Y/Z durante il trasformo modale vincola sempre agli assi del mondo, non a quelli ruotati dell'oggetto.
- **Gizmo di trasformazione (Q/W/E/R) non ancora collegato al viewport**: i pulsanti della toolbar cambiano solo lo stato "strumento attivo"; il gizmo visuale (`TransformControls`) resta da integrare — per ora l'unico modo di trasformare è il modale da tastiera (G/Maiusc+E/Maiusc+R), che soddisfa comunque il criterio di accettazione esplicito della Fase 3.
- Il campo "Blocca" (`locked`) di un oggetto non impedisce ancora la trasformazione modale (solo la cancellazione da tastiera, come in Fase 2).

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
