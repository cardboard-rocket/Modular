import http.server
import socketserver
import os

PORT = 8004

class NoCacheHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        default_path = super().translate_path(path)
        # If the file doesn't exist, check in the 'public' directory
        if not os.path.exists(default_path):
            rel_path = os.path.relpath(default_path, os.getcwd())
            public_path = os.path.join(os.getcwd(), 'public', rel_path)
            if os.path.exists(public_path):
                return public_path
        return default_path

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

if __name__ == '__main__':
    with socketserver.TCPServer(("", PORT), NoCacheHTTPRequestHandler) as httpd:
        print(f"Serving at port {PORT} with no-cache headers. Access at http://localhost:{PORT}")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass
        httpd.server_close()
