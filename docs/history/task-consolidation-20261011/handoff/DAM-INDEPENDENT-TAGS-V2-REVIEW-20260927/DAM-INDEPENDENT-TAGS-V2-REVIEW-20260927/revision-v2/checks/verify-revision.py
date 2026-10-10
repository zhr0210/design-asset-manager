"""Document/source/Git verification only; no production imports or runtime suites."""
from pathlib import Path
import json,hashlib,subprocess,os,re,datetime,sys
root=Path(__file__).resolve().parents[1];repo=root.parents[2];checks=[]
def h(b):return hashlib.sha256(b).hexdigest()
def ck(n,ok,detail):checks.append({'id':n,'result':'PASS' if ok else 'FAIL','detail':detail})
def read(p):return json.loads(p.read_text())
base=root/'inputs/package/03-engineering-report/implementation-plan';old=read(base/'PLAN.json');new=read(root/'FIRST-ROUND-PLAN.v2.json');before=read(root/'evidence/WORKTREE-BEFORE.json')
alljson=list(root.rglob('*.json'))
for p in alljson:read(p)
ck('json-syntax',True,{'files':len(alljson),'schemaEngineRun':False})
fields=['id','title','slug','blockers','stories'];ck('seven-parent-tickets-preserved',len(new['tickets'])==7 and [[t[f] for f in fields] for t in old['tickets']]==[[t[f] for f in fields] for t in new['tickets']],'7 parents, titles, user stories and exact dependency edges preserved')
seen=set();dag=True
for t in new['tickets']:dag=dag and set(t['blockers'])<=seen and t['id'] not in seen;seen.add(t['id'])
ck('acyclic-no-03-04-cycle',dag and new['tickets'][2]['blockers']==['02'] and new['tickets'][3]['blockers']==['03'] and new['tickets'][4]['blockers']==['03'],'04/05 still independent consumers of03')
ck('unaffected-01-07-byte-preserved',all((root/'draft-tickets'/p.name).read_bytes()==p.read_bytes() for p in (base/'draft-tickets').glob('*.md') if p.name.startswith(('01-','07-'))),'No scope expansion of first candidate/final acceptance tickets')
ck('prior-03-defenses-retained',new['tickets'][2]['criteria'][:len(old['tickets'][2]['criteria'])]==old['tickets'][2]['criteria'],'Original generation/session/claim/cancel/atomicity criteria retained verbatim')
ck('gates-before-first-new-write',{'G01-single-writer','G02-shared-admission','G03-session-fence'}<=set(new['tickets'][2]['enablementGates']),'Single writer, shared admission and session protection all03 enablement gates')
ck('02-two-checkpoints', [x['id'] for x in new['tickets'][1]['checkpoints']]==['02A','02B'] and new['tickets'][1]['checkpoints'][1]['blockedByInternal']==['02A'],'Internal sequencing, no extra parent ticket')
ck('new-app-compat-not-refusal-pass','新版程序对其升级后的已知目标profile必须保持' in new['tickets'][1]['criteria'][3] and '回归或安全拒绝' not in new['tickets'][1]['criteria'][3],'Old binary refusal separated from supported new app compatibility')
sup=read(root/'SUPERSEDES.json');refs=read(root/'evidence/SOURCE-REVIEW.json')['references'];valid=True
for x in sup['entries']:
 for k in ['oldRefs','replacementRefs']:
  valid=valid and all(n in refs for n in x.get(k,[]))
ck('explicit-supersedes',valid and sup['historicalFilesModified'] is False and {'SUP-ID-01','SUP-GATE-03A','SUP-GATE-03B','SUP-SCHEMA-02','SUP-AUTO-01'}<=set(x['id'] for x in sup['entries']),'Identity, gate timing, compatibility and automatic baseline scopes explicit')
errors=[]
for id,x in refs.items():
 p=(root/'inputs/package'/x['path']) if x['kind']=='package' else repo/x['path']
 if not p.is_file() or h(p.read_bytes())!=x['sha256'] or not (1<=x['lines'][0]<=x['lines'][1]<=len(p.read_text().splitlines())):errors.append(id)
ck('source-and-package-anchors',not errors,{'references':len(refs),'invalid':errors,'notFullSourceAudit':True})
intg=read(root/'evidence/INPUT-INTEGRITY.json');archive=Path('/Users/meigong/Downloads')/intg['archiveName'];ck('archive-and-copies-preserved',h(archive.read_bytes())==intg['archiveSha256'] and not intg['manifestMismatches'] and intg['zipCrcError'] is None and all(h((root/x['localPath']).read_bytes())==x['sha256'] for x in intg['selectedCopies']),{'manifestEntriesCheckedAtStart':intg['manifestEntriesChecked'],'copies':len(intg['selectedCopies'])})
pkg=read(repo/'package.json');commands=read(root/'evidence/TEST-COMMANDS.json');ok=True
for x in commands['entries']:
 ok=ok and all((repo/p).is_file() for p in x['entryFiles']) and x['execution']=='NOT_RUN'
 if x['command'].startswith('npm run '):ok=ok and pkg['scripts'].get(x['id'])==x['resolved']
