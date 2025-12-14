#!/bin/bash

# PWA Icon Generator for BTCSignal.ai
# This script generates the required PWA icons from the existing apple-touch-icon.png

echo "Generating PWA icons..."

# Ensure icons directory exists
mkdir -p static/icons

# Generate 192x192 icon
sips -z 192 192 static/apple-touch-icon.png --out static/icons/icon-192x192.png
echo "Created 192x192 icon"

# Generate 512x512 icon
sips -z 512 512 static/apple-touch-icon.png --out static/icons/icon-512x512.png
echo "Created 512x512 icon"

echo "PWA icons generated successfully!"
echo ""
echo "Generated icons:"
ls -lh static/icons/

echo ""
echo "Note: The icons were upscaled from 180x180. For best quality, consider:"
echo "1. Creating original 512x512 icon in a graphics editor"
echo "2. Then downscaling to 192x192"
