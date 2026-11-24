# ts-agent-template

A [Copier](https://copier.readthedocs.io) template for TypeScript apps that AI agents work on. Its agent guidance lives in `AGENTS.md`; project checks use mise, Git hooks and CI, regardless of which coding agent edits the project.

## New project

```bash
mise use -g copier                          # once
copier copy --trust gh:harryvince/ts-agent-template ~/dev/my-app
```

Copier asks for a name, a description and a deploy target (Cloudflare Workers, a container, or nothing yet). It then runs `git init`, `mise install` and `mise run setup` (bun install + hk hooks).

`--trust` is needed because the template runs those setup commands.

If your coding agent does not read `AGENTS.md` automatically, add it to that agent's project instructions.

## Pull template improvements into an existing project

```bash
cd ~/dev/my-app
copier update --trust          # 3-way merges template changes; conflicts show as .rej / inline markers
```

This is why the template is Copier rather than "copy the repo": standards keep flowing into every project. Copier uses the newest git tag, so tag template releases (`git tag v0.2.0 && git push --tags`).

## What you get

| Concern | Choice |
| --- | --- |
| Tools outside npm | **mise** (`mise.toml`, `mise.lock`): bun, hk, pkl, trivy, semgrep (pipx via uv, on a pinned Python), node only for Cloudflare's `cf` |
| Runtime / pkg manager / bundler | **Bun** (`bun build --compile`); `bunfig.toml` pins exact versions and blocks package versions younger than 7 days |
| Tests | **@effect/vitest** on the Bun runtime (`it.effect`, `layer(...)`, `TestClock`); HTTP tests hit a real `BunHttpServer.layerTest` server |
| Application code | **Effect 4**. AGENTS.md: check Effect natively, then the installed library's `ai-docs/` + `src/`, then hand-write |
| Typecheck | TypeScript 7 + `@effect/tsgo` (Effect diagnostics are compile errors; warnings fail) |
| Lint | **oxlint** type-aware + [anti-slop](https://github.com/dmmulroy/anti-slop) (vendored, + Effect rules) + [landmines](https://github.com/interfere-inc/landmines) + Effect oxlint presets + banned-imports list that points at the Bun/Effect replacement. `--deny-warnings` |
| Format | **oxfmt** (switch to `bun fmt` once `bun fmt --doctor` shows everything native) |
| Git hooks | **hk** (`hk.pkl`): pre-commit = format, lint, typecheck, test, trivy secrets, semgrep, trivy deps (on lockfile change), trivy config (on Containerfile/workflow change); pre-push = `mise run check` + `mise run scan` |
| Agent guidance | `AGENTS.md` gives any coding agent the project commands and conventions. Run `mise run check` before finishing; hk checks commits and pushes, and CI checks every PR |
| CI | `.github/workflows/ci.yml`: `hk check --all` (same steps as the hooks, all files) + build / image scan; actions pinned by SHA |
| Cloudflare target | `cf` CLI + `cloudflare.config.ts` + Cloudflare Vite plugin v2, no wrangler |
| Container target | `Containerfile`: Wolfi build stage → `bun build --compile` → `cgr.dev/chainguard/glibc-dynamic`, `USER nonroot` |

## Working on the template

```bash
mise install
mise run test         # renders every deploy target into .render/<target>, runs setup, check, hk check --all, build/image scan
mise run test:quick   # check only
```

Files ending in `.jinja` are rendered, and everything else is copied verbatim. File names with `{% if %}` are target-specific.

### Bumping versions

Versions are pinned in `template/package.json.jinja`, `template/mise.toml.jinja`, `template/hk.pkl` (amends URL), `template/Containerfile` (wolfi `bun=` apk version) and the CI action SHAs. Keep these pairs in sync:

- `oxlint` = `@oxlint/plugins`
- `@effect/tsgo` must list the chosen `oxlint`, `oxlint-tsgolint` and `typescript` versions as supported (see its README)
- `effect` = `@effect/platform-bun`
- `cf` and `@cloudflare/vite-plugin` move together

New versions must be at least 7 days old (Semgrep's bun rule requires a guard of at least 7 days) or `bun install` refuses them. Then run `mise run test`.

### Known temporary bits

- `bunfig.toml` exempts `@interfere/landmines` from the 7-day guard: 0.1.x is needed for the `no-comments` `allow` option that keeps anti-slop's `// SAFETY:` comments legal. Remove the exemption after 2026-11-26.
- `cf` and `@cloudflare/vite-plugin` v2 are release candidates.
- To try tsrs instead of tsgolint for type-aware lint, use `effect-tsgo --tsrs-lint oxlint ...` (experimental, same results and similar speed here).
