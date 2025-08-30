#!/usr/bin/env python3
import http.server
import socketserver
import os
from urllib.parse import unquote

class CORSRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        super().end_headers()
    
    def guess_type(self, path):
        mimetype, encoding = super().guess_type(path)
        if path.endswith('.glb'):
            return 'model/gltf-binary', encoding
        return mimetype, encoding

PORT = 8000
os.chdir(os.path.dirname(os.path.abspath(__file__)))

with socketserver.TCPServer(("", PORT), CORSRequestHandler) as httpd:
    print(f"🌐 Server running at http://localhost:{PORT}")
    print(f"📁 Serving files from: {os.getcwd()}")
    print(f"🎮 Game URL: http://localhost:{PORT}/index_autonomous.html")
    print("Press Ctrl+C to stop the server")
    httpd.serve_forever()
