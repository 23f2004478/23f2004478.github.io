import http.server
import socketserver
import threading
import subprocess
import os
import time
import json
import urllib.request
import re

PORT = 8991
DIRECTORY = '/home/krshnndu.guest/workhorse/krishnendu-me/repo'

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def log_message(self, format, *args):
        pass # Silence logs

httpd = socketserver.TCPServer(('127.0.0.1', PORT), Handler)
server_thread = threading.Thread(target=httpd.serve_forever, daemon=True)
server_thread.start()
print(f"HTTP Server started on http://127.0.0.1:{PORT}")

out_dir = '/home/krshnndu.guest/.hermes/artifacts/krishnendu-me/redesign-pro/shots_v12'
os.makedirs(out_dir, exist_ok=True)

targets = [
    ("home", "index.html"),
    ("multi-agent-platform", "work/multi-agent-platform/index.html"),
    ("model-routing", "work/model-routing-tiered-compute/index.html")
]

widths = [360, 390, 1440]
themes = ["light", "dark"]

# Estimated full page heights or let chrome render
# For 1440px desktop: home ~5000px, multi-agent ~4500px, model-routing ~4000px
# For 360/390px mobile: home ~8500px, multi-agent ~7500px, model-routing ~6500px
height_map = {
    ("home", 360): 9500,
    ("home", 390): 9000,
    ("home", 1440): 5500,
    ("multi-agent-platform", 360): 8000,
    ("multi-agent-platform", 390): 7500,
    ("multi-agent-platform", 1440): 5000,
    ("model-routing", 360): 7500,
    ("model-routing", 390): 7000,
    ("model-routing", 1440): 4800,
}

for slug, rel_path in targets:
    for w in widths:
        for th in themes:
            h = height_map.get((slug, w), 5000)
            url = f"http://127.0.0.1:{PORT}/{rel_path}?theme={th}"
            filename = f"{slug}_{w}px_{th}.png"
            filepath = os.path.join(out_dir, filename)
            
            cmd = [
                "/usr/bin/google-chrome",
                "--headless=new",
                "--disable-gpu",
                "--no-sandbox",
                "--hide-scrollbars",
                f"--window-size={w},{h}",
                f"--screenshot={filepath}",
                url
            ]
            
            res = subprocess.run(cmd, capture_output=True, text=True)
            if os.path.exists(filepath):
                size_kb = os.path.getsize(filepath) / 1024
                print(f"Captured {filename}: {w}x{h}px ({size_kb:.1f} KB)")
            else:
                print(f"FAILED {filename}: {res.stderr}")

httpd.shutdown()
print("Screenshot capture completed successfully.")
