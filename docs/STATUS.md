# Stato del progetto

Aggiornato alla fine della **Fase 10** (import OBJ, report di export, persistenza impostazioni). Tutte le fasi 1-10 del PRD sono ora coperte, con le semplificazioni e i limiti documentati di seguito.

## Fatto in questa fase

| Requisito PRD | Stato |
| --- | --- |
| E-06 Import di mesh esterne (OBJ) | ⚠️ solo `.obj` (vertici + UV per-corner, n-gon); niente `.glb`, niente `.mtl`, niente normali personalizzate |
| E-05 Report di riepilogo prima dell'esportazione FBX | ✅ dialogo con mesh/triangoli/materiali/avvisi, conferma o annulla, sia da menu sia da scorciatoia |
| D-06 Persistenza delle impostazioni tra riavvii | ✅ lingua e soglia avviso triangoli su `localStorage`; stato di sessione viewport intenzionalmente non persistito |
| Validazione prestazioni scena di riferimento (200k tri, ≥60 fps, <2GB VRAM) | ❌ non verificabile in modo significativo in questo ambiente (rendering software, nessuna GPU reale) |

## Non ancora fatto / noto mancante

- **Import limitato a OBJ**: nessun supporto `.glb`/`.gltf` (era elencato come possibile nel PRD ma non specificato come obbligatorio; OBJ copre il caso d'uso minimo di importare geometria esterna).
- **OBJ non importa materiali né normali**: `.mtl` ignorato, `vn` ignorato (le normali sono sempre ricalcolate da `EditableMesh`); vanno riassegnati manualmente dopo l'import.
- **Percorso Tauri nativo di import mai eseguito**: solo il fallback browser (`<input type="file">`) è stato verificato dal vivo in questo container Linux senza binario Tauri.
- **Prestazioni non validate su hardware reale**: una prova con ~21.600 triangoli in questo sandbox (software rendering) è scesa a ~4 fps — dato privo di significato per una GPU reale; va rifatta la validazione su Windows prima del rilascio.
- Non ancora verificato su Windows reale né in Unity (note ancora valide dalle fasi precedenti: xatlas non integrato, UV editor sola visualizzazione, bevel a un solo segmento, nessun BVH per il picking).

## Rischi osservati

- Il bug dell'editor UV (memoization stale su mutazione in-place, Fase 9) è un pattern che potrebbe ripetersi altrove se in futuro si aggiungono altri pannelli che leggono dati mutabili di `EditableMesh`/`Document` tramite `useMemo`: vanno sempre inclusi `revision` (o un equivalente) tra le dipendenze quando i dati sorgente possono cambiare senza che l'identità dell'oggetto cambi.
- Stesso tipo di bug di "promise mai risolta" trovato in questa fase nell'import OBJ (errore di parsing dentro un handler `async` non racchiuso in try/catch): da tenere a mente ogni volta che si scrive un `onchange`/callback asincrono che deve propagare un errore a un chiamante che fa `await`.

## Prossimi passi (oltre il PRD P0/P1, se richiesti)

Import `.glb`, integrazione xatlas per un vero unwrap automatico basato su seam, editing delle isole UV, BVH per il picking, validazione prestazioni e compatibilità Unity su hardware Windows reale.
