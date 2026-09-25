# Stato del progetto

Aggiornato alla fine della **Fase 5** (loop cut, bevel, suddividi).

## Fatto in questa fase

| Requisito PRD | Stato |
| --- | --- |
| M-07 Loop cut | ✅ (Ctrl+R su uno spigolo selezionato) |
| M-07 Bevel di spigoli | ✅ semplificato a 1 segmento (Ctrl+B); N segmenti e chiusura a n-gon multi-spigolo non ancora fatti |
| M-07 Suddividi | ⚠️ funzione pronta e testata (`geometry/ops/subdivide`), **non collegata a UI/scorciatoia**; opera sull'intera mesh, non su una selezione |

## Correzione importante rispetto alla Fase 3

`EditableMesh.edgeLoop()` aveva un bug che lo faceva oscillare tra 2 sole facce invece di percorrere l'intero anello (l'operazione "spigolo opposto" veniva applicata due volte per passo). Non era visibile nei test della Fase 3 perché controllavano solo "almeno un elemento, nessun duplicato" — condizione che il bug soddisfaceva comunque. Corretto con un attraversamento entra/esci pulito; aggiunta anche la copertura per strisce aperte (percorre entrambe le direzioni dallo spigolo di partenza), utile per una riga/colonna di una griglia piana oltre che per un anello chiuso. Nuovi test verificano la dimensione esatta dell'anello, non solo l'assenza di duplicati.

## Non ancora fatto / noto mancante

- **Suddividi non ha una scorciatoia** (il PRD non ne specifica una) e opera sull'intera mesh, non su una selezione parziale.
- **Bevel**: solo 1 segmento, solo spigoli con esattamente 2 facce adiacenti (rifiuta gli spigoli di bordo); il caso "più spigoli bevelati che si incontrano su un vertice" (chiusura a n-gon, dal PRD) non è gestito — con un solo spigolo bevelabile per operazione, non si verifica ancora.
- **Nessuna anteprima interattiva col mouse** per loop cut (posizione del taglio) o bevel (distanza): entrambi si applicano subito con un valore di default, poi regolabile a mano con gli strumenti della Fase 3.
- **Coltello (knife) e booleane** (M-11): fuori ambito, P2.
- Non ancora verificato su Windows reale (nota ancora valida dalle fasi precedenti).

## Rischi osservati

- Il rischio "bevel/loop cut instabili su topologie complesse" segnalato dal PRD si è concretizzato una volta (il bug di `edgeLoop`), scoperto grazie ai test di regressione con conteggi esatti invece di asserzioni generiche. Lezione per le prossime fasi: preferire sempre assert su valori esatti attesi (conteggio facce/spigoli) piuttosto che solo "nessun errore/duplicato", specialmente per algoritmi di attraversamento del grafo half-edge.

## Prossimi passi (Fase 6)

Materiali PBR, texture, palette di progetto, salvataggio del formato `.fab` (C-01…C-05, E-01).
