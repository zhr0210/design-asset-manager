"""Bounded SPEC-only checks. No production imports, DB, network, images or model runtime.
Original evaluate functions copied after complete source inspection. Their historical files remain untouched.
"""
import json
from pathlib import Path
def original_p13(x):
    if x['op'] == 'route':
        candidates = [p for p in x['profiles'] if all((p[k] for k in ['capability', 'quality', 'authorized', 'ready', 'fits']))]
        if x.get('pin'):
            candidates = [p for p in candidates if p['id'] == x['pin']]
        return min(candidates, key=lambda p: p['cost'])['id'] if candidates else 'waiting'
    if x['op'] == 'fair':
        return max(x['jobs'], key=lambda j: (j['priority'] + min(j['age'], x['ageCap']), j['locality']))['id']
    stable = 0
    out = []
    for signal in x['signals']:
        if signal != 'calm':
            stable = 0
            out.append(signal if signal in ['pressure', 'unknown', 'thermal-or-battery'] else 'busy')
        else:
            stable += 1
            out.append('idle' if stable >= x['recoverySamples'] else 'balanced')
    return out

def original_p26(x):
    held = {}
    effects = set()
    closing = False
    closed = False
    out = []
    for e in x['events']:
        if e['op'] == 'admit':
            ok = not closing and (not closed) and (e['id'] not in held) and (sum(held.values()) + e['cost'] <= x['capacity'])
            if ok:
                held[e['id']] = e['cost']
            out.append('admitted' if ok else 'waiting-or-revoked')
        elif e['op'] == 'finish':
            held.pop(e['id'], None)
            out.append('drained')
        elif e['op'] == 'closing':
            closing = True
            out.append('revoked')
        elif e['op'] == 'close':
            if closing and (not held):
                closed = True
                out.append('closed')
            else:
                out.append('drain-required')
        elif e['op'] == 'commit':
            if e['id'] in effects:
                out.append('existing-effect')
            else:
                effects.add(e['id'])
                out.append('new-effect')
    return {'events': out, 'used': sum(held.values()), 'effects': len(effects), 'closed': closed}

def revised_closing(events):
    phase='ready';session='S1';effects=set();coordination=[];trace=[]
    for e in events:
        op=e['op']
        if op=='closing':phase='suspending';trace.append('revoked-business')
        elif op=='close':phase='closed';trace.append('closed')
        elif op=='reopen':phase='ready';session=e['session'];trace.append('reopened')
        elif op=='coordinate':
            valid=phase=='suspending' and e.get('privateClosePermit',False) and e.get('scope',False) and e['kind'] in ['pause','unknown','revoke-claim']
            if valid:coordination.append(e['kind'])
            trace.append('coordination-recorded' if valid else 'denied')
        elif op=='commit':
            valid=phase=='ready' and e.get('scope',False) and e.get('session')==session and e.get('claimValid',False)
            if not valid:trace.append('denied');continue
            if e['id'] in effects:trace.append('existing-effect')
            else:effects.add(e['id']);trace.append('new-effect')
        elif op=='read':
            valid=phase=='ready' and e.get('scope',False) and e.get('session')==session
            trace.append(('existing-effect' if e['id'] in effects else 'missing') if valid else 'denied')
    return {'trace':trace,'businessEffects':len(effects),'coordinationRecords':len(coordination)}

def quota_reference(rounds,k,background_eligible):
    # A fixed-one-background illustrative schedule; not a production parameter or full scheduler.
    return sum(1 for i in range(rounds) if background_eligible and (i+1)%k==0)

def main():
    root=Path(__file__).parents[1];reproductions=[]
    close_input={'capacity':1,'events':[{'op':'closing'},{'op':'close'},{'op':'commit','id':'late-new-effect'}]}
    old=original_p26(close_input)
    assert old['closed'] and old['effects']==1
    reproductions.append({'id':'CE-P26','input':close_input,'actual':old,'targetConstraintSatisfied':False,'counterexampleReproduced':True,'scope':'historical SPEC model only; not production bug evidence'})
    background=0
    for i in range(100):
        chosen=original_p13({'op':'fair','ageCap':5,'jobs':[{'id':'foreground','priority':10,'age':0,'locality':0},{'id':'background','priority':0,'age':i,'locality':0}]})
        background+=chosen=='background'
    assert background==0
    reproductions.append({'id':'CE-P13','rounds':100,'foregroundPriority':10,'backgroundPriority':0,'ageCap':5,'backgroundSelections':background,'counterexampleReproduced':True,'scope':'historical SPEC model only; not real scheduler measurement'})
    commit={'op':'commit','id':'e1','scope':True,'session':'S1','claimValid':True}
    cases=[
      ('MC01',revised_closing([{'op':'closing'},{'op':'close'},commit]),{'trace':['revoked-business','closed','denied'],'businessEffects':0,'coordinationRecords':0}),
      ('MC02',revised_closing([{'op':'closing'},{'op':'coordinate','kind':'pause','privateClosePermit':True,'scope':True}]),{'trace':['revoked-business','coordination-recorded'],'businessEffects':0,'coordinationRecords':1}),
      ('MC03',revised_closing([{'op':'closing'},commit]),{'trace':['revoked-business','denied'],'businessEffects':0,'coordinationRecords':0}),
      ('MC04',revised_closing([{'op':'closing'},{'op':'close'},{'op':'coordinate','kind':'unknown','privateClosePermit':True,'scope':True}]),{'trace':['revoked-business','closed','denied'],'businessEffects':0,'coordinationRecords':0}),
      ('MC05',revised_closing([commit,{'op':'closing'},{'op':'close'},{'op':'read','id':'e1','scope':True,'session':'S1'},{'op':'reopen','session':'S2'},{'op':'read','id':'e1','scope':True,'session':'S2'}]),{'trace':['new-effect','revoked-business','closed','denied','reopened','existing-effect'],'businessEffects':1,'coordinationRecords':0}),
      ('MC06',revised_closing([{'op':'closing'},{'op':'close'},{'op':'reopen','session':'S2'},commit]),{'trace':['revoked-business','closed','reopened','denied'],'businessEffects':0,'coordinationRecords':0}),
      ('MF01',quota_reference(100,4,True),25),
      ('MF02',quota_reference(100,4,False),0)
    ]
    results=[{'id':id,'expected':expected,'actual':actual,'result':'PASS' if actual==expected else 'FAIL'} for id,actual,expected in cases]
    result={'evidenceLevel':'SPEC-REFERENCE-ONLY','historicalCounterexamples':reproductions,'minimalCases':results,'sameLibraryGenerationAssumptionForMC06':'constant G1 throughout; only session changed','fairnessAssumptions':'continuously eligible authorized fitting background job; bounded foreground duration yields dispatch opportunities; k4 illustrative only','notModelled':['actual Host lease/SQLite transaction interleaving','native memory allocation','multi-worker concurrency','full scheduler or wall-clock completion guarantee'],'productionTests':'NOT_RUN','result':'PASS' if all(x['result']=='PASS' for x in results) else 'FAIL'}
    (root/'evidence/MINIMAL-SPEC-CHECKS.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'counterexamplesReproduced':len(reproductions),'minimalSpecCases':len(results),'result':result['result'],'productionTests':'NOT_RUN'}))
    assert result['result']=='PASS'
if __name__=='__main__':main()
