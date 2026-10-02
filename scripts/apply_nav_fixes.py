import re
from pathlib import Path

repo = Path('/home/krshnndu.guest/workhorse/krishnendu-me/repo')

# 1. Update all HTML files for nav links
for html_file in repo.glob('**/*.html'):
    if '.git' in html_file.parts or 'archive' in html_file.parts:
        continue
    content = html_file.read_text(encoding='utf-8')
    orig = content
    content = content.replace('<li><a href="/#experience" class="nav-link">Experience</a></li>', '<li><a href="/#internships" class="nav-link">Internships</a></li>')
    content = content.replace('<li><a href="/#experience" class="footer-link">Experience</a></li>', '<li><a href="/#internships" class="footer-link">Internships</a></li>')
    if content != orig:
        html_file.write_text(content, encoding='utf-8')
        print(f"Updated nav in {html_file.relative_to(repo)}")

# 2. Update qualitykiosk-estimation-platform/index.html
qk_file = repo / 'work/qualitykiosk-estimation-platform/index.html'
if qk_file.exists():
    text = qk_file.read_text(encoding='utf-8')
    text = text.replace('requiring extensive manual cleanup before migration to test management systems.', 'requiring extensive manual cleanup before upload to test management systems.')
    qk_file.write_text(text, encoding='utf-8')
    print("Updated qk_file")

# 3. Update vc-deal-analytics-power-bi/index.html
vc_file = repo / 'work/vc-deal-analytics-power-bi/index.html'
if vc_file.exists():
    text = vc_file.read_text(encoding='utf-8')
    text = text.replace('Venture capital investment committees manage complex', 'Venture capital investment teams manage complex')
    vc_file.write_text(text, encoding='utf-8')
    print("Updated vc_file")

# 4. Update llms-full.txt and llms.txt
llms_full_file = repo / 'llms-full.txt'
if llms_full_file.exists():
    text = llms_full_file.read_text(encoding='utf-8')
    text = text.replace('## Detailed Work & Education History', '## Detailed Internships & Education History')
    text = text.replace('### Work History', '### Internships & Experience')
    text = text.replace('Tata Steel (Apr 2025 to Jun 2025): Research Analyst.', 'Tata Steel (Apr 2025 to Jun 2025): Research Analyst Intern.')
    text = text.replace('IIM Ranchi Social Impact (Jan 2024 to Feb 2024): Social Impact Intern. Assessed 390+ rural students under Unnat Bharat Abhiyan', 'IIM Ranchi / Unnat Bharat Abhiyan (Jan 2024 to Feb 2024): Social Impact Intern. Assessed 390+ rural students')
    llms_full_file.write_text(text, encoding='utf-8')
    print("Updated llms_full_file")

print("Finished updates.")
