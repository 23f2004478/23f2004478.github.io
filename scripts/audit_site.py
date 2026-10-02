import os
import re
from pathlib import Path
from html.parser import HTMLParser

repo_root = Path('/home/krshnndu.guest/workhorse/krishnendu-me/repo')

print("=== 1. Prohibited Terms Check ===")
prohibited = {
    'em_dash': re.compile(r'\u2014'),
    'en_dash': re.compile(r'\u2013'),
    'autonomous': re.compile(r'\bautonomous\b', re.IGNORECASE),
    '0600': re.compile(r'\b0600\b'),
    '24/7': re.compile(r'24/7')
}

violations = []
for p in repo_root.rglob('*'):
    if not p.is_file() or '.git' in p.parts or 'scripts' in p.parts:
        continue
    is_archive = 'archive' in p.parts
    
    if p.suffix in ['.html', '.txt', '.md', '.xml', '.css', '.js', '.json']:
        try:
            content = p.read_text(encoding='utf-8')
        except Exception:
            continue
            
        for term, regex in prohibited.items():
            if term == 'autonomous' and is_archive:
                continue
            matches = list(regex.finditer(content))
            if matches:
                rel = p.relative_to(repo_root)
                for m in matches:
                    line_num = content[:m.start()].count('\n') + 1
                    line = content.splitlines()[line_num - 1]
                    violations.append(f"[{term}] {rel}:{line_num}: {line.strip()[:100]}")

if violations:
    print(f"Found {len(violations)} violations:")
    for v in violations:
        print(" ", v)
else:
    print("Zero prohibited term violations found!")

print("\n=== 2. Internal Link Checker ===")
html_files = [p for p in repo_root.rglob('*.html') if '.git' not in p.parts]
link_errors = []

class LinkExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []
    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        if tag in ['a', 'link'] and 'href' in attrs_dict:
            self.links.append((tag, attrs_dict['href']))
        elif tag in ['script', 'img'] and 'src' in attrs_dict:
            self.links.append((tag, attrs_dict['src']))

for h in html_files:
    text = h.read_text(encoding='utf-8')
    parser = LinkExtractor()
    parser.feed(text)
    
    for tag, val in parser.links:
        if not val or val.startswith(('http://', 'https://', 'mailto:', 'tel:', '#', 'data:')):
            continue
        clean_val = val.split('#')[0]
        if not clean_val:
            continue
        
        if clean_val.startswith('/'):
            target_path = repo_root / clean_val.lstrip('/')
        else:
            target_path = h.parent / clean_val
            
        if clean_val.endswith('/') or target_path.is_dir():
            target_path = target_path / 'index.html'
            
        if not target_path.exists():
            link_errors.append(f"{h.relative_to(repo_root)}: Missing target for {val} -> {target_path}")

if link_errors:
    print(f"Found {len(link_errors)} link errors:")
    for e in link_errors:
        print(" ", e)
else:
    print(f"All internal links verified across {len(html_files)} HTML files!")

print("\n=== 3. Critical Assets Check ===")
assets = [
    'resume/Krishnendu-Biswas-Resume.pdf',
    'assets/avatar.webp',
    'assets/favicon.svg',
    'assets/favicon-32x32.png',
    'assets/favicon-16x16.png',
    'assets/apple-touch-icon.png',
    'fonts/Fraunces-Variable.woff2',
    'fonts/SourceSans3-Variable.woff2',
    'fonts/JetBrainsMono-Variable.woff2',
    'styles.css',
    'theme.js'
]
for a in assets:
    p = repo_root / a
    if p.exists():
        print(f"[OK] {a} exists ({p.stat().st_size} bytes)")
    else:
        print(f"[FAIL] {a} MISSING!")
