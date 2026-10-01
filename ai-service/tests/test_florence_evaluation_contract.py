import importlib.util
from pathlib import Path
import tempfile
import unittest
spec=importlib.util.spec_from_file_location('florence_evaluation',Path(__file__).parents[1]/'tools'/'evaluate_florence_local.py')
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
class FlorenceEvaluationContractTest(unittest.TestCase):
    def test_caption_must_be_nonempty(self):
        self.assertEqual(module.validate_output('<CAPTION>','A visible cup',640,480),'A visible cup')
        for value in ['',None,[],{}]:
            with self.assertRaises(ValueError):module.validate_output('<CAPTION>',value,640,480)
    def test_location_token_separators_preserve_label(self):
        raw='</s><s><s><s>mug <loc_295> <loc_325> <loc_781> <loc_746> </s>'
        fixed=module.normalize_location_tokens(raw)
        self.assertIn('mug <loc_295><loc_325><loc_781><loc_746>',fixed)
        self.assertNotEqual(raw,fixed)
    def test_empty_detection_is_distinct_from_malformed(self):
        self.assertEqual(module.validate_output('<OD>',{'labels':[],'bboxes':[]},640,480),{'labels':[],'bboxes':[]})
        for value in [None,{}, {'labels':['cup'],'bboxes':[]}]:
            with self.assertRaises(ValueError):module.validate_output('<OD>',value,640,480)
    def test_detection_requires_finite_in_view_boxes(self):
        self.assertEqual(module.validate_output('<OD>',{'labels':['cup'],'bboxes':[[10,20,80,90]]},640,480)['labels'],['cup'])
        for box in [[0,0,float('nan'),10],[80,20,10,90],[0,0,1000,200]]:
            with self.assertRaises(ValueError):module.validate_output('<OD>',{'labels':['cup'],'bboxes':[box]},640,480)
    def test_fixture_paths_cannot_escape(self):
        with tempfile.TemporaryDirectory() as root:
            path=Path(root).resolve();(path/'fixture.png').write_bytes(b'fixture')
            self.assertEqual(module.safe_fixture_file(path,'fixture.png'),path/'fixture.png')
            with self.assertRaises(ValueError):module.safe_fixture_file(path,'../outside.png')
if __name__=='__main__':unittest.main()
