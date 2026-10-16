#!/usr/bin/env python3
"""Check owned documentation links, navigation and lossless contract migration.

This checks structure and source preservation, not product completion or semantic
compatibility. It never runs commands named in documentation.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import re
import sys
import urllib.parse
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CHECKPOINT = 'docs/checkpoints/documentation-rebuild-20261015'


def without_fences(text: str) -> str:
    return re.sub(r'(?ms)^(`{3,}|~{3,})[^\n]*\n.*?^\1\s*$', '', text)


def anchors(text: str) -> set[str]:
    result = set(re.findall(r'<a\s+id=["\']([^"\']+)["\']', text))
    seen: dict[str, int] = {}
    for title in re.findall(r'^#{1,6}\s+(.+)$', without_fences(text), re.M):
        title = re.sub(r'\[([^]]+)\]\([^)]+\)', r'\1', title)
        slug = re.sub(r'[^\w\s\-\u4e00-\u9fff]', '', title.lower()).replace(' ', '-')
        count = seen.get(slug, 0)
        result.add(slug + (f'-{count}' if count else ''))
        seen[slug] = count + 1
    return result


def local_links(root: Path, relative: str) -> list[str]:
    file = root / relative
    errors = []
    if file.is_symlink() or not file.resolve().is_relative_to(root.resolve()):
        return [f'{relative}: document leaves owned repository scope']
    for match in re.finditer(r'(?<!!)\[[^\]\n]+\]\(([^)\n]+)\)', without_fences(file.read_text())):
        raw = match[1].strip().strip('<>')
        target = urllib.parse.urlsplit(raw)
        if target.scheme:
            continue
        dest = (file.parent / urllib.parse.unquote(target.path)) if target.path else file
        if not dest.resolve().is_relative_to(root.resolve()) or dest.is_symlink():
            errors.append(f'{relative}: target leaves owned repository scope {raw}')
        elif not dest.exists():
            errors.append(f'{relative}: missing target {raw}')
        elif target.fragment and dest.suffix == '.md' and urllib.parse.unquote(target.fragment) not in anchors(dest.read_text()):
            errors.append(f'{relative}: missing anchor {raw}')
    return errors


def canonical_text(text: str) -> str:
    # Link targets and heading depth change during relocation, not the contract.
    text = re.sub(r'\[([^]]+)\]\([^)]+\)', r'\1', text)
    text = re.sub(r'^#{1,6}\s+', '', text, flags=re.M)
    return ' '.join(text.split())


def paragraph_preserved(source: str, destination: str, anchor: str) -> bool:
    marker = f'<a id="{anchor}"></a>'
    return marker in destination and canonical_text(destination.split(marker, 1)[1].lstrip()).startswith(canonical_text(source))


def entry_navigation_errors(root: Path, entry: dict, kind: str) -> list[str]:
    """Runtime ownership and supporting guides have different human indexes."""
    ref = entry['reference']
    path = root / ref
    if path.is_symlink() or not path.resolve().is_relative_to(root.resolve()):
        return [f'{ref}: document leaves owned repository scope']
    if kind in ('subsystem', 'planned-subsystem'):
        if kind == 'planned-subsystem' and entry.get('status') != 'target-only':
            return [f'{ref}: planned subsystem must declare target-only']
        if kind == 'subsystem' and entry.get('status') == 'target-only':
            return [f'{ref}: target-only belongs in planned_subsystems']
        if ref != f"docs/subsystems/{entry['id']}.md":
            return [f'{ref}: software subsystem must use its canonical runtime reference']
        index = root / 'docs/subsystems/README.md'
    elif kind == 'guide':
        if not ref.startswith(('docs/agents/', 'docs/platform/', 'docs/product/')):
            return [f'{ref}: guide is not a software subsystem']
        index = root / entry.get('index', '')
        if index.is_symlink() or not index.resolve().is_relative_to(root.resolve()):
            return [f'{ref}: guide index leaves owned repository scope']
    else:
        return [f'{ref}: unknown documentation category']
    if not path.is_file() or not index.is_file():
        return [f'{ref}: document or human index is missing']
    if kind == 'planned-subsystem' and '状态：目标架构／尚未交付' not in path.read_text():
        return [f'{ref}: planned subsystem must visibly distinguish target from delivery']
    if '旧入口仅作兼容导航' in path.read_text():
        return [f'{ref}: compatibility entry cannot own a current topic']
    import os
    relative = Path(os.path.relpath(path, index.parent)).as_posix()
    if f'({relative})' not in index.read_text():
        return [f'{ref}: missing from its human {kind} index']
    return []


def verify(root: Path = ROOT, migration: bool = False) -> dict:
    errors: list[str] = []
    active = {str(p.relative_to(root)) for p in root.glob('*.md')}
    for folder in ['docs/subsystems', 'docs/product/specs', 'docs/adr/indexes']:
        active.update(str(p.relative_to(root)) for p in (root / folder).rglob('*.md'))
    active.update(['AGENTS.md', 'CONTRIBUTING.md', 'docs/code-standards.md', 'docs/product/README.md',
                   'docs/design/README.md', 'docs/platform/README.md', 'docs/history/README.md',
                   'docs/agents/implementation-status.md', 'docs/agents/ui-ux-acceptance.md',
                   'docs/agents/DEVELOPMENT-PROBLEMS.md', 'docs/agents/domain.md', 'docs/adr/README.md'])
    catalog = json.loads((root / '.codeindex/module-map.json').read_text())
    docmap = json.loads((root / '.codeindex/documentation-map.json').read_text())
    route_ids = set(catalog['routes'])
    topics = docmap['topics']
    guides = docmap.get('guides', [])
    planned = docmap.get('planned_subsystems', [])
    entries = topics + planned + guides
    if len({t['id'] for t in entries}) != len(entries):
        errors.append('Duplicate documentation topic')
    references = {t['reference'] for t in entries}
    for topic in entries:
        ref = topic['reference']
        kind = 'subsystem' if topic in topics else 'planned-subsystem' if topic in planned else 'guide'
        errors.extend(entry_navigation_errors(root, topic, kind))
        active.add(ref)
        for rid in topic['routes']:
            if rid not in route_ids:
                errors.append(f"{topic['id']}: unknown route {rid}")
        for source in topic['sources']:
            path = Path(source)
            if path.is_absolute() or '..' in path.parts or not (root / path).is_file():
                errors.append(f"{topic['id']}: invalid source {source}")
            if source.endswith('README.md'):
                active.add(source)
        for profile in topic['test_profiles']:
            if profile not in json.loads((root / '.codeindex/tests-map.json').read_text()):
                errors.append(f"{topic['id']}: unknown test profile {profile}")
        text = (root / ref).read_text()
        for heading in ['职责与状态权威', '正式入口与运行链', '失败、取消与兼容保护', '技术与平台边界', '源码与详细机制', '验证与维护']:
            section = re.search(rf'(?ms)^## {heading}\n(.*?)(?=^## |\Z)', text)
            if not section or len(section[1].strip()) < 25:
                errors.append(f'{ref}: missing substantive section {heading}')
    for rid, route in catalog['routes'].items():
        if not route.get('documentation'):
            errors.append(f'{rid}: no documentation consumer')
        for ref in route.get('documentation', []):
            if ref not in references:
                errors.append(f'{rid}: unowned documentation reference {ref}')
    active.update(docmap.get('module_references', []))
    active.update(docmap.get('active_contracts', []))
    for path in sorted(active):
        if not (root / path).is_file():
            errors.append('Missing owned document: ' + path)
            continue
        errors.extend(local_links(root, path))
    decisions = {str(p.relative_to(root)) for p in (root / 'docs/adr').glob('[0-9][0-9][0-9][0-9]-*.md')}
    current_terms = re.findall(r'^\*\*(.+)\*\*:', (root / 'CONTEXT.md').read_text(), re.M)
    if len(current_terms) != len(set(current_terms)):
        errors.append('Duplicate glossary terms')
    paragraph_count = 0
    if migration:
        cp = root / CHECKPOINT
        baseline = json.loads((cp / 'baseline.json').read_text())
        module_docs = {r['path'] for r in baseline['files'] if r['path'].endswith('/README.md')
                       and r['path'].startswith(('src/', 'ai-service/', 'native/', 'pi-runtime/'))
                       and 'prototype' not in r['path']}
        for relative in sorted(module_docs - active):
            errors.extend(local_links(root, relative))
        active.update(module_docs)
        mapping = json.loads((cp / 'adr-migration.json').read_text())
        dispositions = json.loads((cp / 'document-disposition.json').read_text())
        source_paths = {r['path'] for r in baseline['files'] if r['path'].endswith('.md')}
        if source_paths != {r['path'] for r in dispositions['records']}:
            errors.append('Document disposition does not cover the baseline Markdown corpus')
        decisions = {str(p.relative_to(root)) for p in (root / 'docs/adr').glob('[0-9][0-9][0-9][0-9]-*.md')}
        if decisions != {r['path'] for r in mapping['records']}:
            errors.append('ADR migration does not cover every decision')
        paragraph_count = 0
        with zipfile.ZipFile(cp / 'before.zip') as archive:
            for record in mapping['records']:
                source = archive.read(record['path']).decode()
                if hashlib.sha256(source.encode()).hexdigest() != record['source_sha256']:
                    errors.append('ADR source identity changed: ' + record['path'])
                blocks = re.split(r'\n\s*\n', source.split('\n', 1)[1].strip())
                if record['decision'] == 'extract-detail-preserve-decision' and len(blocks) != len(record['paragraphs']):
                    errors.append('Unmapped ADR paragraphs: ' + record['path'])
                for item in record['paragraphs']:
                    paragraph_count += 1
                    block = blocks[item['source_paragraph'] - 1]
                    if hashlib.sha256(block.encode()).hexdigest() != item['source_sha256']:
                        errors.append('ADR paragraph identity mismatch: ' + item['id'])
                    file, anchor = item['destination'].split('#')
                    destination = (root / file).read_text()
                    marker = f'<a id="{anchor}"></a>'
                    if marker not in destination:
                        errors.append('Missing migrated paragraph: ' + item['id'])
                    else:
                        if not paragraph_preserved(block, destination, anchor):
                            errors.append('Migrated requirement changed/lost: ' + item['id'])
            module_mapping = json.loads((cp / 'module-migration.json').read_text())
            for item in module_mapping['records']:
                if item.get('decision') != 'extract-scoped-contract':
                    continue
                source = archive.read(item['source']).decode()
                block = re.split(r'\n\s*\n', source.strip())[item['source_paragraph'] - 1]
                file, anchor = item['destination'].split('#')
                if not paragraph_preserved(block, (root / file).read_text(), anchor):
                    errors.append('Module contract changed/lost: ' + item['destination'])
            # Frozen historical/evidence files are not rewritten just to tidy paths.
            for record in dispositions['records']:
                if record['action'] == 'preserve-source-bytes':
                    path = root / record['path']
                    if not path.is_file() or hashlib.sha256(path.read_bytes()).hexdigest() != record['sha256']:
                        errors.append('Frozen source modified: ' + record['path'])
            before_terms = re.findall(r'^\*\*(.+)\*\*:', archive.read('CONTEXT.md').decode(), re.M)
            current_terms = re.findall(r'^\*\*(.+)\*\*:', (root / 'CONTEXT.md').read_text(), re.M)
            if set(before_terms) != set(current_terms) or len(set(current_terms)) != len(current_terms):
                errors.append('Glossary term lost or duplicate left without a merge decision')
    return {'ok': not errors, 'scope': 'Structure/source preservation only; no product, UI, model or native acceptance.',
            'owned_documents_checked': len(active), 'subsystems': len(topics), 'planned_subsystems': len(planned), 'guides': len(guides), 'task_routes': len(route_ids),
            'decision_sources': len(decisions), 'migrated_paragraphs': paragraph_count, 'migration_assessed': migration,
            'glossary_definitions': len(current_terms), 'errors': errors}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--json', action='store_true')
    parser.add_argument('--migration', action='store_true', help='Audit this one-time migration against its local frozen baseline; not needed for ordinary CI.')
    args = parser.parse_args()
    try:
        report = verify(migration=args.migration)
    except (OSError, ValueError, KeyError, zipfile.BadZipFile) as error:
        report = {'ok': False, 'errors': [str(error)]}
    if args.json:
        print(json.dumps(report, ensure_ascii=False, indent=2))
    else:
        print('Documentation: ' + ('PASS' if report['ok'] else 'FAIL'))
        for error in report['errors']:
            print('- ' + error)
    return 0 if report['ok'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
