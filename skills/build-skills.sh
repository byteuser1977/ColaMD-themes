#!/usr/bin/env bash
#
# Build agent-specific skill files from the canonical source.
#
# Usage:
#   bash skills/build-skills.sh          # generate all
#   bash skills/build-skills.sh claude   # generate for one agent
#
# Source:  skills/colamd-themes/SKILL.md
# Output:  .{agent}/skills/colamd-themes/SKILL.md (or equivalent)

set -euo pipefail
cd "$(dirname "$0")/.."

SOURCE="skills/colamd-themes/SKILL.md"
if [[ ! -f "$SOURCE" ]]; then
  echo "Error: Source skill not found: $SOURCE" >&2
  exit 1
fi

# Read the body (everything after the first blank line following the heading)
BODY=$(sed -n '/^$/,$ { /^# ColaMD/!p; }' "$SOURCE" | sed '1{/^$/d;}')

# ── Frontmatter templates ──

FRONT_CLAUDE='---
name: colamd-themes
description: >
  Generate, validate, export, and manage ColaMD v3.0 paradigm CSS themes.
  Extract formatting from URLs, DOCX, or PDF sources; export Markdown to
  standalone HTML/PDF with themes applied; batch export; manage theme
  configuration.
---'

FRONT_OPENCODE='---
name: colamd-themes
version: "1.0.0"
description: >
  Generate, validate, export, and manage ColaMD v3.0 paradigm CSS themes.
  Extract from URLs/DOCX/PDF; export Markdown to HTML/PDF; batch export.
user-invocable: true
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
---'

FRONT_OPENCLAW='---
id: colamd-themes
name: ColaMD Themes
description: >
  Generate, validate, export, and manage ColaMD v3.0 paradigm CSS themes.
  Extract from URLs/DOCX/PDF; export Markdown to HTML/PDF; batch export.
version: "1.0.0"
icon: "\U0001F3A8"
author: bytechain
homepage: https://github.com/byteuser1977/ColaMD-themes
user-invocable: true
metadata:
  openclaw:
    os: [darwin, linux, win32]
  clawdbot:
    emoji: "\U0001F3A8"
    requires:
      bins: [node, npm]
---'

FRONT_HERMES='---
name: colamd-themes
description: "Generate, validate, export, and manage ColaMD v3.0 paradigm CSS themes."
version: 1.0.0
author: bytechain
license: MIT
metadata:
  hermes:
    tags: [colamd, themes, css, markdown, export, pdf, html]
prerequisites:
  commands: [node, npm]
---'

FRONT_DSH='---
name: colamd-themes
version: "1.0.0"
description: >
  Generate, validate, export, and manage ColaMD v3.0 paradigm CSS themes.
  Extract from URLs/DOCX/PDF; export Markdown to HTML/PDF; batch export.
metadata:
  dsh:
    tags: [colamd, themes, css, markdown, export, pdf, html]
prerequisites:
  commands: [node, npm]
---'

# ── Generator functions ──

generate_claude() {
  local dir=".claude/skills"
  mkdir -p "$dir"
  local file="$dir/colamd-themes.skill.md"
  echo "$FRONT_CLAUDE" > "$file"
  echo "" >> "$file"
  echo "$BODY" >> "$file"
  echo "  → $file"
}

generate_opencode() {
  local dir=".opencode/skills/colamd-themes"
  mkdir -p "$dir"
  local file="$dir/SKILL.md"
  echo "$FRONT_OPENCODE" > "$file"
  echo "" >> "$file"
  echo "$BODY" >> "$file"
  echo "  → $file"
}

generate_openclaw() {
  local dir=".openclaw/skills/colamd-themes"
  mkdir -p "$dir"
  local file="$dir/SKILL.md"
  echo "$FRONT_OPENCLAW" > "$file"
  echo "" >> "$file"
  echo "$BODY" >> "$file"
  echo "  → $file"
}

generate_hermes() {
  local dir=".hermes/skills/tools/colamd-themes"
  mkdir -p "$dir"
  local file="$dir/SKILL.md"
  echo "$FRONT_HERMES" > "$file"
  echo "" >> "$file"
  echo "$BODY" >> "$file"
  echo "  → $file"
}

generate_dsh() {
  local dir=".dsh/skills/colamd-themes"
  mkdir -p "$dir"
  local file="$dir/SKILL.md"
  echo "$FRONT_DSH" > "$file"
  echo "" >> "$file"
  echo "$BODY" >> "$file"
  echo "  → $file"
}

generate_trae() {
  local dir=".trae/rules"
  mkdir -p "$dir"
  local file="$dir/colamd-themes.md"
  # Trae uses plain Markdown, no YAML frontmatter
  echo "# ColaMD Themes Skill Instructions" > "$file"
  echo "" >> "$file"
  echo "When the user asks to create, validate, export, or manage ColaMD themes, use the following CLI tool:" >> "$file"
  echo "" >> "$file"
  echo "$BODY" >> "$file"
  echo "  → $file"
}

# ── Main ──

TARGET="${1:-all}"
echo "Building skill files from: $SOURCE"
echo ""

case "$TARGET" in
  claude)   generate_claude ;;
  opencode) generate_opencode ;;
  openclaw) generate_openclaw ;;
  hermes)   generate_hermes ;;
  trae)     generate_trae ;;
  dsh)      generate_dsh ;;
  all)
    generate_claude
    generate_opencode
    generate_openclaw
    generate_hermes
    generate_trae
    generate_dsh
    ;;
  *)
    echo "Unknown agent: $TARGET" >&2
    echo "Usage: $0 [claude|opencode|openclaw|hermes|trae|dsh|all]" >&2
    exit 1
    ;;
esac

echo ""
echo "Done. Skill files generated."
