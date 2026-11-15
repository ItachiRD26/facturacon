#!/usr/bin/env bash
# Renderiza la imagen para compartir (og.png). Las vistas del producto en la landing
# ya no son imágenes: son componentes (components/marketing/sistema-demo.tsx y factura-demo.tsx).
# Uso: bash scripts/landing-imagenes/render.sh   (requiere Microsoft Edge)
set -e
cd "$(dirname "$0")"
EDGE="/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
mkdir -p ../../public/landing
if [ -f og.html ]; then
  "$EDGE" --headless --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
    --window-size=1200,630 --virtual-time-budget=8000 \
    --screenshot="$(pwd -W)/../../public/og.png" "file:///$(pwd -W)/og.html" >/dev/null 2>&1
  echo "ok og"
fi
