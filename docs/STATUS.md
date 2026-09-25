# Stato del progetto

Aggiornato alla fine della **Fase 8** (mirror, merge, riempi buchi, bridge).

## Fatto in questa fase

| Requisito PRD | Stato |
| --- | --- |
| M-08 Unisci vertici (al centro, al primo, per distanza) | ✅ |
| M-08 Riempi buchi | ✅ |
| M-08 Bridge tra due loop | ✅ (senza gestione dell'inversione, vedi sotto) |
| M-09 Specchio (mirror) non distruttivo su un asse | ✅ anteprima live + "Applica" per renderlo reale |

## Non ancora fatto / noto mancante

- **Merge/riempi/bridge solo da menu**: nessuna scorciatoia da tastiera dedicata (il PRD non ne specifica una in tabella).
- **Bridge non prova l'inversione di un anello**: solo le rotazioni vengono testate per l'allineamento, non anche il verso opposto; su bordi con orientamento incompatibile la striscia di quad puo' avere normali invertite.
- **Specchio nello spazio locale dell'oggetto**: su una mesh simmetrica rispetto alla propria origine, l'anteprima si sovrappone esattamente all'originale (comportamento corretto, come in Blender, ma visivamente "silenzioso" finché non si applica su una mesh/pivot asimmetrici).
- Non ancora verificato su Windows reale né in Unity (note ancora valide dalle fasi precedenti).

## Rischi osservati

- Nessun nuovo rischio: le funzioni di questa fase riutilizzano gli stessi pattern (ricostruzione della mesh, `MeshTopologyCommand`) già validati nelle fasi 4-5, e sono state verificate sia con test unitari sia dal vivo in browser (specchio: 12→24→12 triangoli; riempi buco: 12→10→12).

## Prossimi passi (Fase 9, P1)

Proiezioni UV rapide (planare, cilindrica), seam manuali prima dell'unwrap, libreria texture con anteprime (U-02, U-05, C-06).
