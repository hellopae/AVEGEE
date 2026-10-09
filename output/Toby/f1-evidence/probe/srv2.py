import http.server, sys, os
ROOT=sys.argv[2]; OVR=sys.argv[3]
class H(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        p=path.split('?')[0]
        if p in ('/src/room.js','/src/frontier.js'): return os.path.join(OVR,p.lstrip('/'))
        return os.path.join(ROOT,p.lstrip('/'))
    def end_headers(self):
        self.send_header('Cache-Control','no-store'); self.send_header('Access-Control-Allow-Origin','*'); super().end_headers()
    def log_message(self,*a): pass
http.server.ThreadingHTTPServer(('',int(sys.argv[1])),H).serve_forever()
