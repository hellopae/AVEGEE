#!/usr/bin/env python3
"""เสิร์ฟไฟล์แบบห้ามแคช — ใช้ตอนพัฒนา/ทดสอบเท่านั้น

เจอ 10 ก.ย. 2569: python -m http.server ปล่อยให้ Chrome แคช ES module ไว้
แล้วเสิร์ฟซ้ำโดยไม่ revalidate (transferSize 0) — แก้โค้ดแล้วรีเฟรชก็ยังรันของเก่า
ไล่บั๊กผิดตัวไปหลายรอบเพราะเรื่องนี้ ทดสอบทีไรให้ใช้ตัวนี้แทน
"""
import http.server, socketserver, sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8777

class H(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()
    def log_message(self, *a): pass

with socketserver.TCPServer(('', PORT), H) as httpd:
    print(f'เสิร์ฟที่ http://localhost:{PORT} (ห้ามแคช)')
    httpd.serve_forever()
