#!/bin/bash
# ==============================================================================
# setup-pi.sh - Automated Provisioning Script for Raspberry Pi 3B+ Kiosk
# ==============================================================================

set -e

echo "=========================================="
echo " Provisioning Raspberry Pi 3B+ Kiosk..."
echo "=========================================="

# 1. Install prerequisites
echo "--> Installing Chromium, unclutter, and xdotool..."
sudo apt-get update
sudo apt-get install -y chromium-browser unclutter xdotool python3

# 2. Make start script executable
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
chmod +x "$SCRIPT_DIR/start-kiosk.sh"

# 3. Configure autostart depending on desktop environment
AUTOSTART_DIR="$HOME/.config/lxsession/LXDE-pi"
AUTOSTART_FILE="$AUTOSTART_DIR/autostart"

if [ -d "$AUTOSTART_DIR" ]; then
  echo "--> Detected LXDE/X11 desktop. Adding kiosk launcher to $AUTOSTART_FILE..."
  # Check if entry already exists
  if ! grep -q "start-kiosk.sh" "$AUTOSTART_FILE" 2>/dev/null; then
    echo "@$SCRIPT_DIR/start-kiosk.sh" >> "$AUTOSTART_FILE"
  fi
else
  echo "--> Creating Wayland / Labwc autostart directory..."
  LABWC_DIR="$HOME/.config/labwc"
  mkdir -p "$LABWC_DIR"
  if ! grep -q "start-kiosk.sh" "$LABWC_DIR/autostart" 2>/dev/null; then
    echo "$SCRIPT_DIR/start-kiosk.sh &" >> "$LABWC_DIR/autostart"
  fi
fi

# 4. Disable display blanking in lightdm
LIGHTDM_CONF="/etc/lightdm/lightdm.conf"
if [ -f "$LIGHTDM_CONF" ]; then
  echo "--> Disabling screen sleep in $LIGHTDM_CONF..."
  if ! grep -q "xserver-command=X -s 0 -dpms" "$LIGHTDM_CONF"; then
    sudo sed -i 's/^#xserver-command=X/xserver-command=X -s 0 -dpms/' "$LIGHTDM_CONF"
  fi
fi

echo ""
echo "=========================================="
echo " Setup complete!"
echo " Test immediately by running:"
echo "   $SCRIPT_DIR/start-kiosk.sh"
echo " Or reboot to test autostart:"
echo "   sudo reboot"
echo "=========================================="
