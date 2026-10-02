import os
import re
from pathlib import Path

repo_root = Path('/home/krshnndu.guest/workhorse/krishnendu-me/repo')

print("=== Checking all invariants across repo ===")

checks = {
    "em_dash": re.compile(r'[\u2014]'),
    "en_dash": re.compile(r'[\u2013]'),
    "html_dash": re.compile(r'&[mn]dash;'),
    "autonomous": re.compile(r'\bautonomous\b', re.IGNORECASE),
    "0600": re.compile(r'\b0600\b'),
    "24/7": re.compile(r'24/7'),
    "placecom": re.compile(r'placecom', re.IGNORECASE),
    "316331": re.compile(r'316[,\s]?331'),
    "zomato": re.compile(r'zomato', re.IGNORECASE),
    "inr": re.compile(r'\bINR\b'),
    "rupee": re.compile(r'₹'),
    "bank_names": re.compile(r'\b(Axis|HDFC|ICICI|SBI|Kotak|IndusInd|Citibank|Barclays)\b', re.IGNORECASE),
    "trained_ml_model": re.compile(r'\btrained (?:ML )?model\b', re.IGNORECASE),
    "devops_migration": re.compile(r'Azure DevOps.*migration|migration.*Azure DevOps|migration to test management', re.IGNORECASE),
    "experience_nav": re.compile(r'href=["\']/#experience["\']|>Experience<', re.IGNORECASE),
    "work_experience_heading": re.compile(r'Work Experience', re.IGNORECASE),
}

files_to_check = []
for p in repo_root.rglob('*'):
    if not p.is_file() or '.git' in p.parts or 'scripts' in p.parts or 'archive' in p.parts:
        continue
    if p.suffix in ['.html', '.txt', '.md', '.xml', '.css', '.js', '.json']:
        files_to_check.append(p)

total_findings = 0
for p in sorted(files_to_check):
    rel = p.relative_to(repo_root)
    text = p.read_text(encoding='utf-8', errors='ignore')
    for name, regex in checks.items():
        matches = list(regex.finditer(text))
        if matches:
            total_findings += len(matches)
            for m in matches:
                line_num = text[:m.start()].count('\n') + 1
                line = text.splitlines()[line_num - 1] if line_num - 1 < len(text.splitlines()) else ""
                print(f"[{name}] {rel}:{line_num}: {line.strip()[:100]}")

print(f"\nTotal findings: {total_findings}")
