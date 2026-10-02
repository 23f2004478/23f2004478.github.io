def lum(r, g, b):
    def f(c):
        c = c / 255.0
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)

def contrast(hex1, hex2):
    r1, g1, b1 = int(hex1[1:3], 16), int(hex1[3:5], 16), int(hex1[5:7], 16)
    r2, g2, b2 = int(hex2[1:3], 16), int(hex2[3:5], 16), int(hex2[5:7], 16)
    l1, l2 = lum(r1, g1, b1), lum(r2, g2, b2)
    lighter = max(l1, l2)
    darker = min(l1, l2)
    return (lighter + 0.05) / (darker + 0.05)

print("--- Light Mode ---")
bg_light = '#F6F3EC'
box_light = '#EFECE4'
for c in ['#19181A', '#3E3A35', '#4F4B46', '#1F5C4A', '#FFFFFF']:
    print(f"{c} on {bg_light}: {contrast(c, bg_light):.2f}:1")
    print(f"{c} on {box_light}: {contrast(c, box_light):.2f}:1")

print("--- Dark Mode ---")
bg_dark = '#141416'
box_dark = '#1B1B1E'
for c in ['#ECE7DC', '#A8A39B', '#B5B0A6', '#5FC4A6', '#7EE0C4', '#141416']:
    print(f"{c} on {bg_dark}: {contrast(c, bg_dark):.2f}:1")
    print(f"{c} on {box_dark}: {contrast(c, box_dark):.2f}:1")
