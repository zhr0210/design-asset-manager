import React, { useEffect, useRef, useState } from 'react';
import type { WorkMediaScope, WorkHandoffKind, WorkHandoffReceipt } from '../../../../shared/contracts/work-media.contract';
import { workspaceWorkMediaActions, type WorkMediaActions } from './work-media-api';
import './work-media.css';
export function WorkFileHandoffPanel({ scope, frameId, video = false, actions = workspaceWorkMediaActions }: {
    scope: WorkMediaScope;
    frameId?: string;
    video?: boolean;
    actions?: WorkMediaActions;
}) {
    const [kind, setKind] = useState<WorkHandoffKind>(frameId ? 'reference-frame' : 'original'), [receipt, setReceipt] = useState<WorkHandoffReceipt>(), [busy, setBusy] = useState(false), [error, setError] = useState(''), [review, setReview] = useState(false), live = useRef(true);
    useEffect(() => { live.current = true; return () => { live.current = false; }; }, []);
    const [retained, setRetained] = useState<WorkHandoffReceipt[]>([]);
    const refresh = async () => { if (!actions.list)
        return; const result = await actions.list(scope); if (live.current) {
        if (result.success)
            setRetained(result.value);
        else
            setError(result.error);
    } };
    useEffect(() => { void refresh().catch(() => setError('交付历史读取失败，已有副本保留。')); }, [scope.libraryIdentity, scope.generation, scope.setId, scope.assetId, receipt?.id]);
    useEffect(() => { setReceipt(undefined); setKind(frameId ? 'reference-frame' : 'original'); setError(''); }, [scope.assetId, frameId]);
    const prepare = async (action: 'prepare' | 'open') => { if (busy)
        return; setBusy(true); setError(''); try {
        const result = await actions.handoff({ ...scope, kind, action, ...(kind === 'reference-frame' ? { frameId } : {}) });
        if (!live.current)
            return;
        if (!result.success)
            throw Error(result.error);
        setReceipt(result.value);
    }
    catch (e) {
        if (live.current)
            setError(e instanceof Error ? e.message : '交付失败。');
    }
    finally {
        if (live.current)
            setBusy(false);
    } };
    return <section className="work-file-handoff" aria-label="交付文件"><h3>交付文件</h3><p>交付独立副本；库中原件保持。接收应用读完后再清理。</p>
    <label>交付内容<select aria-label="交付内容" value={kind} disabled={busy} onChange={e => { setKind(e.target.value as WorkHandoffKind); setReceipt(undefined); }}>{frameId && <option value="reference-frame">所选参考帧 · PNG</option>}<option value="original">原件副本{video ? ' · MP4' : ''}</option><option value="preview">预览副本 · 图片</option>{!video && <option value="compatible-png">兼容导出 · PNG（保留图像尺寸）</option>}</select></label>
    <div className="ui-actions"><button disabled={busy} onClick={() => void prepare('prepare')}>准备交付副本</button><button disabled={busy} onClick={() => void prepare('open')}>用默认应用打开副本</button></div>
    {receipt && <div role="status"><p>{receipt.fileName} · {(receipt.bytes / 1024).toFixed(1)} KiB</p><p>{receipt.message}</p>
      {!actions.drag && <a href={'/media/handoff/' + encodeURIComponent(receipt.id)} download={receipt.fileName}>下载交付副本</a>}
      {actions.drag && <button draggable onDragStart={e => { e.preventDefault(); void actions.drag!(receipt.id).then(result => { if (!result.success)
            setError(result.error); }); }}>拖动此副本到创作应用</button>}
      {actions.clear && <button onClick={() => setReview(true)}>清理这份交付副本</button>}
    </div>}
    {retained.length > 0 && <details><summary>已保留的交付副本 · {retained.length}</summary><ul>{retained.map(item => <li key={item.id}><button onClick={() => { setReceipt(item); setKind(item.kind); }}>{item.fileName} · {item.status === 'open-rejected' ? '接收被拒绝' : '副本已保留'}</button></li>)}</ul></details>}
    {review && receipt && <div role="alertdialog" aria-label="清理交付副本"><p>请确认接收应用已经读完文件。副本将移至系统回收站，库中原件和参考帧保持。</p><button onClick={() => setReview(false)}>继续保留</button><button disabled={busy} onClick={() => { setBusy(true); void actions.clear!(receipt.id).then(async (result) => { if (!result.success)
        throw Error(result.error); setReview(false); setReceipt(undefined); await refresh(); }).catch(e => setError(e.message)).finally(() => setBusy(false)); }}>接收应用已读完，清理副本</button></div>}
    {error && <p role="alert">{error}</p>}
  </section>;
}
