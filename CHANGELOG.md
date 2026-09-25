# Changelog

## [Unreleased] — Fase 8: mirror, merge, riempi buchi, bridge

### Aggiunto

- `geometry/ops/merge`: `mergeAtCenter`, `mergeAtFirst` (unisce un insieme di vertici scelto dall'utente) e `mergeByDistance` (salda ogni coppia di vertici entro una soglia, globale sulla mesh).
- `geometry/ops/borderLoop.traceBorderLoop`: attraversa il bordo di un buco (spigoli con `heTwin=-1`) partendo da un half-edge, per riuso da `fill` e `bridge`.
- `geometry/ops/fill.fillHole`: chiude un buco con un singolo n-gon che segue il bordo.
- `geometry/ops/bridge.bridgeLoops`: collega due bordi con lo stesso numero di vertici con un anello di quad, allineando la rotazione iniziale per minimizzare la distanza totale tra vertici corrispondenti; rifiuta con un errore se i due bordi hanno un numero diverso di vertici.
- `geometry/ops/mirror.applyMirror`: specchio "applicato" — mesh originale più copia riflessa e rewind (per mantenere la normale rivolta verso l'esterno), con saldatura opzionale lungo il piano di specchiatura.
- `SceneObject.mirror`: anteprima non distruttiva dello specchio (asse, saldatura, distanza) — `render/MeshSync` aggiunge una mesh figlia con scala -1 sull'asse scelto, senza toccare la geometria reale finché non si preme "Applica" (`commands/ApplyMirrorCommand`, che sostituisce la mesh e svuota `mirror` in un solo comando annullabile).
- UI: sezione "Specchio" nel pannello Proprietà (attiva/asse/saldatura/Applica); voci "Unisci al centro/al primo/per distanza", "Riempi buco", "Bridge" nel menu Modifica, attive in base alla modalità di selezione corrente.
- Test: Vitest per merge/fill/bridge/mirror (inclusi i casi di rifiuto: bordi di lunghezza diversa); Playwright per specchio→applica→annulla (conteggio triangoli 12→24→12) e cancella faccia→riempi buco dal menu Modifica (12→10→12).

### Note

- **Nessuna scorciatoia da tastiera dedicata** per merge/riempi/bridge (il PRD non ne specifica nella tabella): raggiungibili solo dal menu Modifica.
- **Bridge non gestisce l'inversione**: la ricerca dell'allineamento prova solo le rotazioni del secondo anello, non anche il verso opposto; per bordi con orientamento non compatibile il risultato può avere normali invertite sulla striscia di quad generata.
- **Anteprima dello specchio nello spazio locale dell'oggetto** (come in Blender): su una mesh già simmetrica rispetto alla propria origine locale, l'anteprima si sovrappone esattamente all'originale — comportamento corretto, non un difetto, ma può sembrare "non fare nulla" finché non si guarda il conteggio triangoli dopo "Applica" o non si usa su una mesh asimmetrica rispetto alla propria origine.

## [Unreleased] — Fase 7: UV automatiche, editor UV, export FBX (traguardo critico)

### Aggiunto

- **`io/fbx/FbxBinaryWriter`**: writer FBX binario 7.4 scritto da zero (header a 27 byte, nodi con `EndOffset`/`NumProperties`/`PropertyListLen`, proprietà tipizzate incluse le array `d`/`i`/`l` con compressione zlib oltre 128 elementi via `fflate`, record nullo di 13 byte, footer). **Validato realmente**, non solo per struttura: `assimpjs` (la stessa libreria che il PRD prevede per la CI) ha ri-letto con successo ogni file esportato durante lo sviluppo, sia nei test automatici sia da un file scaricato dall'app vera in un browser.
- `io/fbx/FbxSceneBuilder`: costruisce l'albero di nodi FBX (GlobalSettings con assi Y-up e `UnitScaleFactor=100`, Geometry con normali/UV per-poligono, Model con Translation/Rotation/Scaling, Material con colore/opacità/emissione/shininess derivata da roughness) e le connessioni geometria→modello, materiale→modello, modello→radice.
- `io/fbx/export`: `exportToFbx` (scena intera o oggetto selezionato, triangolazione opzionale, pivot centro/base/mantieni) e `buildExportReport` (conteggio triangoli, mesh, materiali, avvisi per facce degeneri o senza materiale — versione minima di E-05).
- Scorciatoia Ctrl+Shift+E ed export dal menu File; scarica un `.fbx` nel browser di sviluppo, userà il dialog nativo Tauri sull'app desktop.
- `geometry/ops/unwrap.boxUnwrap`: unwrap automatico per proiezione a scatola (proietta ogni faccia sul piano perpendicolare all'asse dominante della sua normale) — attivabile con il tasto **U**, sull'intero oggetto o sulla selezione di facce.
- `render/checkerTexture` + `MeshSync.setCheckerboard`: texture di controllo a scacchiera procedurale (1024 px), sostituisce la mappa di ogni materiale quando attivata dal pulsante "Checkerboard" già presente nella barra viewport.
- `UvEditorPanel`: scheda "Editor UV" affiancata al viewport (si passa da una all'altra con due schede in cima, il renderer 3D resta montato per non perdere lo stato della camera); mostra il layout UV dell'oggetto attivo come SVG sopra la scacchiera.
- Test: Vitest per `boxUnwrap` e — soprattutto — per l'export FBX, dove ogni asserzione passa attraverso un vero **re-import con `assimpjs`** (conteggio vertici/facce/materiali sul file effettivamente prodotto, non sulla sola struttura del writer); Playwright per unwrap→editor UV→annulla ed esporta FBX dal menu File.

### Note

- **UV automatiche non usano xatlas**: il PRD prevede `xatlas-wasm` per un vero chart-packing; qui si usa una proiezione a scatola per-faccia (nessun impacchettamento delle isole, si sovrappongono tutte nello spazio 0..1). Scelta per limitare la complessità di integrazione in questa fase; da rivedere quando servirà una vera unwrap ottimizzata per una texture reale (oggi funziona bene soprattutto per texture "trim sheet"/tileable).
- **Editor UV è di sola visualizzazione**: mostra il layout (con scacchiera) ma non permette ancora di selezionare/spostare/ruotare/scalare le isole (U-04) né di marcare seam manuali (U-05, Fase 9). Vedi `docs/STATUS.md`.
- **Export FBX senza texture**: i materiali esportano colore/metallic/roughness/emissione ma non ancora i nodi `Texture`/`Video` con i file immagine collegati — il percorso web (download di un solo file) non può scrivere file "fratelli" nella stessa cartella; da rivedere quando l'export girerà nell'app desktop con accesso al filesystem.
- **Gerarchia non esportata**: ogni oggetto viene collegato direttamente alla radice della scena FBX; i gruppi (`SceneObject.parentId`) non producono ancora nodi "Null" annidati nell'export.
- **UV per-poligono con `Direct` invece di `IndexToDirect`**: il PRD specifica `IndexToDirect` per le UV (con un array di indici separato); qui si scrive un valore diretto per ogni corner (`ByPolygonVertex/Direct`), più semplice e comunque valido per gli importer (verificato con assimp) — leggermente più pesante su disco per mesh con molte facce che condividono la stessa UV.
- **Nessuna verifica reale in Unity**: la validazione è tramite `assimpjs` (stesso strumento della pipeline CI del PRD); l'import effettivo in Unity 2022 LTS/Unity 6 richiesto come criterio di accettazione della Fase 7 non è stato possibile in questo ambiente (nessun Windows/Unity disponibili) e resta da fare manualmente.

## [Unreleased] — Fase 6: materiali, texture, salvataggio progetto

### Aggiunto

- `materials/types`: `MaterialDef` (colore/metallic/roughness/emissione/mappe/UV transform) e `TextureAsset`, secondo il modello dati del PRD.
- `core/Document`: mappe `materials`/`textures`/`textureData` (bytes grezzi delle immagini importate), eventi `materialChanged`/`textureAdded`.
- **Correzione di un bug reale**: le facce non assegnate usavano di default l'indice di slot `0`, identico al primo materiale reale assegnato — assegnare un materiale a *una* faccia ricolorava per errore l'intera mesh (tutte le altre facce, ancora al valore di default, puntavano allo stesso slot). Corretto usando `-1` come sentinella "nessun materiale" in `EditableMesh.faceMaterial`, con lo slot 0 dell'array di materiali Three.js sempre riservato al materiale di fallback. Verificato sia via test unitari sia dal vivo in browser (assegnazione a una sola faccia del cubo: solo quella cambia colore).
- `commands/MaterialCommand` (crea/edita materiale, undoable, con merge per modifiche continue tipo gli slider) e `commands/AssignMaterialCommand` (assegna un materiale a un oggetto intero o a una selezione di facce, snapshot before/after di `materialSlots`/`faceMaterial`).
- `render/MeshSync`: cache `MaterialDef` → `THREE.MeshStandardMaterial` (una istanza per materiale, condivisa tra le mesh che lo referenziano), gruppi di geometria per slot materiale, caricamento texture asincrono (`createImageBitmap`), tiling/offset/rotazione UV applicati su `THREE.Texture`.
- UI: `MaterialsPanel` — palette del progetto (riquadri colore cliccabili), creazione materiale, editor colore/metallic/roughness, import texture PNG/JPEG da file, tiling texture, pulsante/tasto **M** per assegnare il materiale attivo alla selezione (oggetto intero o facce selezionate).
- `io/fab/serialize`: serializzazione dell'intero documento (oggetti, mesh, materiali, texture, impostazioni) in un archivio zip (`fflate`) — `manifest.json`, `document.json`, `meshes/<id>.json`, `textures/<id>.<ext>`; validazione della versione di schema al caricamento.
- `io/fab/io`: salva/apri `.fab` — su Tauri usa dialog/fs nativi, altrimenti (browser di sviluppo, ambiente di test) scarica/carica il file via API web standard, mantenendo lo stesso percorso di codice testabile con Playwright.
- Scorciatoia Ctrl+S (salva) e voci di menu File > Apri/Salva.
- Test: Vitest per i comandi materiali e per il round-trip di serializzazione (mesh, materiali, texture, rifiuto di un archivio non valido o di uno schema futuro); Playwright per il flusso completo assegna materiale a una faccia → salva → ricarica la pagina → apri → verifica.

### Note

- **Formato mesh su disco diverge dal PRD**: il PRD descrive `meshes/<id>.bin` (binario compattato); qui si usa `meshes/<id>.json` (posizioni + lista facce con vertici/UV/materiale) per semplicità — funzionalmente equivalente (round-trip esatto, verificato dai test) ma più verboso su disco. Da rivedere se le dimensioni dei file diventeranno un problema.
- **Salvataggio via Tauri non testato**: il ramo `dialog`/`fs` nativo non è mai stato eseguito in questo ambiente (nessun Windows disponibile); solo il ramo web (download/upload) è verificato.
- **Nessun autosalvataggio** (il PRD lo richiede insieme al salvataggio manuale in E-01): non implementato in questa fase.
- **Libreria texture con anteprime (C-06)** e **proiezioni UV rapide (U-02)**: fuori ambito di questa fase (rispettivamente P1, Fase 9).
- **Nessuna riduzione delle texture oltre 4096 px**: il budget VRAM descritto dal PRD non è ancora applicato all'import.

## [Unreleased] — Fase 5: loop cut, bevel, suddividi

### Aggiunto

- **Correzione di un bug reale in `EditableMesh.edgeLoop()`** (introdotto in Fase 3): l'attraversamento applicava l'operazione "spigolo opposto" due volte per passo, facendo oscillare il cammino tra sole 2 facce invece di percorrere l'intero anello. Riscritto con un attraversamento entra/esci corretto, che ora copre anche entrambe le direzioni a partire dallo spigolo di partenza (utile per una striscia aperta, es. una riga di una griglia piana, non solo per un anello chiuso come il fianco di un cilindro). Aggiunti test di regressione che verificano la dimensione esatta dell'anello (8 spigoli su un cilindro a 8 segmenti, 5 su una riga di piano 4×3) — i vecchi test si limitavano a controllare "lunghezza > 0", che il bug comunque soddisfaceva.
- `geometry/ops/loopCut`: taglia ogni quad attraversato da un anello di spigoli al parametro t (default 0.5), dividendolo in due.
- `geometry/ops/bevel`: bevel semplificato a 1 segmento di uno spigolo interno — sposta i due estremi lungo gli spigoli adiacenti non selezionati, crea una striscia e due triangoli di chiusura ai vertici; rifiuta (con eccezione, mostrata in barra di stato) il bevel su uno spigolo di bordo, per ora l'unico "caso non supportato" gestito.
- `geometry/ops/subdivide`: suddivisione lineare (senza smoothing Catmull-Clark) dell'intera mesh — ogni spigolo diviso a metà, ogni faccia a n lati diventa n quad con un vertice centrale.
- Scorciatoie: Ctrl+R (loop cut) e Ctrl+B (bevel), attive in modalità spigolo con esattamente uno spigolo selezionato.
- Test: Vitest per loop cut/bevel/subdivide su cubo e cilindro (conteggio facce atteso, rifiuto del bevel su bordo); Playwright per il flusso seleziona spigolo → bevel → annulla → loop cut → annulla, verificato tramite il conteggio triangoli in barra di stato.

### Note

- **`Suddividi` non ha ancora una scorciatoia/pulsante**: il PRD non ne specifica una nella tabella delle scorciatoie; la funzione è pronta e testata (`geometry/ops/subdivide`) ma non ancora collegata all'interfaccia. Opera inoltre sull'intera mesh, non su un sottoinsieme di spigoli/facce selezionati (che richiederebbe gestire i T-junction).
- **Bevel a un solo segmento** (il PRD ne prevede 1..N): la generalizzazione a N segmenti e alla chiusura a n-gon quando più spigoli bevelati si incontrano su un vertice (richiesta dal PRD per quel caso) restano da fare.
- **Nessuna anteprima interattiva col mouse** per loop cut/bevel (il PRD la descrive per entrambi): si applicano subito con un parametro di default (t=0.5, distanza=0.1).

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
