"""
Lightweight Local HTTP Server with Built-in Calendar Proxy
Serves static dashboard files and provides a safe local proxy for iCal feeds
to bypass browser cross-origin (CORS) restrictions.
"""

import http.server
import socketserver
import urllib.parse
import urllib.request

PORT = 8080

class DashboardHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

    def do_GET(self):
        # Local calendar proxy endpoint
        if self.path.startswith('/api/calendar?url='):
            raw_target = self.path[len('/api/calendar?url='):]
            target_url = urllib.parse.unquote(raw_target)
            try:
                req = urllib.request.Request(
                    target_url,
                    headers={'User-Agent': 'HomeDashboard/1.0 (Mozilla/5.0)'}
                )
                with urllib.request.urlopen(req, timeout=15) as resp:
                    data = resp.read()
                    self.send_response(200)
                    self.send_header('Content-Type', 'text/calendar; charset=utf-8')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(data)
            except Exception as e:
                self.send_response(502)
                self.send_header('Content-Type', 'text/plain')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(f"Calendar fetch error: {e}".encode('utf-8'))
            return

        super().do_GET()

if __name__ == '__main__':
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), DashboardHandler) as httpd:
        print(f"Home Dashboard server running at http://localhost:{PORT}")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server.")
            httpd.server_close()
