"""Read-only verification of this package manifest; runs no application/model tests."""
from pathlib import Path
import hashlib,sys
root=Path(__file__).resolve().parent
errors=[]
for line in (root/'MANIFEST-SHA256.txt').read_text().splitlines():
 expected,name=line.split('  ',1);p=root/name
 if not p.is_file() or p.is_symlink() or root not in p.resolve().parents or hashlib.sha256(p.read_bytes()).hexdigest()!=expected:errors.append(name)
print('PASS: package payload hashes match' if not errors else 'FAIL: '+str(errors));sys.exit(bool(errors))
