#!/bin/bash

# DUHAT AI Backend Startup Helper
# Automatically binds to 0.0.0.0:8000 and displays local network IP addresses

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "========================================================"
echo "🚀 Starting DUHAT AI Sticker Backend Server"
echo "========================================================"

# Find local IP addresses
echo "📱 Local Network IP Addresses (use one of these in your Android phone settings):"
if command -v hostname &> /dev/null; then
    hostname -I 2>/dev/null | tr " " "\n" | grep -v '^$' | grep -v '127.0.0.1' | while read -r ip; do
        echo "   👉 http://${ip}:8000"
    done
elif command -v ifconfig &> /dev/null; then
    ifconfig | grep -E 'inet ' | awk '{print $2}' | grep -v '127.0.0.1' | while read -r ip; do
        echo "   👉 http://${ip}:8000"
    done
fi

echo ""
echo "💡 Android Emulator Default: http://10.0.2.2:8000"
echo "========================================================"
echo ""

if [ -f "./venv/bin/uvicorn" ]; then
    ./venv/bin/uvicorn main:app --reload --host 0.0.0.0 --port 8000
else
    uvicorn main:app --reload --host 0.0.0.0 --port 8000
fi
