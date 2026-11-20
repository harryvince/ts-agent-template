// Renders every deploy target into .render/<target>, then runs the generated project's own checks.
const quick = Bun.argv.includes("--quick");
const only = Bun.argv.find((a) => a.startsWith("--target="))?.split("=")[1];
const root = new URL("..", import.meta.url).pathname;
const targets = ["cloudflare", "container", "none"].filter((t) => !only || t === only);

let failed = false;

for (const target of targets) {
  const dest = `${root}.render/${target}`;
  console.log(`\n=== ${target} → ${dest}`);
  await Bun.$`rm -rf ${dest}`;
  await Bun.$`copier copy --quiet --trust --defaults --data project_name=demo-${target} --data deploy_target=${target} --data run_setup=true ${root} ${dest}`;

  const steps = quick ? ["mise run check"] : ["mise run check", "hk check --all"];
  if (target === "cloudflare") steps.push("mise run build");
  if (target === "container" && !quick) steps.push("mise run image:scan");

  for (const step of steps) {
    const result = await Bun.$`sh -c ${step}`.cwd(dest).nothrow();
    console.log(`--- ${target}: ${step} → ${result.exitCode === 0 ? "ok" : "FAILED"}`);
    if (result.exitCode !== 0) failed = true;
  }
}

process.exit(failed ? 1 : 0);
