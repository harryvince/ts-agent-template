// PostToolUse: immediate oxfmt + oxlint feedback on the file just edited.
const input = await Bun.stdin.json();
const path: string = input.tool_input?.file_path ?? "";
if (!/\.(ts|tsx|js|mjs|cjs)$/.test(path) || /\/(node_modules|\.claude|tools\/oxlint)\//.test(path)) process.exit(0);

const cwd = process.env["CLAUDE_PROJECT_DIR"] ?? process.cwd();
await Bun.$`bun --bun oxfmt ${path}`.cwd(cwd).quiet().nothrow();
const lint = await Bun.$`bun --bun effect-tsgo oxlint --type-aware --deny-warnings ${path}`.cwd(cwd).quiet().nothrow();
if (lint.exitCode !== 0) {
  console.error(`oxlint found problems in ${path}. Fix them now (don't suppress):\n${lint.stdout}${lint.stderr}`);
  process.exit(2);
}
