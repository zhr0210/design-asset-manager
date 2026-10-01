import unittest,tempfile,pathlib,json,importlib.util,hashlib
spec=importlib.util.spec_from_file_location('anchor',pathlib.Path(__file__).with_name('ai-handoff-anchor.py'));a=importlib.util.module_from_spec(spec);spec.loader.exec_module(a)
class AnchorTests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory(prefix='dam-anchor-v2-');self.root=pathlib.Path(self.temp.name).resolve();self.run='.ai-run/test-run';self.dir=self.root/self.run;self.dir.mkdir(parents=True);(self.root/'src').mkdir();(self.root/'src/file.ts').write_text('source\n');self.files={'src/file.ts':a.H(b'source\n')}
  self.raw={'anchorVersion':2,'runId':'test-run','executionState':'COMPLETED','action':'STOP','completionScope':'DP01 isolated restricted','reviewStatus':'PASS','verificationStatus':'VERIFIED_ISOLATED','limitations':['REAL_ACCOUNT_NOT_RUN'],'nextBatchAuthorized':False,'automaticResume':False,'fullWorkspaceSnapshot':False,'source':{'aggregateSha256':a.aggregate(self.files,a.JSON_ALG)}}
  self.manifest={'files':self.files,'digestAlgorithm':a.JSON_ALG,'aggregateSha256':a.aggregate(self.files,a.JSON_ALG)}
  for n in ['REPORT.md','REVIEW.md','REVIEW-FINAL.md','EVIDENCE-MAP.json']:(self.dir/n).write_text('{}')
  self.save()
  (self.dir/'STATE.json').write_text(json.dumps({'executionState':'COMPLETED','action':'STOP'}))
 def tearDown(self):self.temp.cleanup()
 def save(self):
  (self.dir/'FINAL-HANDOFF.json').write_text(json.dumps(self.raw));(self.dir/'SOURCE-MANIFEST.json').write_text(json.dumps(self.manifest))
 def test_v2_read_is_nonmutating_preserves_limits(self):
  value,_=a.inspect(self.root,self.run);self.assertEqual(value['limitations'],['REAL_ACCOUNT_NOT_RUN']);self.assertFalse((self.root/'.ai-run/LATEST.json').exists());self.assertFalse(value['automaticResume'])
 def test_pi_adapter(self):
  self.raw={'status':'COMPLETED_RESTRICTED_SCOPE','state':'STOP','source':{'aggregateSha256':a.aggregate(self.files,a.JSON_ALG)},'nextBatchAuthorized':False,'notRun':['Windows'],'stillNotImplemented':['auth-network']};self.manifest.pop('digestAlgorithm');self.save();(self.dir/'STATE.json').write_text(json.dumps({'state':'STOP','status':self.raw['status']}));value,_=a.inspect(self.root,self.run);self.assertEqual(value['completionScope'],'COMPLETED_RESTRICTED_SCOPE');self.assertEqual(value['limitations'],['Windows','auth-network'])
 def test_ocr_adapter(self):
  self.raw={'state':'COMPLETED','action':'STOP','sourceDigest':a.aggregate(self.files,a.OCR_ALG),'scope':'OCR-only','notRun':['model'],'nextBatchAuthorized':False,'automaticResume':False};self.save();(self.dir/'STATE.json').write_text('{"state":"COMPLETED"}');(self.dir/'AGGREGATE-SOURCES.json').write_text(json.dumps({'files':self.files,'digestAlgorithm':a.OCR_ALG,'sourceDigest':self.raw['sourceDigest']}));self.assertEqual(a.inspect(self.root,self.run)[0]['rawAdapter'],'ocr-v1')
 def test_unknown_format_rejected(self):
  self.raw={'state':'STOP','nextBatchAuthorized':False};self.save();self.assertRaises(ValueError,a.inspect,self.root,self.run)
 def test_pending_failed_blocked_not_completed(self):
  for state in ['IN_PROGRESS','FAILED','BLOCKED']:
   self.raw['executionState']=state;self.save();self.assertRaises(ValueError,a.inspect,self.root,self.run)
 def test_review_pending_rejected(self):
  self.raw['reviewStatus']='REVIEW_PENDING';self.save();self.assertRaises(ValueError,a.inspect,self.root,self.run)
 def test_source_mismatch(self):
  (self.root/'src/file.ts').write_text('changed');self.assertRaises(ValueError,a.inspect,self.root,self.run)
 def test_unknown_algorithm(self):
  self.manifest['digestAlgorithm']='guess';self.save();self.assertRaises(ValueError,a.inspect,self.root,self.run)
 def test_missing_report_or_review(self):
  for n in ['REPORT.md','REVIEW.md']:
   (self.dir/n).unlink();self.assertRaises(ValueError,a.inspect,self.root,self.run);(self.dir/n).write_text('{}')
 def test_publish_cas(self):
  value=a.publish(self.root,self.run,'ABSENT');self.assertEqual(value['runId'],'test-run');self.assertRaises(ValueError,a.publish,self.root,self.run,'ABSENT');self.assertFalse((self.root/'.ai-run/.latest-writer.lock').exists())
 def test_stale_lock_never_taken(self):
  p=self.root/'.ai-run/.latest-writer.lock';p.write_text('{"pid":0,"old":true}');self.assertRaises(FileExistsError,a.publish,self.root,self.run,'ABSENT');self.assertTrue(p.exists())
 def test_symlink_and_escape(self):
  (self.root/'src/file.ts').unlink();(self.root/'src/file.ts').symlink_to(self.dir/'REPORT.md');self.assertRaises(ValueError,a.inspect,self.root,self.run)
  self.assertRaises(ValueError,a.safe,self.root,'../escape')
 def test_oversize_document(self):
  (self.dir/'FINAL-HANDOFF.json').write_text('x'*(a.MAX_DOC+1));self.assertRaises(ValueError,a.inspect,self.root,self.run)
 def test_mutation_during_publish_refused(self):
  self.assertRaises(ValueError,a.publish,self.root,self.run,'ABSENT',lambda:(self.root/'src/file.ts').write_text('changed'));self.assertFalse((self.root/'.ai-run/LATEST.json').exists())
 def test_pointer_changed_while_verifying(self):
  self.assertRaises(ValueError,a.publish,self.root,self.run,'ABSENT',lambda:(self.root/'.ai-run/LATEST.json').write_text('{"different":true}'))
 def test_snapshot_read_never_authorizes_live_publish(self):
  p=self.dir/'source-snapshot/src/file.ts';p.parent.mkdir(parents=True);p.write_text('source\n');(self.root/'src/file.ts').write_text('new work');self.assertEqual(a.inspect(self.root,self.run,'snapshot')[0]['sourceVerification'],'snapshot');self.assertRaises(ValueError,a.publish,self.root,self.run,'ABSENT')
 def test_inconsistent_or_missing_state(self):
  (self.dir/'STATE.json').write_text('{"executionState":"BLOCKED"}');self.assertRaises(ValueError,a.inspect,self.root,self.run);(self.dir/'STATE.json').unlink();self.assertRaises(ValueError,a.inspect,self.root,self.run)
 def test_v2_notrun_preserved_and_resume_must_be_explicit(self):
  self.raw['notRun']=['extra'];self.save();self.assertIn('extra',a.inspect(self.root,self.run)[0]['limitations']);self.raw.pop('automaticResume');self.save();self.assertRaises(ValueError,a.inspect,self.root,self.run)
 def test_control_source_refused(self):
  self.manifest['files']={'.env':a.H(b'')};self.manifest['aggregateSha256']=a.aggregate(self.manifest['files'],a.JSON_ALG);self.save();self.assertRaises(ValueError,a.inspect,self.root,self.run)
 def test_run_mismatch(self):
  self.raw['runId']='other';self.save();self.assertRaises(ValueError,a.inspect,self.root,self.run)
 def test_evidence_change_during_publish(self):
  self.assertRaises(ValueError,a.publish,self.root,self.run,'ABSENT',lambda:(self.dir/'REVIEW.md').write_text('changed'))
 def test_replaced_writer_lock_not_removed(self):
  lock=self.root/'.ai-run/.latest-writer.lock'
  def change():lock.unlink();lock.write_text('{"other":true}')
  self.assertRaises(ValueError,a.publish,self.root,self.run,'ABSENT',change);self.assertEqual(lock.read_text(),'{"other":true}')
 def test_state_identity_source_and_continuation_agreement(self):
  for changed in [{'runId':'wrong'},{'sourceDigest':'0'*64},{'automaticResume':True},{'action':'CONTINUE'},{'completionScope':'wrong'}]:
   (self.dir/'STATE.json').write_text(json.dumps({'executionState':'COMPLETED','action':'STOP',**changed}));self.assertRaises(ValueError,a.inspect,self.root,self.run)
 def test_named_gitignore_is_source_but_other_hidden_sources_are_not(self):
  (self.root/'.gitignore').write_text('node_modules/');self.files['.gitignore']=a.H(b'node_modules/');self.manifest['aggregateSha256']=a.aggregate(self.files,a.JSON_ALG);self.raw['source']['aggregateSha256']=self.manifest['aggregateSha256'];self.save();a.inspect(self.root,self.run)
 def test_non_string_path_rejected(self):self.assertRaises(ValueError,a.safe,self.root,123)
if __name__=='__main__' :unittest.main(verbosity=2)
