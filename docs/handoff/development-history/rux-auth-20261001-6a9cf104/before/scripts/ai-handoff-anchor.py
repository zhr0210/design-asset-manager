"""Versioned completion pointer. Cooperative writer lock; not a source lock or OS sandbox."""
import argparse, hashlib, json, os, pathlib, re, tempfile, uuid
MAX_DOC=4*1024*1024
JSON_ALG='sha256(json-sortkeys-compact-ascii-no-newline)'
OCR_ALG='sha256(sorted(path+NUL+sha256+LF))'
H=lambda b:hashlib.sha256(b).hexdigest()
def safe(root,relative):
 if not isinstance(relative,str):raise ValueError('PATH_INVALID')
 p=pathlib.PurePosixPath(relative)
 if p.is_absolute() or '..' in p.parts or '\\' in relative or any(ord(c)<32 for c in relative):raise ValueError('PATH_INVALID')
 candidate=root.joinpath(*p.parts)
 for part in [candidate,*candidate.parents]:
  if part==root.parent:break
  if part.is_symlink():raise ValueError('SYMLINK_REFUSED')
 if not candidate.resolve().is_relative_to(root):raise ValueError('PATH_ESCAPE')
 return candidate

def doc(path):
 if path.is_symlink() or not path.is_file() or path.stat().st_size>MAX_DOC:raise ValueError('DOCUMENT_UNAVAILABLE')
 with path.open('rb') as f:content=f.read(MAX_DOC+1)
 if len(content)>MAX_DOC:raise ValueError('DOCUMENT_UNAVAILABLE')
 value=json.loads(content);
 if not isinstance(value,dict):raise ValueError('DOCUMENT_INVALID')
 return value

def aggregate(files,algorithm):
 if algorithm==JSON_ALG:return H(json.dumps(files,sort_keys=True,separators=(',',':')).encode())
 if algorithm==OCR_ALG:return H(''.join(n+'\0'+files[n]+'\n' for n in sorted(files)).encode())
 raise ValueError('ALGORITHM_UNSUPPORTED')

def terminal(raw):
 if raw.get('anchorVersion')==2:
  if raw.get('reviewStatus')!='PASS' or raw.get('verificationStatus') not in ['VERIFIED_ISOLATED','VERIFIED_REAL_SCOPED']:raise ValueError('REVIEW_OR_VERIFICATION_PENDING')
  if raw.get('executionState')!='COMPLETED' or raw.get('action')!='STOP':raise ValueError('NOT_COMPLETE')
  return raw['completionScope'],raw.get('limitations',[])+raw.get('notRun',[]),raw.get('sourceManifest','SOURCE-MANIFEST.json'),raw.get('report','REPORT.md'),raw.get('review','REVIEW.md'),raw.get('verification','EVIDENCE-MAP.json'),'v2'
 if raw.get('state')=='COMPLETED' and raw.get('action')=='STOP' and 'sourceDigest' in raw:
  return raw.get('scope','restricted OCR scope'),raw.get('notRun',[])+raw.get('notImplemented',[]),'AGGREGATE-SOURCES.json','REPORT.md',raw.get('review','REVIEW-FINAL.md'),'EVIDENCE-MAP.json','ocr-v1'
 if raw.get('status') in ['COMPLETED_RESTRICTED_SCOPE','COMPLETED_ISOLATED_SCOPE'] and raw.get('state')=='STOP' and isinstance(raw.get('source'),dict):
  return raw['status'],raw.get('notRun',[])+raw.get('stillNotImplemented',[])+raw.get('currentlyUnavailable',[])+([raw['realAcceptance']] if raw.get('realAcceptance') else []),raw.get('sourceManifest','SOURCE-MANIFEST.json'),raw.get('report','REPORT.md'),raw.get('review','REVIEW-FINAL.md'),raw.get('evidence','EVIDENCE-MAP.json'),'pi-v1'
 raise ValueError('TERMINAL_FORMAT_UNSUPPORTED')

