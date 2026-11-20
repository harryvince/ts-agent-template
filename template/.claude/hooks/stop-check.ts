// Stop: the agent may not finish while `mise run check` fails on a changed tree.
const input = await Bun.stdin.json();
const cwd = process.env["CLAUDE_PROJECT_DIR"] ?? process.cwd();

const status = await Bun.$`git status --porcelain`.cwd(cwd).quiet().nothrow();
if (status.stdout.toString().trim() === "") process.exit(0);

// Loop guard: if we already blocked and nothing changed since, let the agent stop and report.
const diff = await Bun.$`git diff HEAD --stat --no-color; git status --porcelain`.cwd(cwd).quiet().nothrow();
const hash = Bun.hash(diff.stdout).toString();
const marker = `${cwd}/.git/claude-stop-check`;
const previous = await Bun.file(marker).text().catch(() => "");
if (input.stop_hook_active && previous === hash) process.exit(0);

const check = await Bun.$`mise run check`.cwd(cwd).quiet().nothrow();
if (check.exitCode === 0) process.exit(0);

await Bun.write(marker, hash);
const output = `${check.stdout}${check.stderr}`.split("\n").slice(-80).join("\n");
console.error(`mise run check fails. Fix every error before finishing (don't weaken rules or suppress):\n${output}`);
process.exit(2);
