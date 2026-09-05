#!/bin/bash
# อเวจี — เปิดเกมบนเครื่อง (ES modules ต้องเสิร์ฟผ่าน http:// เปิดไฟล์ตรง ๆ ไม่ได้)
DIR="$(cd "$(dirname "$0")" && pwd)"
PORT=8777

if ! curl -s -o /dev/null "http://localhost:${PORT}/index.html"; then
  osascript -e "tell application \"Terminal\"
    do script \"cd '${DIR}' && echo '🔥 อเวจี: http://localhost:${PORT}' && python3 -m http.server ${PORT}\"
  end tell" &>/dev/null
  sleep 1
fi

open "http://localhost:${PORT}/index.html"
echo "🔥 เปิดเกมที่ http://localhost:${PORT}"