def inspect(root,run,source_mode='current'):
 root=root.resolve();
 if not re.fullmatch(r'\.ai-run/[A-Za-z0-9][A-Za-z0-9._-]{0,127}',run):raise ValueError('RUN_PATH_INVALID')
 directory=safe(root,run);raw=doc(safe(root,run+'/FINAL-HANDOFF.json'))
 if raw.get('runId',directory.name)!=directory.name:raise ValueError('RUN_ID_MISMATCH')
 if raw.get('anchorVersion')==2 and raw.get('automaticResume') is not False:raise ValueError('RESUME_NOT_EXPLICIT')
 state=doc(safe(root,run+'/STATE.json'));state_value=state.get('executionState',state.get('state'))
 if state.get('runId',directory.name)!=directory.name:raise ValueError('STATE_RUN_MISMATCH')
 if state.get('automaticResume',False) is not False or state.get('nextBatchAuthorized',False) is not False:raise ValueError('STATE_CONTINUATION_INVALID')
 if state.get('action','STOP')!='STOP':raise ValueError('STATE_ACTION_INVALID')
 if raw.get('anchorVersion')==2:
  if state_value!='COMPLETED' or state.get('action')!='STOP':raise ValueError('STATE_NOT_COMPLETE')
 elif raw.get('status'):
  if state_value!='STOP' or state.get('status')!=raw['status']:raise ValueError('STATE_FORMAT_OR_STATUS_MISMATCH')
 else:
  if state_value!='COMPLETED':raise ValueError('STATE_NOT_COMPLETE')
 if raw.get('nextBatchAuthorized') is not False or raw.get('automaticResume',False) is not False:raise ValueError('RESUME_NOT_PERMITTED')
 scope,limits,manifest_name,report,review,verification,adapter=terminal(raw)
 for entry in [report,review,verification]:
  p=safe(root,run+'/'+entry)
  if not p.is_file() or p.stat().st_size>MAX_DOC:raise ValueError('EVIDENCE_MISSING')
 manifest=doc(safe(root,run+'/'+manifest_name));files=manifest.get('files');
 if not isinstance(files,dict) or not files or len(files)>10000:raise ValueError('MANIFEST_INVALID')
 for n,v in files.items():
  parts=pathlib.PurePosixPath(n).parts
  if not parts or (parts[0].startswith('.') and n!='.gitignore') or any(part in ['node_modules','runtime','__pycache__'] or part.startswith('.env') for part in parts):raise ValueError('SOURCE_BOUNDARY_INVALID')
  if len(parts)>1 and parts[0] not in ['src','scripts','docs','ai-service','pi-runtime']:raise ValueError('SOURCE_BOUNDARY_INVALID')
  safe(root,n)
  if not isinstance(v,str) or not re.fullmatch('[0-9a-f]{64}',v):raise ValueError('FILE_HASH_INVALID')
 if adapter=='ocr-v1':algorithm=manifest.get('digestAlgorithm');expected=manifest.get('sourceDigest')
 elif adapter=='pi-v1':
  algorithm=manifest.get('digestAlgorithm',JSON_ALG);expected=manifest.get('aggregateSha256')
 else:algorithm=manifest.get('digestAlgorithm');expected=manifest.get('aggregateSha256')
 value=aggregate(files,algorithm)
 if value!=expected:raise ValueError('AGGREGATE_MISMATCH')
 state_digest=state.get('sourceDigest',state.get('source',{}).get('aggregateSha256'))
 if state_digest and state_digest!=value:raise ValueError('STATE_SOURCE_MISMATCH')
 if state.get('completionScope') and state['completionScope']!=scope:raise ValueError('STATE_SCOPE_MISMATCH')
 raw_expected=raw.get('sourceDigest') if adapter=='ocr-v1' else raw.get('source',{}).get('aggregateSha256')
 if raw_expected and raw_expected!=value:raise ValueError('TERMINAL_SOURCE_MISMATCH')
 stats={}
 for n,v in files.items():
  p=safe(root,n if source_mode=='current' else run+'/source-snapshot/'+n)
  before=p.stat();actual=H(p.read_bytes());after=p.stat()
  if actual!=v or (before.st_ino,before.st_size,before.st_mtime_ns)!=(after.st_ino,after.st_size,after.st_mtime_ns):raise ValueError('SOURCE_MISMATCH')
  stats[n]=(after.st_ino,after.st_size,after.st_mtime_ns)
 anchor={'anchorVersion':2,'runId':raw.get('runId',directory.name),'runDirectory':run,'executionState':'COMPLETED','completionScope':scope,'rawStatus':raw.get('status',raw.get('state',raw.get('executionState'))),'rawAdapter':adapter,'report':run+'/'+report,'review':run+'/'+review,'verification':run+'/'+verification,'sourceManifest':run+'/'+manifest_name,'sourceFileCount':len(files),'sourceDigestAlgorithm':algorithm,'sourceDigest':value,'limitations':limits,'nextBatchAuthorized':False,'automaticResume':False,'fullWorkspaceSnapshot':raw.get('fullWorkspaceSnapshot',False),'sourceVerification':source_mode,'terminalSha256':H(safe(root,run+'/FINAL-HANDOFF.json').read_bytes()),'stateSha256':H(safe(root,run+'/STATE.json').read_bytes()),'evidenceHashes':{n:H(safe(root,run+'/'+n).read_bytes()) for n in [report,review,verification,manifest_name]}}
 return anchor,stats

