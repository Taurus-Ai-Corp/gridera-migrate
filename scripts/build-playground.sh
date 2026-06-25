     1|#!/usr/bin/env bash
     2|set -euo pipefail
     3|
     4|# Build the GRIDERA Migrate playground with inlined @noble/post-quantum bundle.
     5|# Usage: ./scripts/build-playground.sh [--watch]
     6|#
     7|# Outputs: playground.html (self-contained, zero external dependencies)
     8|
     9|SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
    10|ROOT_DIR="$(dirname "$SCRIPT_DIR")"
    11|ENTRY_FILE="$(mktemp /tmp/noble-entry-XXXXXX.js)"
    12|BUNDLE_FILE="$(mktemp /tmp/noble-bundle-XXXXXX.js)"
    13|SRC_HTML="$ROOT_DIR/playground.src.html"
    14|OUT_HTML="$ROOT_DIR/playground.html"
    15|
    16|cd "$ROOT_DIR"
    17|
    18|# 1. Create entry file for noble PQC subset
    19|cat > "$ENTRY_FILE" <<'EOF'
    20|export { ml_dsa65 } from "@noble/post-quantum/ml-dsa.js";
    21|export { sha256 } from "@noble/hashes/sha2.js";
    22|export { bytesToHex } from "@noble/hashes/utils.js";
    23|EOF
    24|
    25|# 2. Bundle with esbuild (IIFE, minified, browser-ready)
    26|NODE_PATH=./node_modules npx esbuild "$ENTRY_FILE" \
    27|  --bundle \
    28|  --format=iife \
    29|  --global-name=Noble \
    30|  --minify \
    31|  --outfile="$BUNDLE_FILE" \
    32|  --platform=browser \
    33|  --log-level=warning
    34|
    35|BUNDLE_SIZE=$(wc -c < "$BUNDLE_FILE" | tr -d ' ')
    36|echo "Noble PQC bundle: ${BUNDLE_SIZE} bytes"
    37|
    38|# 3. Splice bundle into playground HTML
    39|python3 -c "
    40|with open('$SRC_HTML', 'r') as f:
    41|    html = f.read()
    42|with open('$BUNDLE_FILE', 'r') as f:
    43|    bundle = f.read()
    44|if '/* NOBLE_BUNDLE_PLACEHOLDER */' not in html:
    45|    print('ERROR: Placeholder not found in playground.src.html')
    46|    exit(1)
    47|html = html.replace('/* NOBLE_BUNDLE_PLACEHOLDER */', bundle.strip())
    48|with open('$OUT_HTML', 'w') as f:
    49|    f.write(html)
    50|"
    51|
    52|OUT_SIZE=$(wc -c < "$OUT_HTML" | tr -d ' ')
    53|echo "Playground built: ${OUT_SIZE} bytes -> $OUT_HTML"
    54|
    55|# 4. Cleanup
    56|rm -f "$ENTRY_FILE" "$BUNDLE_FILE"
    57|
    58|echo "Done."
    59|