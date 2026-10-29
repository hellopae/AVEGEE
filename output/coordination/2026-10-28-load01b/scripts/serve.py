import http.server, socketserver, sys, os
os.chdir(sys.argv[2])
class H(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control','no-store, must-revalidate'); super().end_headers()
    def log_message(self,*a): pass
class S(socketserver.ThreadingMixIn, http.server.HTTPServer): daemon_threads=True
S(('',int(sys.argv[1])),H).serve_forever()
