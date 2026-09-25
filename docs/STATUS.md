# Stato del progetto

Aggiornato alla fine della **Fase 1** (setup Tauri + React + Three.js, layout UI, viewport con camera, installer).

## Fatto in questa fase

| Requisito PRD | Stato |
| --- | --- |
| F-01 Viewport con griglia, assi, orbit/pan/zoom | ✅ |
| F-02 Viste rapide (tastierino 1/3/7/5) | ✅ |
| F-03 Modalità di visualizzazione (solido/wireframe/solido+wireframe/texture) | ✅ (texture è un placeholder visivo, in attesa dei materiali) |
| D-01 Installer NSIS 64 bit, per utente o per tutti | ✅ configurato in `tauri.conf.json`; non ancora buildato/testato su una macchina Windows pulita |
| D-02 Collegamento Start/Desktop | ✅ (comportamento di default del bundler NSIS di Tauri) |
| D-03 Bootstrapper WebView2 (`embedBootstrapper`) | ✅ configurato |
| D-04 Associazione `.fab` | ✅ configurata in `tauri.conf.json`; l'apertura da doppio clic è gestita da `tauri-plugin-single-instance` + `get_startup_project_path`, ma non ancora testata end-to-end (il caricamento vero del file arriva in Fase 6) |
| D-05 Disinstallazione pulita | ✅ (comportamento di default NSIS; da verificare in checklist manuale) |

## Non ancora fatto / noto mancante

- **Non testato su Windows reale.** Questo ambiente è Linux; build, installer NSIS e comportamento WebView2 vanno verificati su una macchina Windows pulita prima di considerare la Fase 1 davvero chiusa (criterio di accettazione del PRD).
- **`cargo check` non eseguibile in questo container.** Mancano le librerie di sviluppo GTK/WebKitGTK richieste da Tauri su Linux e il container non ha accesso ai repository APT per installarle; il codice Rust (minimo: `lib.rs`, `commands.rs`) non è stato quindi compilato qui. Verrà validato dalla pipeline `release.yml` su `windows-latest`, dove Tauri non dipende da GTK.
- Pannelli Gerarchia/Proprietà/Materiali sono segnaposto vuoti (contenuto reale in Fase 2 e 6).
- Toolbar strumenti (Q/W/E/R) cambia solo lo stato attivo, non è ancora collegata a un vero `Tool`/gizmo di trasformazione (Fase 3).
- Nessuna primitiva reale, nessun kernel geometrico half-edge (Fase 2).
- `react-resizable-panels` installato ma non cablato: layout attualmente a colonne CSS fisse, non ridimensionabile.
- Firma del codice (D-07) e aggiornamento automatico (D-08) sono P2, non previsti in Fase 1.

## Rischi osservati

- In ambiente di test headless con GPU software, `THREE.GridHelper` mostrava artefatti di rendering (linee vicine alla camera non disegnate) ad alcune angolazioni; risolto lato robustezza con `frustumCulled = false`, ma va comunque riverificato visivamente su un WebView2 reale in Fase 1 quando sarà disponibile una macchina Windows.
- L'installer NSIS non è stato ancora prodotto/eseguito: la pipeline CI (`release.yml`) lo farà al primo tag `v*`, ma non è stata ancora verificata con un'esecuzione reale.

## Prossimi passi (Fase 2)

Kernel half-edge, primitive parametriche (cubo/cilindro/sfera/piano/cono/toro), gerarchia oggetti, pannello proprietà, undo/redo (M-01, M-10, M-12, M-13, F-04, F-05).