def current_digest(root):
 p=safe(root,'.ai-run/LATEST.json')
 return H(p.read_bytes()) if p.exists() else 'ABSENT'

def publish(root,run,expected,before_commit=None):
 root=root.resolve();latest=safe(root,'.ai-run/LATEST.json');latest.parent.mkdir(parents=True,exist_ok=True);lock=safe(root,'.ai-run/.latest-writer.lock');fd=os.open(lock,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
 owner=uuid.uuid4().hex;identity=os.fstat(fd);payload=json.dumps({'pid':os.getpid(),'scope':'anchor writer only','owner':owner}).encode()
 def assert_owner():
  if not lock.exists() or lock.is_symlink():raise ValueError('LOCK_OWNER_CHANGED')
  current=lock.stat()
  if (current.st_dev,current.st_ino)!=(identity.st_dev,identity.st_ino) or lock.read_bytes()!=payload:raise ValueError('LOCK_OWNER_CHANGED')
 try:
  os.write(fd,payload);os.close(fd);fd=None
  if current_digest(root)!=expected:raise ValueError('LATEST_CHANGED')
  anchor,stats=inspect(root,run,'current')
  if before_commit:before_commit()
  assert_owner();checked,_=inspect(root,run,'current')
  if checked!=anchor or current_digest(root)!=expected:raise ValueError('SOURCE_OR_LATEST_CHANGED')
  # JSON write and atomic rename while holding the one anchor-writer lock.
  tmpfd,tmp=tempfile.mkstemp(prefix='.latest-',dir=latest.parent)
  try:
   with os.fdopen(tmpfd,'w') as f:json.dump(anchor,f,ensure_ascii=False,indent=2);f.write('\n');f.flush();os.fsync(f.fileno())
   if current_digest(root)!=expected:raise ValueError('LATEST_CHANGED')
   assert_owner();os.replace(tmp,latest)
  finally:
   if os.path.exists(tmp):os.unlink(tmp)
  return anchor
 finally:
  if fd is not None:os.close(fd)
  try:assert_owner()
  except ValueError:pass
  else:lock.unlink()

def main():
 p=argparse.ArgumentParser();p.add_argument('--workspace',default=str(pathlib.Path(__file__).resolve().parents[1]));p.add_argument('--run',required=True);p.add_argument('--publish',action='store_true');p.add_argument('--expected-current');p.add_argument('--source-mode',choices=['current','snapshot'],default='current');args=p.parse_args();root=pathlib.Path(args.workspace)
 if args.publish:
  if args.expected_current is None or args.source_mode!='current':p.error('publish requires expected-current and live current source verification')
  result=publish(root,args.run,args.expected_current)
 else:result=inspect(root,args.run,args.source_mode)[0]
 print(json.dumps(result,ensure_ascii=False,indent=2))
if __name__=='__main__':
 try:main()
 except (ValueError,OSError,KeyError,json.JSONDecodeError) as error:raise SystemExit('ANCHOR_REFUSED: '+str(error))
