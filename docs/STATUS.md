# Stato del progetto

Aggiornato alla fine della **Fase 6** (materiali, texture, salvataggio progetto).

## Fatto in questa fase

| Requisito PRD | Stato |
| --- | --- |
| C-01 Materiali PBR base (colore, metallic, roughness, emissione) | ✅ colore/metallic/roughness editabili in UI; emissione presente nel modello dati ma senza controllo UI ancora |
| C-02 Assegnazione materiale a oggetto intero o a facce selezionate | ✅ (pulsante e tasto M) |
| C-03 Palette di materiali del progetto riutilizzabile | ✅ (`MaterialsPanel`, lista cliccabile) |
| C-04 Import texture PNG/JPG come mappa colore | ✅ import file → mappa `baseColor`; normal/roughness map non ancora esposte in UI (il modello dati le prevede) |
| C-05 Tiling, offset, rotazione texture | ⚠️ tiling esposto in UI; offset e rotazione presenti nel modello dati e applicati al rendering, ma senza controlli UI dedicati ancora |
| E-01 Formato progetto `.fab`, salvataggio | ✅ salva/apri funzionanti (round-trip verificato); **autosalvataggio non implementato** |

## Correzione importante rispetto alla Fase 2

`EditableMesh.faceMaterial` usava `0` come valore di default per "nessun materiale assegnato" — lo stesso indice del *primo* materiale reale in `materialSlots`. Assegnare un materiale a una singola faccia quindi ricolorava per errore l'intera mesh, perché tutte le altre facce (ancora al valore di default `0`) puntavano allo stesso slot. Corretto usando `-1` come sentinella dedicata; il rendering riserva sempre lo slot 0 del suo array di materiali Three.js al materiale di fallback, spostando di uno gli slot reali. Verificato con test unitari e visivamente in browser.

## Non ancora fatto / noto mancante

- **Autosalvataggio**: non implementato (il PRD lo richiede in E-01 insieme al salvataggio manuale).
- **Salvataggio via Tauri non testato**: solo il percorso web (download/upload del file) è stato eseguito ed è testato; il percorso nativo (dialog/fs di Tauri) non è mai girato in questo ambiente Linux.
- **Formato mesh su disco**: JSON invece del binario compatto descritto dal PRD (`meshes/<id>.bin`) — più semplice da implementare correttamente, round-trip verificato, ma più verboso su disco.
- **Normal map e roughness map**: nel modello dati (`MaterialDef.maps`) ma senza controlli UI per importarle separatamente dalla base color.
- **Offset e rotazione texture**: applicati al rendering ma senza campi numerici in UI (solo il tiling ha un controllo).
- **Nessuna riduzione texture oltre 4096px** e nessuna stima/avviso del budget VRAM.
- **Libreria texture con anteprime** (C-06, P1) e **proiezioni UV rapide** (U-02): fuori ambito, rimandate.
- Import di `.glb`/`.obj` (E-06) ed export FBX (E-02…E-04): arrivano in Fase 7.
- Non ancora verificato su Windows reale (nota ancora valida dalle fasi precedenti).

## Rischi osservati

- Nessun nuovo rischio strutturale in questa fase; la scoperta del bug sullo slot materiale di default rafforza la lezione della Fase 5 (preferire assert su valori esatti attesi, non solo "nessun errore").

## Prossimi passi (Fase 7)

UV automatiche (xatlas), editor UV, export `.fbx` (U-01, U-03, U-04, U-06, E-02…E-04) — il traguardo critico del PRD: da qui in poi un prop dovrebbe importarsi correttamente in Unity.
