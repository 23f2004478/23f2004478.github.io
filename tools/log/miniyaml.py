"""Minimal YAML subset reader (no PyYAML on the build host).

Supports: comments, nested mappings by 2-space indentation, block lists of
scalars ("- item"), inline flow mappings {a: b, c: d}, inline lists [a, b],
quoted and bare scalars, true/false/null, ints and floats. That is all the
log config files use. Anything else raises ValueError so a typo fails loudly.
"""
import re
from typing import Any


def _scalar(tok):
    t = tok.strip()
    if t == "":
        return None
    if (t[0] == t[-1]) and t[0] in "\"'" and len(t) >= 2:
        return t[1:-1]
    if t in ("true", "True"):
        return True
    if t in ("false", "False"):
        return False
    if t in ("null", "~"):
        return None
    if re.fullmatch(r"-?\d+", t):
        return int(t)
    if re.fullmatch(r"-?\d+\.\d+", t):
        return float(t)
    if t.startswith("{") and t.endswith("}"):
        return _flow_map(t[1:-1])
    if t.startswith("[") and t.endswith("]"):
        return [_scalar(x) for x in _split(t[1:-1]) if x.strip()]
    return t


def _split(s):
    out, cur, q, depth = [], "", None, 0
    for ch in s:
        if q:
            cur += ch
            if ch == q:
                q = None
            continue
        if ch in "\"'":
            q = ch
        elif ch in "[{":
            depth += 1
        elif ch in "]}":
            depth -= 1
        if ch == "," and depth == 0:
            out.append(cur)
            cur = ""
        else:
            cur += ch
    out.append(cur)
    return out


def _flow_map(body):
    d = {}
    for part in _split(body):
        if not part.strip():
            continue
        k, _, v = part.partition(":")
        d[_scalar(k)] = _scalar(v)
    return d


def _strip_comment(line):
    q = None
    for i, ch in enumerate(line):
        if q:
            if ch == q:
                q = None
        elif ch in "\"'":
            q = ch
        elif ch == "#" and (i == 0 or line[i - 1] in " \t"):
            return line[:i]
    return line


def loads(text) -> Any:
    lines = []
    for raw in text.splitlines():
        s = _strip_comment(raw).rstrip()
        if s.strip():
            lines.append((len(s) - len(s.lstrip(" ")), s.strip()))
    pos = 0

    def block(indent):
        nonlocal pos
        if pos >= len(lines):
            return None
        if lines[pos][1].startswith("- "):
            out = []
            while pos < len(lines) and lines[pos][0] == indent and lines[pos][1].startswith("- "):
                out.append(_scalar(lines[pos][1][2:]))
                pos += 1
            return out
        out = {}
        while pos < len(lines) and lines[pos][0] == indent:
            key, sep, rest = lines[pos][1].partition(":")
            if not sep:
                raise ValueError("bad yaml line: %r" % lines[pos][1])
            # keys like G:0001 contain a colon; re-split on ': ' or trailing ':'
            m = re.match(r"^(\"[^\"]*\"|'[^']*'|[^\s]+?):(\s|$)(.*)$", lines[pos][1])
            if not m:
                raise ValueError("bad yaml line: %r" % lines[pos][1])
            key, rest = _scalar(m.group(1)), m.group(3)
            pos += 1
            if rest.strip():
                out[key] = _scalar(rest)
            elif pos < len(lines) and lines[pos][0] > indent:
                out[key] = block(lines[pos][0])
            else:
                out[key] = None
        if pos < len(lines) and lines[pos][0] > indent:
            raise ValueError("bad indentation near: %r" % lines[pos][1])
        return out

    return block(lines[0][0]) if lines else {}


def load(path) -> Any:
    with open(path, encoding="utf-8") as f:
        return loads(f.read())
