import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('local_ocr_worker', Path(__file__).parents[1] / 'tools' / 'local_ocr_worker.py')
worker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(worker)

class LocalOcrResultTest(unittest.TestCase):
    def test_empty_is_explicit(self):
        self.assertEqual(worker.normalize_blocks(None,100,100),[])
        self.assertEqual(worker.normalize_blocks([],100,100),[])
    def test_text_is_preserved_with_normalized_coordinates(self):
        result=worker.normalize_blocks([[[[0,0],[100,0],[100,50],[0,50]],'OCR 2026',.95]],100,100)
        self.assertEqual(result[0]['text'],'OCR 2026')
        self.assertEqual(result[0]['polygon'],[[0,0],[1,0],[1,.5],[0,.5]])
    def test_malformed_is_not_empty_success(self):
        for rows in [False,[[]],[[[], 'bad',.9]],[[[[0,0]]*4,'bad',float('nan')]]]:
            with self.assertRaises((ValueError,TypeError)):
                worker.normalize_blocks(rows,100,100)
    def test_threshold_does_not_change_original_text(self):
        row=[[[0,0],[100,0],[100,50],[0,50]],'ocr',.4]
        self.assertEqual(worker.normalize_blocks([row],100,100),[])
    def test_absurd_bounds_are_rejected(self):
        with self.assertRaises(ValueError):
            worker.normalize_blocks([[[[1000,0]]*4,'ocr',.9]],100,100)

if __name__=='__main__': unittest.main()
