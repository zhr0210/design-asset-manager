#!/usr/bin/env python3
"""Verify this documentation package only; never verifies the DAM application."""
from pathlib import Path
import hashlib
import json
import sys
root = Path(__file__).resolve().parents[1]
manifest = json.loads((root / 'PACKAGE-MANIFEST.json').read_text(encoding='utf-8'))
expected = manifest['files']
actual = {str(p.relative_to(root)).replace('\\','/'): p for p in root.rglob('*') if p.is_file() and p.name != 'PACKAGE-MANIFEST.json'}
errors = []
if set(actual) != set(expected):
    errors.append({'missing': sorted(set(expected)-set(actual)), 'extra': sorted(set(actual)-set(expected))})
for name, record in expected.items():
    path = actual.get(name)
    if path is not None and (path.stat().st_size != record['bytes'] or hashlib.sha256(path.read_bytes()).hexdigest() != record['sha256']):
        errors.append({'mismatch': name})
print(json.dumps({'scope':'documentation-package-only','checked':len(expected),'errors':errors,'status':'PASS' if not errors else 'FAIL'},ensure_ascii=False,indent=2))
sys.exit(1 if errors else 0)
