#!/usr/bin/env bash
# Claude Code PreToolUse hook — blocks git push if credentials detected.
# Receives tool input as JSON on stdin.

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('command',''))" 2>/dev/null)

# Only act on git push
echo "$COMMAND" | grep -qE '(^|&&|;)\s*git push' || exit 0

PATTERNS=(
    'AIza[0-9A-Za-z_-]{35}'
    '(SECRET|PASSWORD|TOKEN|API_KEY|FUID)=["\x27][A-Za-z0-9+/]{20,}["\x27]'
    '(SECRET|PASSWORD|TOKEN|API_KEY|FUID)=[A-Za-z0-9+/]{20,}[[:space:]]'
)

FOUND=0
HITS=""

scan_diff() {
    while IFS= read -r line; do
        for pattern in "${PATTERNS[@]}"; do
            if echo "$line" | grep -qE "$pattern"; then
                HITS="$HITS\n  $line"
                FOUND=1
                break
            fi
        done
    done < <(echo "$1" | grep '^+' | grep -v '^+++')
}

scan_diff "$(git diff HEAD~1..HEAD 2>/dev/null)"
scan_diff "$(git diff --cached 2>/dev/null)"

if [ "$FOUND" -ne 0 ]; then
    echo "Cass blocked the push — potential credentials detected:"
    echo -e "$HITS"
    echo ""
    echo "Replace real values with placeholders before pushing."
    exit 2
fi

exit 0
