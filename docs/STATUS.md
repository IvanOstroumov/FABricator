# Stato del progetto

Aggiornato alla fine della **Fase 4** (estrudi, inset, cancella).

## Fatto in questa fase

| Requisito PRD | Stato |
| --- | --- |
| M-05 Cancella con un solo tasto (Canc), senza menu | ✅ consapevole della modalità di selezione (oggetto/vertice/spigolo/faccia) |
| M-06 Estrudi facce, inset facce | ✅ estrudi (facce, via Ctrl+E) e inset (per faccia, via I); **estrudi spigoli non incluso** (solo facce, vedi sotto) |

## Non ancora fatto / noto mancante

- **Estrudi spigoli** (M-06 la lista anche per gli spigoli, non solo le facce): non implementato in questa fase; `regionOffset` è generico e potrebbe supportarlo con un adattamento, ma non è stato collegato a un comando/scorciatoia.
- **Inset "modalità regione"**: ogni faccia selezionata viene insettata indipendentemente, non come un'unica area unita (caso raro, rimandato).
- **Formula di inset approssimata** (verso il centroide, non la bisettrice esatta del PRD): corretto visivamente per gli n-gon regolari attuali, da rivedere se servirà precisione su poligoni irregolari.
- **Nessuna anteprima interattiva** per estrudi/inset: si applicano subito con un valore di default (0.5 m / 0.15 m), poi l'utente regola con gli strumenti della Fase 3 (G in modalità faccia/vertice). Il PRD descrive un'anteprima dal vivo col mouse prima di confermare.
- **Coltello (knife) e booleane**: fuori ambito, sono P2 (M-11), non previste prima.
- Non ancora verificato su Windows reale (nota ancora valida dalle fasi precedenti).

## Rischi osservati

- Il rischio più alto del PRD ("bevel e loop cut su mesh irregolari") non è ancora stato affrontato: arriva in Fase 5. Estrudi/inset di questa fase, essendo basati su un'unica funzione di ricostruzione generica (`regionOffset`), si sono dimostrati semplici da validare (26 test unitari, tutti verdi) — buon segno per l'affidabilità delle prossime operazioni più complesse.

## Prossimi passi (Fase 5)

Loop cut, bevel di spigoli, suddividi (M-07), su cubo e cilindro, senza produrre facce degeneri.
