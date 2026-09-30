#!/bin/bash
# ==============================================================================
# start-kiosk.sh - Raspberry Pi 3B+ Kiosk Mode Launcher
# ==============================================================================

# 1. Prevent screen blanking and disable display power management (DPMS)
xset s off
xset s noblank
xset -dpms

# 2. Hide mouse cursor after 0.5s of inactivity
unclutter -idle 0.5 -root &

# 3. Locate script directory and change into dashboard root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$SCRIPT_DIR" || exit 1

# 4. Start lightweight local Python HTTP server on port 8080 (binds to localhost)
# Serving locally eliminates file:// sandbox restrictions for clean fetch requests.
python3 -m http.server 8080 --bind 127.0.0.1 &
SERVER_PID=$!

# Ensure server terminates when this script exits
trap 'kill $SERVER_PID 2>/dev/null' EXIT

# Allow the server 1.5 seconds to bind
sleep 1.5

# 5. Clean up any previous crashed session locks to prevent "Chromium did not shut down cleanly" warnings
sed -i 's/"exited_cleanly":false/"exited_cleanly":true/' ~/.config/chromium/Default/Preferences 2>/dev/null
sed -i 's/"exit_type":"Crashed"/"exit_type":"Normal"/' ~/.config/chromium/Default/Preferences 2>/dev/null

# 6. Launch Chromium in dedicated hardware-efficient kiosk mode
chromium-browser \
  --noerrdialogs \
  --disable-infobars \
  --kiosk \
  --incognito \
  --disable-translate \
  --disable-features=TranslateUI \
  --disk-cache-dir=/dev/null \
  --disk-cache-size=1 \
  --disable-pinch \
  --overscroll-history-navigation=0 \
  --check-for-update-interval=31536000 \
  --disable-session-crashed-bubble \
  --disable-component-update \
  --disable-web-security \
  --user-data-dir=/tmp/chromium-kiosk-profile \
  http://127.0.0.1:8080
