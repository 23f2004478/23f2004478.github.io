import http.server
import socketserver
import threading
import subprocess
import os

PORT = 8992
DIRECTORY = '/home/krshnndu.guest/workhorse/krishnendu-me/repo'

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def log_message(self, format, *args):
        pass

httpd = socketserver.TCPServer(('127.0.0.1', PORT), Handler)
server_thread = threading.Thread(target=httpd.serve_forever, daemon=True)
server_thread.start()

out_dir = '/home/krshnndu.guest/.hermes/artifacts/krishnendu-me/redesign-pro/shots_v12'
os.makedirs(out_dir, exist_ok=True)

targets = [
    ("memory-self-documentation", "work/memory-self-documentation/index.html"),
    ("reliability-security", "work/reliability-security/index.html"),
    ("finance-ledger-agent", "work/finance-ledger-agent/index.html"),
    ("linkedin-studio", "work/linkedin-studio/index.html"),
]

widths = [360, 1440]
themes = ["light", "dark"]

for slug, rel_path in targets:
    for w in widths:
        for th in themes:
            h = 7500 if w == 360 else 5000
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
print("All case study screenshots captured successfully.")
