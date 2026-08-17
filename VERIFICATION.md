# Verification

Validated on 2026-08-17:

- `npm run check:project`: PASS
- 21 TS/TSX files parsed with TypeScript compiler API: 0 syntax errors
- Furniture movement logic tested against the real `createInitialHouseScene()` scene:
  - master bed before: `[-4.15, 0, 3.7]`
  - after one Right click: `[-4.00, 0, 3.7]`
  - vertical height remained `0`
- Bathroom shower checked at `[-1.15, 0, 3.78]`, inside the lower-left area of `zone_bath`.
- The old numeric furniture editor has been removed.
- Pascal Viewer remains the 3D renderer; no simplified replacement renderer is used.

## Build environment note

This execution environment could not resolve `registry.npmjs.org` (`EAI_AGAIN`), so a fresh network-dependent `npm install` / `next build` could not be completed here. The source-level and scene-logic checks above passed. The package is based on the previously deployable Pascal/Next.js project and keeps the same dependency versions.
