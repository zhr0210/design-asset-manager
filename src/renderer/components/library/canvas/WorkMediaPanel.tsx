import React, { useEffect, useRef, useState } from 'react';
import type { WorkMediaScope, WorkMediaSnapshot, WorkMediaWrite } from '../../../../shared/contracts/work-media.contract';
import { validateWorkSourceUrl } from '../../../../shared/contracts/work-media.contract';
import { currentWorkspaceDraft, holdWorkspaceDraft, removeWorkspaceDraft, flushWorkspaceDrafts, suspendRecoveredWorkspaceDraft } from '../../../workspace-drafts';
import { connectTransitionParticipant } from '../../../workspace-transition-participant';
import { workspaceWorkMediaActions, workMediaUrl, mediaDraftId, type WorkMediaActions } from './work-media-api';
import { WorkFileHandoffPanel } from './WorkFileHandoffPanel';
import './work-media.css';
type Editing = {
    setId: string;
    assetId: string;
    sourceUrl: string;
    positionTicks: number;
    selectedFrameId: string | null;
    frames: Array<{
        id: string;
        note: string;
    }>;
};
const editing = (scope: WorkMediaScope, s: WorkMediaSnapshot): Editing => ({ setId: scope.setId, assetId: scope.assetId, sourceUrl: s.sourceUrl, positionTicks: s.positionTicks, selectedFrameId: s.selectedFrameId, frames: s.frames.map(f => ({ id: f.id, note: f.note })) });
export function WorkMediaPanel({ scope, title, close, actions = workspaceWorkMediaActions, onDirty }: {
    scope: WorkMediaScope;
    title: string;
    close: () => void;
    actions?: WorkMediaActions;
    onDirty?: (dirty: boolean) => void;
}) {
    const dialog = useRef<HTMLDialogElement>(null), video = useRef<HTMLVideoElement>(null), live = useRef(true), busyRef = useRef(false), serial = useRef(0);
    const draftScope = { libraryIdentity: scope.libraryIdentity, generation: scope.generation, kind: 'work-media' as const, entityId: mediaDraftId(scope) }, initial = useRef(currentWorkspaceDraft(draftScope));
    const [snapshot, setSnapshot] = useState<WorkMediaSnapshot>(), [value, setValue] = useState<Editing | undefined>(initial.current?.value as Editing | undefined), [base, setBase] = useState<{
        revision: number;
        value: Editing;
    } | undefined>(initial.current?.base as {
        revision: number;
        value: Editing;
    } | undefined);
    const [busy, setBusy] = useState(false), [error, setError] = useState(''), [status, setStatus] = useState(''), [sourceError, setSourceError] = useState('');
    const valueRef = useRef(value), baseRef = useRef(base);
    valueRef.current = value;
    baseRef.current = base;
    const dirty = Boolean(value && base && JSON.stringify(value) !== JSON.stringify(base.value)), conflict = Boolean(snapshot && base && snapshot.revision !== base.revision);
    useEffect(() => { live.current = true; dialog.current?.showModal(); void actions.read(scope).then(result => { if (!live.current)
        return; if (!result.success)
        throw Error(result.error); setSnapshot(result.value); if (!initial.current) {
        const saved = editing(scope, result.value);
        setValue(saved);
        setBase({ revision: result.value.revision, value: saved });
    } }).catch(e => { if (live.current)
        setError(e.message); }); return () => { live.current = false; video.current?.pause(); if (busyRef.current)
        void actions.cancel(); onDirty?.(false); }; }, [scope.libraryIdentity, scope.generation, scope.setId, scope.assetId]);
    useEffect(() => { if (value && base) {
        if (dirty || initial.current)
            holdWorkspaceDraft(draftScope, value, base);
        else
            removeWorkspaceDraft(draftScope);
    } onDirty?.(dirty || busy); }, [value, base, busy]);
    useEffect(() => connectTransitionParticipant(() => busyRef.current), []);
    useEffect(() => { const pause = () => video.current?.pause(); window.addEventListener('blur', pause); document.addEventListener('visibilitychange', pause); return () => { window.removeEventListener('blur', pause); document.removeEventListener('visibilitychange', pause); }; }, []);
    const update = (next: Editing) => { serial.current++; setValue(next); setStatus(''); setError(''); };
    const requestClose = async () => { if (busyRef.current) {
        setError('请先取消或等待视频操作完成。');
        return;
    } try {
        await flushWorkspaceDrafts();
        suspendRecoveredWorkspaceDraft(draftScope);
        close();
    }
    catch (e) {
        setError(e instanceof Error ? e.message : '草稿暂存失败，输入保留。');
    } };
    const write = async (command: WorkMediaWrite['command']) => {
        const current = snapshot, baseline = baseRef.current;
        if (!current || !baseline)
            throw Error('视频尚未读取。');
        const result = await actions.write({ ...scope, sessionToken: current.sessionToken, expectedRevision: baseline.revision, command });
        if (!result.success)
            throw Error(result.error);
        const next = editing(scope, result.value);
        if (live.current) {
            setSnapshot(result.value);
            setBase({ revision: result.value.revision, value: next });
            setValue(next);
            initial.current = undefined;
            removeWorkspaceDraft(draftScope);
        }
        baseRef.current = { revision: result.value.revision, value: next };
        valueRef.current = next;
        return result.value;
    };
    const operate = async (kind: 'save' | 'capture' | 'remove', frameId?: string) => {
        if (busyRef.current || conflict)
            return;
        busyRef.current = true;
        setBusy(true);
        setError('');
        video.current?.pause();
        try {
            let current = snapshot;
            const v = valueRef.current;
            if (!v || !current)
                throw Error('视频尚未读取。');
            const position = video.current && Number.isFinite(video.current.currentTime) ? Math.round(video.current.currentTime * 1e7) : v.positionTicks;
            if (dirty || position !== v.positionTicks || kind === 'save')
                current = await write({ kind: 'save', sourceUrl: validateWorkSourceUrl(v.sourceUrl), positionTicks: position, selectedFrameId: v.selectedFrameId, frames: v.frames });
            if (kind === 'capture') {
                const result = await actions.write({ ...scope, sessionToken: current.sessionToken, expectedRevision: current.revision, command: { kind: 'capture', requestId: 'frame-request:' + crypto.randomUUID(), requestedTicks: position } });
                if (!result.success)
                    throw Error(result.error);
                if (live.current) {
                    const next = editing(scope, result.value);
                    setSnapshot(result.value);
                    setBase({ revision: result.value.revision, value: next });
                    setValue(next);
                    initial.current = undefined;
                    removeWorkspaceDraft(draftScope);
                    setStatus('参考帧已保存；时间为实际解码位置。');
                }
            }
            else if (kind === 'remove' && frameId) {
                await write({ kind: 'remove', frameId });
                setStatus('只移除参考帧关系，视频原件与已交付副本保持。');
            }
            else
                setStatus('已保存来源、帧顺序、备注与播放位置。');
        }
        catch (e) {
            if (live.current) {
                setError(e instanceof Error ? e.message : '视频操作失败，原有结果和输入保持。');
                setStatus('');
                const fresh = await actions.read(scope);
                if (fresh.success && live.current)
                    setSnapshot(fresh.value);
            }
        }
        finally {
            busyRef.current = false;
            if (live.current)
                setBusy(false);
        }
    };
    const selected = snapshot?.frames.find(f => f.id === value?.selectedFrameId);
    return <dialog className="work-media-dialog glass" ref={dialog} aria-label={`视频参考 ${title}`} onCancel={e => { e.preventDefault(); void requestClose(); }} onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        e.stopPropagation();
        void operate('save');
    } }}>
    <header><h2>{title}</h2><button onClick={() => void requestClose()}>返回工作集</button></header>
    {!snapshot || !value || !base ? <p role="status">{error || '正在读取视频参考…'}</p> : <>
      <video ref={video} src={workMediaUrl(scope)} controls preload="metadata" muted onError={() => setError('视频播放失败，请检查当前素材和支持格式；已有帧保持。')} onLoadedMetadata={e => { const time = valueRef.current?.positionTicks ?? 0; e.currentTarget.currentTime = Math.min(time / 1e7, Math.max(0, e.currentTarget.duration - 0.001)); e.currentTarget.pause(); }} onTimeUpdate={e => { if (!busyRef.current && valueRef.current)
            update({ ...valueRef.current, positionTicks: Math.round(e.currentTarget.currentTime * 1e7) }); }}/>
      <fieldset disabled={busy}><label>跳转时间（秒）<input aria-label="视频跳转时间（秒）" type="number" min="0" step="0.001" value={(value.positionTicks / 1e7).toFixed(3)} onChange={e => { const t = Number(e.target.value); if (Number.isFinite(t) && t >= 0 && t < 3600 && video.current && t < video.current.duration) {
            video.current.currentTime = t;
            update({ ...value, positionTicks: Math.round(t * 1e7) });
        } }}/></label>
      <label>公开来源网址<input aria-label="视频公开来源网址" type="url" value={value.sourceUrl} onChange={e => { const text = e.target.value; if (text.includes('?') || text.includes('#') || /^https?:\/\/[^/]*@/.test(text)) {
            setSourceError('请使用不含账号、查询参数和认证信息的公开页面网址；该内容未保存。');
            return;
        } setSourceError(''); update({ ...value, sourceUrl: text }); }} placeholder="https://peach.blender.org/"/></label>
      <div className="ui-actions"><button disabled={conflict || snapshot.schemaVersion < 15} onClick={() => void operate('capture')}>保存当前位置为参考帧</button><button disabled={conflict} onClick={() => void operate('save')}>保存视频参考设置</button></div>
      <ol className="work-frame-list" aria-label="视频参考帧">{value.frames.map((item, index) => {
                const frame = snapshot.frames.find(f => f.id === item.id);
                return <li key={item.id}>{frame && <><button aria-label={`选择参考帧 ${index + 1}`} aria-pressed={value.selectedFrameId === item.id} onClick={() => { video.current?.pause(); if (video.current)
                    video.current.currentTime = frame.actualTicks / 1e7; update({ ...value, positionTicks: frame.actualTicks, selectedFrameId: item.id }); }}><img src={workMediaUrl(scope, item.id)} alt={`参考帧 ${index + 1}`}/></button><small>实际 {(frame.actualTicks / 1e7).toFixed(7)} 秒 · 请求 {(frame.requestedTicks / 1e7).toFixed(7)} 秒</small></>}
        <label>参考帧 {index + 1} 备注<textarea aria-label={`参考帧 ${index + 1} 备注`} value={item.note} maxLength={4000} onChange={e => update({ ...value, frames: value.frames.map(f => f.id === item.id ? { ...f, note: e.target.value } : f) })}/></label>
        <div className="ui-actions"><button disabled={index === 0} onClick={() => { const frames = [...value.frames]; [frames[index - 1], frames[index]] = [frames[index], frames[index - 1]]; update({ ...value, frames }); }}>前移参考帧 {index + 1}</button><button disabled={index === value.frames.length - 1} onClick={() => { const frames = [...value.frames]; [frames[index], frames[index + 1]] = [frames[index + 1], frames[index]]; update({ ...value, frames }); }}>后移参考帧 {index + 1}</button><button disabled={conflict} onClick={() => void operate('remove', item.id)}>移除参考帧 {index + 1}</button></div>
      </li>;
            })}</ol></fieldset>
      {busy && <button onClick={() => void actions.cancel().then(r => setStatus(r.success ? busyRef.current ? r.value.message : '视频操作已结束；已有参考帧保持。' : r.error))}>取消视频操作</button>}
      {conflict && <div role="alert"><p>视频参考已在另一界面变化，当前输入保留。</p><details><summary>核对当前保存内容</summary><p>{snapshot.sourceUrl} · {snapshot.frames.length} 帧 · {(snapshot.positionTicks / 1e7).toFixed(3)} 秒</p></details><button disabled={busy} onClick={() => { setBase({ revision: snapshot.revision, value: editing(scope, snapshot) }); setError(''); setStatus('已采用当前保存版本为基准，输入仍保留；帧列表不一致时需继续核对。'); }}>核对后采用当前版本为基准</button></div>}
      <WorkFileHandoffPanel scope={scope} frameId={selected?.id} video actions={actions}/>
      <p role="status">{dirty ? '视频参考有未保存输入 · 离开后保留为本机草稿' : '视频参考设置已保存'}{status ? ' · ' + status : ''}</p>
      {(error || sourceError) && <p role="alert">{error || sourceError}</p>}
    </>}
  </dialog>;
}
