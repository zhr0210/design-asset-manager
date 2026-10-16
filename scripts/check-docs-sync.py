#!/usr/bin/env python3
"""Review documentation sync for an explicit candidate, never all unrelated WIP.

Use --paths-file (JSON path array) or --base (a local commit). Declarations may
explain why a subsystem's contracts are unchanged. This is a review prompt,
not an automatic semantic compatibility verdict.
"""
from __future__ import annotations
import argparse
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def assess(paths: list[str], topics: list[dict], declarations: dict | None = None) -> dict:
    declarations = declarations or {}
    errors = []
    if not isinstance(paths, list) or any(not isinstance(p, str) or p.startswith('/') or '..' in Path(p).parts or '\\' in p for p in paths):
        raise ValueError('Candidate paths must be normalized repository-relative strings')
    changed = set(paths)
    affected: dict[str, set[str]] = {}
    unmapped = []
    for path in paths:
        if not path.startswith(('src/', 'ai-service/', 'native/', 'pi-runtime/', 'scripts/')) or path.endswith('.md'):
            continue
        matches = []
        for topic in topics:
            exact = path in topic['sources']
            widths = [len(prefix) for prefix in topic.get('source_roots', [])
                      if (prefix.endswith('/') and path.startswith(prefix)) or path == prefix]
            if exact or widths:
                matches.append((len(path) + 1 if exact else max(widths), topic))
        if not matches:
            unmapped.append(path)
            continue
        best = max(width for width, _ in matches)
        for width, topic in matches:
            if width == best:
                affected.setdefault(topic['id'], set()).add(path)
    for topic in topics:
        if topic['id'] not in affected:
            continue
        owners = {topic['reference']} | {s for s in topic['sources'] if s.endswith('README.md')}
        declaration = declarations.get(topic['id'])
        if declaration is not None:
            if not isinstance(declaration, dict) or declaration.get('contracts') != 'unchanged' or not isinstance(declaration.get('reason'), str) or len(declaration['reason'].strip()) < 12:
                errors.append(f"{topic['id']}: invalid unchanged-contract declaration")
                continue
        if not (owners & changed) and not declaration:
            errors.append(f"{topic['id']}: review its owning reference or declare contracts unchanged with a reason")
    for path in unmapped:
        errors.append('Unmapped changed source: ' + path)
    return {'ok': not errors, 'affected': {k: sorted(v) for k, v in affected.items()},
            'unmapped': unmapped, 'errors': errors,
            'scope': 'Explicit candidate only; owning-doc changes/declarations require semantic review.'}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--mode', choices=['advisory', 'release', 'phase-summary'], default='advisory')
    scope = parser.add_mutually_exclusive_group()
    scope.add_argument('--paths-file', type=Path)
    scope.add_argument('--base')
    parser.add_argument('--declarations', type=Path)
    parser.add_argument('--json', action='store_true')
    args = parser.parse_args()
    try:
        if not args.paths_file and not args.base:
            report = {'ok': False, 'assessed': False, 'errors': ['No candidate scope supplied; use --paths-file or --base. Unrelated WIP is not assessed.']}
        else:
            if args.paths_file:
                paths = json.loads(args.paths_file.read_text())
            else:
                if args.base.startswith('-'):
                    raise ValueError('Invalid base commit')
                commit = subprocess.check_output(['git', 'rev-parse', '--verify', args.base + '^{commit}'], cwd=ROOT, text=True).strip()
                paths = subprocess.check_output(['git', 'diff', '--name-only', '-z', commit, 'HEAD', '--'], cwd=ROOT).decode().split('\0')
                paths = [p for p in paths if p]
            docmap = json.loads((ROOT / '.codeindex/documentation-map.json').read_text())
            topics = docmap['topics'] + docmap.get('planned_subsystems', []) + docmap.get('guides', [])
            declarations = json.loads(args.declarations.read_text()) if args.declarations else {}
            if not isinstance(declarations, dict):
                raise ValueError('Declarations must be an object keyed by subsystem')
            report = assess(paths, topics, declarations)
            report['assessed'] = True
    except (OSError, ValueError, KeyError, subprocess.CalledProcessError) as error:
        report = {'ok': False, 'assessed': False, 'errors': [str(error)]}
    if args.json:
        print(json.dumps(report, ensure_ascii=False, indent=2))
    else:
        print('Docs sync: ' + ('REVIEWED STRUCTURALLY' if report['ok'] else 'NOT ASSESSED' if not report['assessed'] else 'REVIEW REQUIRED'))
        for error in report['errors']:
            print('- ' + error)
    return 0 if report['ok'] or args.mode == 'advisory' else 1


if __name__ == '__main__':
    raise SystemExit(main())
