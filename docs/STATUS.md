# Stato del progetto

Aggiornato alla fine della **Fase 2** (kernel half-edge, primitive, gerarchia, proprietà, undo/redo).

## Fatto in questa fase

| Requisito PRD | Stato |
| --- | --- |
| M-01 Primitive con parametri modificabili alla creazione | ✅ le 6 primitive esistono e sono parametriche nel codice; non c'è ancora un dialog UI per impostare i parametri prima della creazione (si creano con i default, poi vanno scalate/modificate a mano) |
| M-10 Smooth/flat shading per oggetto | ⚠️ il campo `shading` esiste sul `SceneObject` ma non è ancora collegato al calcolo delle normali (tutte le mesh usano normali flat per-faccia) |
| M-12 Undo/redo illimitato | ✅ `CommandStack`, testato con 50 cicli consecutivi |
| M-13 Duplica e istanze | ✅ duplica (copia profonda); le istanze (stesso `meshId` condiviso) non sono ancora esposte in UI |
| F-04 Gerarchia: rinomina, nascondi, blocca, raggruppa | ✅ |
| F-05 Pannello proprietà con trasformo numerico | ✅ |

## Non ancora fatto / noto mancante

- **M-10 non collegato**: `shading.smooth`/`autoSmoothAngleDeg` sono dati nel modello ma `MeshSync` calcola sempre normali flat per-faccia; va aggiunto il calcolo delle normali "smooth" con soglia d'angolo.
- **Dialog parametri primitiva**: le primitive si creano con valori di default fissi; un pannello per scegliere segmenti/raggio/dimensioni alla creazione non è stato implementato (il PRD lo richiede solo per M-01 "parametri modificabili", interpretato qui come modificabili nel codice generatore — da rivedere se serve anche in UI già in questa fase).
- **Istanze vere** (`meshId` condiviso tra più oggetti): il modello dati le supporta ma non c'è ancora un comando "crea istanza" distinto da "duplica".
- **Selezione multipla nel viewport**: si seleziona solo dalla gerarchia (clic, clic+Ctrl/Shift per multi-selezione); non c'è ancora picking 3D nel viewport (arriva in Fase 3 con M-02/M-03).
- **Blocco (`locked`) non impedisce la modifica delle proprietà**: impedisce solo la cancellazione da tastiera; il pannello proprietà non disabilita ancora i campi per un oggetto bloccato.
- `EditableMesh` usa array JS dinamici, non ancora gli array tipizzati a capacità fissa con free-list previsti dal PRD per la struttura finale: non serve finché non esistono operazioni che cancellano elementi (Fase 4), ma andrà rifattorizzato allora.
- Non ancora verificato su Windows reale (vedi nota di Fase 1, ancora valida).

## Rischi osservati

- Nessun nuovo rischio rilevante in questa fase oltre a quelli già in nota (Fase 1: verifica su Windows reale non ancora fatta).

## Prossimi passi (Fase 3)

Modalità di selezione (oggetto/vertice/spigolo/faccia, tasti 1-4), selezione multipla/a riquadro/per loop/collegati, trasformazioni con gizmo e vincolo di asse, snap alla griglia (M-02, M-03, M-04, F-06).
