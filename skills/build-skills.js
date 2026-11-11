/**
 * Cross-platform launcher for skills/build-skills.sh.
 *
 * Windows hosts often lack `bash` on PATH (npm scripts run via cmd.exe),
 * so locate a bash executable explicitly: derive it from `git` on PATH,
 * then the Git for Windows registry entry, then well-known install roots,
 * and finally fall back to plain `bash`. On non-Windows just use `bash`.
 * All CLI arguments are passed through; stdio and exit codes are inherited.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const script = path.join(path.dirname(fileURLToPath(import.meta.url)), "build-skills.sh");
const isWin = process.platform === "win32";

/** <root>\cmd\git.exe (or <root>\bin\git.exe) → <root>\bin\bash.exe. */
function bashFromGitOnPath() {
  const r = spawnSync("where", ["git"], { encoding: "utf8" });
  if (r.status !== 0 || !r.stdout) return null;
  for (const line of r.stdout.split(/\r?\n/)) {
    const gitPath = line.trim();
    if (!gitPath) continue;
    const root = path.dirname(path.dirname(gitPath));
    for (const sub of ["bin", path.join("usr", "bin")]) {
      const p = path.join(root, sub, "bash.exe");
      if (existsSync(p)) return p;
    }
  }
  return null;
}

/** HKLM/HKCU SOFTWARE\GitForWindows InstallPath → <InstallPath>\bin\bash.exe. */
function bashFromRegistry() {
  for (const hive of ["HKLM", "HKCU"]) {
    const r = spawnSync(
      "reg",
      ["query", `${hive}\\SOFTWARE\\GitForWindows`, "/v", "InstallPath"],
      { encoding: "utf8" }
    );
    const m = r.status === 0 && r.stdout && r.stdout.match(/InstallPath\s+REG_SZ\s+(.+)/);
    if (!m) continue;
    const root = m[1].trim();
    for (const sub of ["bin", path.join("usr", "bin")]) {
      const p = path.join(root, sub, "bash.exe");
      if (existsSync(p)) return p;
    }
  }
  return null;
}

/** Ordered bash candidates; `bash` last so PATH misses fall through. */
function bashCandidates() {
  if (!isWin) return ["bash"];
  const found = [bashFromGitOnPath(), bashFromRegistry()].filter(Boolean);
  const roots = [
    process.env["ProgramFiles"],
    "C:\\Program Files (x86)",
    process.env["LocalAppData"] && path.join(process.env["LocalAppData"], "Programs", "Git"),
  ].filter(Boolean);
  for (const root of roots) {
    for (const sub of ["bin", path.join("usr", "bin")]) {
      const p = path.join(root, sub, "bash.exe");
      if (existsSync(p)) found.push(p);
    }
  }
  found.push("bash");
  return found;
}

for (const bash of bashCandidates()) {
  const r = spawnSync(bash, [script, ...process.argv.slice(2)], { stdio: "inherit" });
  if (!r.error) process.exit(r.status ?? 1);
}

console.error("build:skills: bash not found — install Git for Windows or add bash to PATH.");
process.exit(1);
