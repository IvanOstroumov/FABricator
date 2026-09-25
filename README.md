# FABricator

Editor 3D desktop per Windows per modellare, colorare/texturizzare ed esportare in FBX props statici pronti per Unity. Vedi `docs/STATUS.md` per lo stato di avanzamento e `CHANGELOG.md` per la cronologia delle modifiche.

Stack: Tauri 2, React 19 + TypeScript (strict), Three.js, Zustand.

## Sviluppo

```bash
npm install
npm run dev        # solo frontend (Vite, http://localhost:1420)
npm run tauri dev  # app desktop completa (richiede le dipendenze di sistema di Tauri)
```

## Test

```bash
npx tsc -b          # type-check
npm run lint         # oxlint
npm run test:unit    # Vitest (geometry, commands, ecc.)
npm run test:e2e     # Playwright (avvia automaticamente il dev server)
```

## Build installer Windows

```bash
npm run release   # tauri build -> src-tauri/target/release/bundle/nsis/*.exe
```

Va eseguito su Windows (o tramite la GitHub Action `release.yml`, che builda su `windows-latest` a ogni tag `v*`): Tauri su Linux richiede le librerie di sviluppo GTK/WebKitGTK, non necessarie per il target finale.
