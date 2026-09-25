# Stato del progetto

Aggiornato alla fine della **Fase 7** — il traguardo critico del PRD (UV automatiche, editor UV, export FBX).

## Fatto in questa fase

| Requisito PRD | Stato |
| --- | --- |
| U-01 Unwrap automatico | ⚠️ funzionante ma con proiezione a scatola invece di xatlas (nessun chart-packing/impacchettamento isole) |
| U-03 Editor UV affiancato al viewport | ⚠️ visualizzazione (layout + scacchiera come sfondo); non ancora editabile |
| U-04 Seleziona/sposta/ruota/scala isole e vertici nell'editor UV | ❌ non fatto in questa fase |
| U-06 Texture a scacchiera di controllo | ✅ |
| E-02 Export .fbx di oggetto selezionato o scena | ✅ |
| E-03 Export con unità in metri, Y-up, triangolazione opzionale, normali e UV incluse | ✅ |
| E-04 Pivot modificabile prima dell'export (centro, base, mantieni) | ✅ |

## Il criterio di accettazione della fase non è completamente verificabile qui

Il PRD chiude la Fase 7 con: *"Un prop texturizzato esportato si importa in Unity 2022 LTS e Unity 6 con scala, orientamento e materiali corretti."* Questo ambiente non ha Windows né Unity, quindi **l'unica verifica possibile è stata indiretta**: ho scritto un writer FBX binario 7.4 da zero e l'ho validato re-importando ogni file esportato con `assimpjs` (la stessa libreria che il PRD prevede per la CI) — sia nei test automatici sia da un file scaricato dall'app vera in un browser, confermando conteggi di vertici/facce/materiali corretti e nessun errore di parsing. Assimp e Unity non sono lo stesso importer, quindi **questo non sostituisce una verifica manuale in Unity**, ma è una prova concreta che il file è un FBX 7.4 binario strutturalmente valido, non solo "probabilmente corretto per costruzione".

**Prossimo passo umano consigliato**: aprire un file esportato in Unity 2022 LTS (o Unity 6) e controllare scala (1 unità = 1 m), orientamento (Y-up, nessuna rotazione indesiderata) e materiali, secondo la checklist del PRD.

## Non ancora fatto / noto mancante

- **UV automatiche senza xatlas**: proiezione a scatola per-faccia, senza impacchettamento delle isole (si sovrappongono tutte in 0..1). Buona per texture tileable/trim-sheet, non per una texture unica dedicata al prop.
- **Editor UV di sola visualizzazione**: nessuna selezione/spostamento/rotazione/scala di isole o vertici (U-04); nessuna marcatura di seam manuali (U-05, Fase 9).
- **Export FBX senza texture incluse**: materiali con colore/metallic/roughness/emissione, ma senza nodi `Texture`/`Video` collegati ai file immagine — il percorso web (unico file scaricato) non può scrivere anche i PNG a fianco; da rivedere quando l'export gira nell'app desktop con accesso al filesystem.
- **Gerarchia non esportata**: ogni oggetto è collegato direttamente alla radice FBX; i gruppi non producono nodi "Null" annidati.
- **UV per-poligono `Direct` invece di `IndexToDirect`**: scelta più semplice del PRD, verificata valida con assimp ma più pesante su disco per mesh con molte facce condividenti la stessa UV.
- **Report di export (E-05)**: solo la funzione `buildExportReport` (conteggi e avvisi), senza un dialog UI che lo mostri prima di esportare.
- Import `.glb`/`.obj` (E-06): non fatto, non previsto prima della Fase 10.
- Non ancora verificato su Windows reale (nota ancora valida dalle fasi precedenti) — e, come sopra, non ancora verificato in Unity.

## Rischi osservati

- Il rischio "writer FBX con errori di formato" segnalato dal PRD è stato mitigato concretamente in questa fase: la validazione con `assimpjs` ha permesso di scoprire e correggere subito i problemi di struttura (a differenza di bug di topologia delle fasi precedenti, qui non ne sono emersi — il writer ha funzionato al primo tentativo strutturalmente valido, probabilmente perché il formato binario è stato seguito byte per byte dalla specifica del PRD). Resta comunque il rischio che Unity sia più severo o diverso da assimp su dettagli specifici (es. convenzioni di connessione, versioni dei nodi) — da confermare con un vero test manuale.

## Prossimi passi (Fase 8)

Mirror non distruttivo, merge vertici, riempi buchi, bridge tra loop (M-08, M-09).
