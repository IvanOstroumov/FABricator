# Stato del progetto

Aggiornato alla fine della **Fase 3** (modalità di selezione, trasformazioni modali, snap).

## Fatto in questa fase

| Requisito PRD | Stato |
| --- | --- |
| M-02 Modalità selezione oggetto/vertice/spigolo/faccia (tasti 1-4) | ✅ |
| M-03 Selezione multipla (Shift/Ctrl+clic); "seleziona collegati" | ⚠️ multi-selezione ok; "seleziona collegati" (L) e selezione a riquadro **non ancora esposti in UI** (la mesh li supporta: `connectedFaces()` esiste) |
| M-04 Sposta/ruota/scala con trasformazione modale da tastiera e vincolo di asse | ✅ (G, Maiusc+E, Maiusc+R + X/Y/Z); gizmo visuale (Q/W/E/R) **non ancora collegato** |
| F-06 Snap alla griglia e a incrementi di rotazione | ✅ applicato nel trasformo modale |

## Non ancora fatto / noto mancante

- **Gizmo di trasformazione**: i pulsanti Q/W/E/R nella toolbar cambiano solo lo "strumento attivo" ma non pilotano ancora un gizmo nel viewport (`TransformControls` di Three.js, previsto ma non integrato). L'unico modo per spostare/ruotare/scalare oggi è il modale da tastiera.
- **Selezione a riquadro (box select)** e **"seleziona collegati" (L/Ctrl+L)**: non esposti come interazione utente, anche se la mesh half-edge ha già `connectedFaces()` pronto.
- **Edge loop (Alt+clic)**: `EditableMesh.edgeLoop()` esiste ma non è collegato a un'interazione di selezione nel viewport.
- **Vincolo di asse globale, non locale**: X/Y/Z durante un trasformo modale usa sempre gli assi del mondo.
- **Picking O(n) per clic** senza BVH: adeguato per le primitive attuali (poche centinaia di vertici), da rivedere con `three-mesh-bvh` quando le mesh cresceranno (Fase 5+).
- **Le scorciatoie modali richiedono il focus sul viewport** (clic nel viewport prima di premere G/1-4/ecc.): un clic su un pulsante della UI sposta il focus altrove. Comportamento tipico di un editor 3D, ma da tenere a mente nei test.
- **Oggetti bloccati (`locked`)**: la trasformazione modale non li rispetta ancora (solo la cancellazione da tastiera lo fa, dalla Fase 2).
- Non ancora verificato su Windows reale (nota ancora valida dalle fasi precedenti).

## Correzione importante rispetto alla Fase 2

I generatori di primitive create nella Fase 2 duplicavano i vertici per ogni faccia (nessuna condivisione), quindi la mesh half-edge non era mai realmente "connessa" (ogni spigolo risultava di bordo, senza twin). Questo non si notava visivamente ma rompeva le funzionalità di topologia richieste da questa fase ("seleziona collegati", edge loop). I 6 generatori sono stati riscritti per condividere i vertici tra facce adiacenti, mantenendo comunque UV corrette ai seam grazie alle UV per-corner già previste dal modello dati (`heUv`). Tutti i test di Fase 2 continuano a passare; ne sono stati aggiunti di nuovi per la connettività.

## Rischi osservati

- Nessun nuovo rischio rispetto a quelli già in nota nelle fasi precedenti.

## Prossimi passi (Fase 4)

Estrudi facce/spigoli, inset, cancella (M-05, M-06), più il gizmo di trasformazione (`TransformControls`) rimasto in sospeso da questa fase.
