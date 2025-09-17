#!/usr/bin/env python3
"""
Simple HTTP server for serving the vending machine monitor
"""
import http.server
import socketserver
import sys
import os
from pathlib import Path

class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(Path(__file__).parent), **kwargs)
    
    def log_message(self, format, *args):
        sys.stdout.write(f"{self.log_date_time_string()} - {format % args}\n")
        sys.stdout.flush()
    
    def end_headers(self):
        # Add CORS headers for development
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

def run_server(port=8000):
    """Run the HTTP server on the specified port"""
    try:
        with socketserver.TCPServer(("0.0.0.0", port), CustomHTTPRequestHandler) as httpd:
            print(f"Vending Machine Monitor server running on port {port}")
            print(f"Access the monitor at: http://localhost:{port}")
            sys.stdout.flush()
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server...")
    except Exception as e:
        print(f"Server error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    port = int(os.environ.get('PORT', 8000))
    run_server(port)