ck('existing-command-inventory',ok and h((repo/'package.json').read_bytes())==commands['packageSha256'],'Only command existence checked, new production assertions remain proposed')
gates=read(root/'TEST-GATES.json');cmdids={x['id'] for x in commands['entries']};ck('gate-production-mapping',len(gates['gates'])==12 and all(set(x['existingCommandIds'])<=cmdids and x['newProductionCases']=='proposed-not-implemented' for x in gates['gates']),'All12 gates have counterexamples, production scope, owner; nonexisting new tests marked proposed')
ad=read(root/'ADMISSION-PROFILE.proposed.json');ck('bounded-admission-not-false-enable',ad['newCoexistenceEnabled'] is False and ad['userManagedVramHardLimitClaimed'] is False and ad['sharedRequestSlotsMax']==2 and ad['tagsOnlySlotsMax']==1 and ad['preprocessingSlotsMax']==1 and all(ad[k] is None for k in ['maxPreparedBytesTotal','maxLocalPreparationBytes','codecOverheadBasis']),'Finite local limits pending production fixture basis; new coexistence disabled until known')
deferred=read(root/'DEFERRED-REGISTER.json');ck('deferred-not-01-blockers',not new['newGlobalPrerequisitesForTask01'] and all(x['task01Blocker'] is False for x in deferred['items']) and len(deferred['items'])==5,'Pagination, variant, Eagle, auto Embedding and fairness remain scoped follow-ups')
spec=read(root/'evidence/MINIMAL-SPEC-CHECKS.json');ck('counterexamples-not-production-vulnerabilities',len(spec['historicalCounterexamples'])==2 and all(x['counterexampleReproduced'] for x in spec['historicalCounterexamples']) and spec['productionTests']=='NOT_RUN' and spec['historicalCounterexamples'][0]['targetConstraintSatisfied'] is False,'Original failing constraints preserved as model limitations')
ck('minimal-eight-only',len(spec['minimalCases'])==8 and all(x['result']=='PASS' for x in spec['minimalCases']),'8 local pure reference checks; no205/410 aggregation or full scheduler claim')
ck('status-honest',new['mode']=='SPEC' and new['implementationStatus']=='not_started' and new['publicationStatus']=='not_published' and new['schemaVersionAllocation'] is None,'No IMPLEMENT, GitHub publication, accepted decision or allocated schema version')
links=[]
for p in root.rglob('*.md'):
 if 'inputs' in p.parts:continue
 for u in re.findall(r'\]\(([^)]+)\)',p.read_text()):
  if not u.startswith(('http:','https:','#')) and not (p.parent/u.split('#')[0]).is_file():links.append(str(p.relative_to(root))+':'+u)
ck('new-document-links',not links,links)
# Compare every pre-existing text file and original index/diffs; all output lives under root.
changed=[p for p,d in before['hashes'].items() if not (repo/p).is_file() or h((repo/p).read_bytes())!=d]
cmdlog=[]
def git(*a):
 p=subprocess.run(['git',*a],cwd=repo,capture_output=True,env={**os.environ,'GIT_OPTIONAL_LOCKS':'0'});cmdlog.append({'argv':['git',*a],'exitCode':p.returncode,'stdoutSha256':h(p.stdout)});return p.stdout
same={'head':git('rev-parse','HEAD').decode().strip()==before['head'],'branch':git('branch','--show-current').decode().strip()==before['branch'],'index':h(git('ls-files','--stage','-z'))==before['index'],'staged':h(git('diff','--no-ext-diff','--binary','--cached'))==before['staged'],'unstaged':h(git('diff','--no-ext-diff','--binary'))==before['unstaged']}
ck('original-worktree-preserved',not changed and all(same.values()),{'originalTextFiles':len(before['hashes']),'changed':changed,'identityAndDiffs':same})
result={'timestamp':datetime.datetime.now(datetime.timezone.utc).isoformat(),'mode':'SPEC','command':'python3 -B checks/verify-revision.py','checks':checks,'gitCommands':cmdlog,'evidenceLevel':'DOC/SOURCE-FINGERPRINT only; model checks separately classified SPEC-REFERENCE','businessTests':'NOT_RUN','realModelTests':'NOT_RUN','result':'PASS' if all(x['result']=='PASS' for x in checks) else 'FAIL','exitCode':0 if all(x['result']=='PASS' for x in checks) else 1}
(root/'evidence/REVISION-CHECKS.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'checks':len(checks),'result':result['result'],'failed':[x['id'] for x in checks if x['result']=='FAIL'],'protectedTextFiles':len(before['hashes']),'productionTests':'NOT_RUN'},ensure_ascii=False));sys.exit(result['exitCode'])
