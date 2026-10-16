"""Behavior tests for source-preservation and candidate-scoped document review."""
import importlib.util
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent

def load(name, filename):
    spec = importlib.util.spec_from_file_location(name, HERE / filename)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

sync = load('doc_sync', 'check-docs-sync.py')
docs = load('doc_checks', 'check-documentation.py')

class DocumentationGovernance(unittest.TestCase):
    def setUp(self):
        self.topic = {'id': 'search', 'reference': 'docs/subsystems/search.md',
                      'sources': ['src/main/search/query.ts', 'src/main/search/README.md'],
                      'source_roots': ['src/main/search/']}

    def test_unrelated_docs_or_scripts_cannot_make_source_sync_green(self):
        result = sync.assess(['src/main/search/query.ts', 'README.md', '.codeindex/module-map.json', 'docs/subsystems/other.md'], [self.topic])
        self.assertFalse(result['ok'])
        self.assertEqual(result['affected']['search'], ['src/main/search/query.ts'])

    def test_owning_reference_or_reasoned_unchanged_contract_is_explicit(self):
        self.assertTrue(sync.assess(['src/main/search/query.ts', 'docs/subsystems/search.md'], [self.topic])['ok'])
        result = sync.assess(['src/main/search/query.ts'], [self.topic],
                             {'search': {'contracts': 'unchanged', 'reason': 'Internal loop rewrite preserves query outcomes and authority.'}})
        self.assertTrue(result['ok'])
        self.assertFalse(sync.assess(['src/main/search/query.ts'], [self.topic], {'search': {'contracts': 'unchanged', 'reason': 'ok'}})['ok'])

    def test_new_siblings_are_scoped_and_unmapped_sources_are_observable(self):
        self.assertIn('search', sync.assess(['src/main/search/sibling.ts'], [self.topic])['affected'])
        self.assertEqual(sync.assess(['src/main/unknown/new.ts'], [self.topic])['unmapped'], ['src/main/unknown/new.ts'])
        with self.assertRaises(ValueError):
            sync.assess(['../../private/file'], [self.topic])

    def test_most_specific_owner_prevents_broad_parent_from_hiding_affected_module(self):
        parent = {'id':'host','reference':'docs/subsystems/host.md','sources':[],'source_roots':['src/main/']}
        result = sync.assess(['src/main/search/query.ts', 'docs/subsystems/host.md'], [parent, self.topic])
        self.assertEqual(set(result['affected']), {'search'})
        self.assertFalse(result['ok'])

    def test_broken_current_link_or_anchor_fails_but_literal_fenced_example_is_ignored(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root/'target.md').write_text('# Current\n\n<a id="stable"></a>\n')
            (root/'entry.md').write_text('[a](target.md#stable)\n\n```md\n[x](missing.md)\n```\n')
            self.assertEqual(docs.local_links(root, 'entry.md'), [])
            (root/'entry.md').write_text('[a](target.md#gone)\n[b](missing.md)\n')
            self.assertEqual(len(docs.local_links(root, 'entry.md')), 2)

    def test_numeric_boundaries_exceptions_and_whole_source_paragraph_survive_relocation(self):
        source = 'At most 50 items; cancellation retains committed results. [Owner](../old.md)'
        target = '<a id="p-001"></a>\n\nAt most 50 items; cancellation retains committed results. [Owner](../../new.md)\n'
        self.assertTrue(docs.paragraph_preserved(source, target, 'p-001'))
        self.assertFalse(docs.paragraph_preserved(source, target.replace('50', '500'), 'p-001'))
        self.assertFalse(docs.paragraph_preserved(source, target.replace('cancellation retains committed results.', ''), 'p-001'))
        self.assertFalse(docs.paragraph_preserved(source, target, 'p-002'))

    def test_links_cannot_read_external_markdown_through_traversal(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp) / 'repo'
            root.mkdir()
            (Path(tmp) / 'outside.md').write_text('# Private')
            (root / 'entry.md').write_text('[x](../outside.md#private)')
            self.assertIn('leaves owned repository scope', docs.local_links(root, 'entry.md')[0])

    def test_software_topics_and_guides_use_their_own_indexes(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / 'docs/subsystems').mkdir(parents=True)
            (root / 'docs/agents').mkdir(parents=True)
            (root / 'docs/subsystems/README.md').write_text('[GUI](gui-shell.md)\n')
            (root / 'docs/subsystems/gui-shell.md').write_text('# GUI\n')
            (root / 'docs/agents/engineering.md').write_text('# Engineering\n')
            (root / 'CONTRIBUTING.md').write_text('[Methods](docs/agents/engineering.md)\n')
            runtime = {'id': 'gui-shell', 'reference': 'docs/subsystems/gui-shell.md'}
            guide = {'id': 'engineering', 'reference': 'docs/agents/engineering.md',
                     'index': 'CONTRIBUTING.md'}
            self.assertEqual(docs.entry_navigation_errors(root, runtime, 'subsystem'), [])
            self.assertEqual(docs.entry_navigation_errors(root, guide, 'guide'), [])
            self.assertTrue(docs.entry_navigation_errors(root, guide, 'subsystem'))
            self.assertTrue(docs.entry_navigation_errors(root, runtime, 'guide'))
            (root / 'CONTRIBUTING.md').write_text('# No guide entry\n')
            self.assertTrue(docs.entry_navigation_errors(root, guide, 'guide'))
            guide['index'] = '../private.md'
            self.assertTrue(docs.entry_navigation_errors(root, guide, 'guide'))

    def test_delivery_guide_stays_a_real_sync_consumer_outside_software_topics(self):
        guide = {'id': 'delivery', 'reference': 'docs/platform/BUILD-AND-RELEASE.md',
                 'sources': ['scripts/package.mjs'], 'source_roots': []}
        missing = sync.assess(['scripts/package.mjs', 'docs/subsystems/gui-shell.md'], [guide])
        self.assertFalse(missing['ok'])
        self.assertEqual(missing['affected'], {'delivery': ['scripts/package.mjs']})
        self.assertTrue(sync.assess(['scripts/package.mjs', guide['reference']], [guide])['ok'])

    def test_planned_subsystem_needs_visible_state_and_cannot_count_as_current(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / 'docs/subsystems').mkdir(parents=True)
            (root / 'docs/subsystems/README.md').write_text('[Plugin](plugin-system.md)\n')
            target = root / 'docs/subsystems/plugin-system.md'
            entry = {'id':'plugin-system','reference':'docs/subsystems/plugin-system.md',
                     'status':'target-only'}
            target.write_text('状态：目标架构／尚未交付\n')
            self.assertEqual(docs.entry_navigation_errors(root, entry, 'planned-subsystem'), [])
            self.assertTrue(docs.entry_navigation_errors(root, entry, 'subsystem'))
            target.write_text('# Plugin\n')
            self.assertTrue(docs.entry_navigation_errors(root, entry, 'planned-subsystem'))
            entry.pop('status')
            self.assertTrue(docs.entry_navigation_errors(root, entry, 'planned-subsystem'))

if __name__ == '__main__':
    unittest.main()
