# Stato del progetto

Aggiornato alla fine della **Fase 9** (proiezioni UV, seam, libreria texture).

## Fatto in questa fase

| Requisito PRD | Stato |
| --- | --- |
| U-02 Proiezioni rapide per faccia: planare, box, cilindrica | ✅ (box già dalla Fase 7) |
| U-05 Marcatura di seam manuali prima dell'unwrap | ⚠️ marcatura e visualizzazione (rosso) funzionanti; **nessun algoritmo di unwrap usa ancora i seam** per decidere i tagli |
| C-06 Libreria di texture del progetto con anteprime | ✅ |

## Correzione importante rispetto alla Fase 7

L'editor UV mostrava un layout memoizzato sul riferimento all'oggetto mesh, ma le operazioni di unwrap/seam modificano l'array `heUv` sul posto (stessa istanza `EditableMesh`) — quindi il pannello non si aggiornava mai dopo il primissimo render. Scoperto verificando dal vivo una proiezione cilindrica in questa fase: l'editor mostrava ancora le UV di default della primitiva. **Questo significa che lo screenshot di verifica dell'unwrap automatico nella Fase 7 mostrava in realtà le UV di default**, non il risultato della proiezione — l'algoritmo di unwrap stesso era (ed è) corretto, come confermano i test unitari; solo la sua visualizzazione nell'editor non si aggiornava. Corretto aggiungendo la revisione del documento alle dipendenze del memo, con un test di regressione dedicato.

## Non ancora fatto / noto mancante

- **Seam non usati funzionalmente**: sono marcabili e visibili (rosso) ma nessuna delle proiezioni rapide li usa per decidere dove tagliare l'unwrap — servono solo da indicatore visivo per ora.
- **Coordinate UV non normalizzate**: proiezioni planare/cilindrica/a scatola usano le coordinate del mondo direttamente; per oggetti più grandi di 1 m il layout eccede lo spazio 0..1 texture (dato corretto, solo non riscalato).
- **Nessuna scorciatoia da tastiera** per le nuove funzioni (proiezioni, seam): solo dal menu UV.
- Non ancora verificato su Windows reale né in Unity (note ancora valide dalle fasi precedenti).

## Rischi osservati

- Il bug dell'editor UV (memoization stale su mutazione in-place) è un pattern che potrebbe ripetersi altrove se in futuro si aggiungono altri pannelli che leggono dati mutabili di `EditableMesh`/`Document` tramite `useMemo`: vanno sempre inclusi `revision` (o un equivalente) tra le dipendenze quando i dati sorgente possono cambiare senza che l'identità dell'oggetto cambi.

## Prossimi passi (Fase 10, P1)

Import `.glb`/`.obj`, report di export completo (E-05), aggiornamento su versione precedente (D-06), rifinitura prestazioni sulla scena di riferimento (200k triangoli, ≥60 fps, <2GB VRAM).
