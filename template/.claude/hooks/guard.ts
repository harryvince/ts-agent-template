// PreToolUse: block hook bypasses outright; ask the human before rules get weakened.
const input = await Bun.stdin.json();
const tool: string = input.tool_name ?? "";
const args = input.tool_input ?? {};

function block(reason: string): never {
  console.error(`Blocked: ${reason}`);
  process.exit(2);
}

function ask(reason: string): never {
  console.log(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "ask",
        permissionDecisionReason: reason,
      },
    }),
  );
  process.exit(0);
}

if (tool === "Bash") {
  const cmd: string = args.command ?? "";
  const bypasses: Array<[RegExp, string]> = [
    [/--no-verify\b/, "--no-verify skips the mandatory hk hooks. Fix what the hook reports."],
    [/\bgit\s+commit\b[^|;&]*\s-(?!-)[a-zA-Z]*n[a-zA-Z]*\b/, "git commit -n skips the mandatory hk hooks."],
    [/\bHK=0\b|\bHK_SKIP_(STEPS|HOOKS)=/, "Skipping hk steps is not allowed. Fix the failure."],
    [/core\.hooksPath|\bhk\s+uninstall\b/, "Do not change or remove the git hooks."],
    [/(^|[;&|(]\s*|\bxargs\s+)(npm|npx|pnpm|yarn)\s/, "Use bun / bunx (and mise for non-npm tools), not npm/npx/pnpm/yarn."],
  ];
  for (const [pattern, reason] of bypasses) {
    if (pattern.test(cmd)) block(reason);
  }
  process.exit(0);
}

const path: string = args.file_path ?? "";
const text = [args.content, args.new_string, ...(args.edits ?? []).map((e: { new_string?: string }) => e.new_string)]
  .filter(Boolean)
  .join("\n");

const guarded = /(^|\/)(\.oxlintrc\.json|\.oxfmtrc\.json|tsconfig\.json|hk\.pkl|mise\.toml|trivy\.yaml|\.semgrepignore|bunfig\.toml)$|(^|\/)tools\/oxlint\/|(^|\/)\.claude\//;
if (guarded.test(path)) {
  ask(`${path} controls lint/type/hook/scan rules. Changing it needs human approval; fix the code instead of the rules where possible.`);
}

const suppressions = /oxlint-disable|eslint-disable|@ts-ignore|@ts-expect-error|@ts-nocheck|nosemgrep|trivy:ignore|as unknown as/;
if (suppressions.test(text)) {
  ask("This edit adds a lint/type/scan suppression. Fix the underlying issue instead, or get human approval.");
}
