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

if __name__ == '__main__':
    unittest.main()
