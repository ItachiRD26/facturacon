#!/usr/bin/env bash
# Renderiza las vistas HTML a PNG de alta resolución (2x) para la landing.
# Uso: bash scripts/landing-imagenes/render.sh   (requiere Microsoft Edge)
set -e
cd "$(dirname "$0")"
EDGE="/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
mkdir -p ../../public/landing
for f in dashboard factura inventario; do
  [ -f "$f.html" ] || continue
  "$EDGE" --headless --disable-gpu --hide-scrollbars --force-device-scale-factor=2 --default-background-color=00000000 \
    --window-size=1200,760 --virtual-time-budget=8000 \
    --screenshot="$(pwd -W)/../../public/landing/$f.png" "file:///$(pwd -W)/$f.html" >/dev/null 2>&1
  echo "ok $f"
done
if [ -f og.html ]; then
  "$EDGE" --headless --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
    --window-size=1200,630 --virtual-time-budget=8000 \
    --screenshot="$(pwd -W)/../../public/og.png" "file:///$(pwd -W)/og.html" >/dev/null 2>&1
  echo "ok og"
fi
