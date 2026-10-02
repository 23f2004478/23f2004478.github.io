import os
import re

repo_dir = "/home/krshnndu.guest/workhorse/krishnendu-me/repo"

excluded_dirs = {"archive", ".git"}
patterns = {
    "autonomous": re.compile(r"\bautonomous\b", re.IGNORECASE),
    "0600": re.compile(r"\b0600\b"),
    "24/7": re.compile(r"24/7"),
    "em_dash": re.compile(r"\u2014"),
    "en_dash": re.compile(r"\u2013"),
    "placecom": re.compile(r"placecom", re.IGNORECASE),
    "316331": re.compile(r"316[,\s]?331"),
    "zomato": re.compile(r"zomato", re.IGNORECASE),
    "inr": re.compile(r"\bINR\b"),
    "rupee": re.compile(r"₹"),
}

for root, dirs, files in os.walk(repo_dir):
    dirs[:] = [d for d in dirs if d not in excluded_dirs]
    for file in files:
        if file.endswith(('.html', '.css', '.js', '.txt', '.xml', '.json', '.md')):
            path = os.path.join(root, file)
            rel = os.path.relpath(path, repo_dir)
            with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            for name, pat in patterns.items():
                matches = pat.findall(content)
                if matches:
                    print(f"[{name}] {rel}: {len(matches)} matches")
