#!/usr/bin/env bash
set -euo pipefail

PROFILE_DIR="tokens/session/Default"
ARCHIVE="tokens.zstd"
REMOTE="cloud"

clean_profile() { 
  echo "[*] Cleaning Chrome profile at $PROFILE_DIR"

  echo "[*] Clear caches..." 
  rm -rf "$PROFILE_DIR/Cache" \
         "$PROFILE_DIR/Code Cache" \
         "$PROFILE_DIR/GPUCache" \
         "$PROFILE_DIR/Media Cache" \
         "$PROFILE_DIR/ShaderCache" \
         "$PROFILE_DIR/GrShaderCache" || true

  echo "[*] Clear ServiceWorker cache (keep database for push keys)..." 
  rm -rf "$PROFILE_DIR/Service Worker/CacheStorage" \
         "$PROFILE_DIR/Service Worker/ScriptCache" || true

  echo "[*] Clean Metrics & temp" 
  rm -f "$PROFILE_DIR"/BrowserMetrics* \
        "$PROFILE_DIR"/*.tmp || true
}

compress_profile() { 
  echo "[*] Compressing profile → $ARCHIVE"
  # archive only the contents of Default/, not the folder itself
  tar -I "zstd -19 --long=30" -cf "$ARCHIVE" -C "$PROFILE_DIR" .
}

extract_profile() { 
  echo "[*] Extracting $ARCHIVE → $PROFILE_DIR"
  mkdir -p "$PROFILE_DIR"
  tar -I "zstd --long=30" -xf "$ARCHIVE" -C "$PROFILE_DIR"
}

case "${1:-}" in 
  push) 
    clean_profile
    compress_profile
    echo "[*] Deleting remote..."
    rclone delete "$REMOTE:$ARCHIVE" -P || true
    echo "[*] Uploading to remote..."
    rclone copy "$ARCHIVE" "$REMOTE:" -P
    ;;
  pull) 
    echo "[*] Downloading from remote..."
    rclone copy "$REMOTE:$ARCHIVE" . -P
    extract_profile
    rm -f "./$ARCHIVE"
    ;;
  *) 
    echo "Usage: $0 {push|pull}" 
    exit 1 
    ;; 
esac
