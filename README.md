# Monorepo Locking Starter

This repo demonstrates **module/feature-level write locks** with:
- Local enforcement (read-only workspaces + pre-commit guard)
- Server enforcement (GitHub Action)
- Simple CLI: `featurectl`

## Quick start
```bash
pnpm i
pnpm run prepare   # installs Husky hooks
pnpm run featurectl -- status
pnpm run featurectl -- checkout auth   # take lock on 'auth' module
pnpm -C apps/web dev                   # run the web app
```

## Notes
- Locks live under `locks/active/*.lock` (JSON with `{ module, owner, branch, timestamp }`).
- Modules and their directories are defined in `modules.yaml`.
- CI rejects PRs that modify modules you haven't locked.
- By default, sparse-checkout materializes only your modules. To include other modules read-only, set `FEATURECTL_INCLUDE_READONLY=1` before `featurectl checkout`/`sync`.

See `tools/featurectl.js` and `tools/hook-helpers.js` for details.