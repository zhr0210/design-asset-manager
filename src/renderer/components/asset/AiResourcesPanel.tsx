import React, { useEffect, useState } from "react";
import { requireWorkspaceClient } from "../../workspace-client";
export default function AiResourcesPanel() {
  const [status, setStatus] = useState<any>(null),
    [reserve, setReserve] = useState(10),
    [mode, setMode] = useState<"quiet" | "normal" | "accelerated">("normal"),
    [busy, setBusy] = useState(false),
    [readError, setReadError] = useState(""),
    [saveError, setSaveError] = useState("");
  useEffect(() => {
    let live = true;
    const read = (initial = false) => {
      void requireWorkspaceClient()
        .aiResources.read()
        .then((value) => {
          if (!live) return;
          setStatus(value);
          setReadError("");
          if (initial) {
            setReserve(Math.round(value.policy.reserveFraction * 100));
            setMode(value.policy.mode);
          }
        })
        .catch(() => {
          if (live) setReadError("资源状态暂时不可读。");
        });
    };
    read(true);
    const timer = setInterval(() => read(), 2000);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, []);
  const save = async () => {
    setBusy(true);
    setSaveError("");
    try {
      setStatus(
        await requireWorkspaceClient().aiResources.configure({
          mode,
          reserveFraction: reserve / 100,
        }),
      );
    } catch {
      setSaveError("资源策略未保存，请核对后重试。");
    } finally {
      setBusy(false);
    }
  };
  const gib = (bytes: number) => `${(bytes / 1024 ** 3).toFixed(1)} GiB`;
  return (
    <section className="ui-card" aria-label="AI 资源预算">
      <h2>资源与忙闲策略</h2>
      <p>
        为其他应用保留内存余量。预算影响新准入；正在计算和尚未退出的模型继续计入占用。
      </p>
      <label>
        运行策略{" "}
        <select
          aria-label="运行策略"
          value={mode}
          onChange={(e) => setMode(e.target.value as typeof mode)}
        >
          <option value="quiet">最省资源</option>
          <option value="normal">平衡</option>
          <option value="accelerated">最快响应</option>
        </select>
      </label>
      <label>
        为其他应用预留 {reserve}%{" "}
        <input
          aria-label="其他应用内存预留"
          type="range"
          min={5}
          max={80}
          step={5}
          value={reserve}
          onChange={(e) => setReserve(Number(e.target.value))}
        />
      </label>
      <button
        className="ui-button ui-button-primary"
        disabled={busy}
        onClick={() => void save()}
      >
        保存资源策略
      </button>
      <button className="ui-button ui-button-secondary" disabled={busy} onClick={()=>{
        setBusy(true);setSaveError('');void requireWorkspaceClient().aiResources.releaseIdle().then(setStatus,
          ()=>setSaveError('空闲资源释放尚未确认。活跃执行与未退出的实例保持占用。')).finally(()=>setBusy(false))
      }}>释放空闲模型与准备缓存</button>
      {status && (
        <p role="status">
          可用内存 {gib(status.sample.freeRamBytes)} · 模型驻留许可{" "}
          {gib(status.residentBytes)} · 准备与计算许可{" "}
          {gib(status.materialBytes + status.computeBytes)} · 等待{" "}
          {status.waiting} 项 ·{" "}
          {status.activity === "active"
            ? "正在交互"
            : status.activity === "idle"
              ? "系统空闲"
              : "交互状态未知"}{" "}
          · 后续计算 {status.computeThreads} 线程 / 并发 {status.concurrency}
          {status.reason && `。${status.reason}`}
        </p>
      )}
      {status?.devices?.map((device: any) => <p key={device.id}>{device.name} · {device.topology === 'dedicated' ? '独立显存' : '共享/未知拓扑'} ·
        {device.state === 'known' ? `空闲 ${gib(device.freeBytes)} / 总量 ${gib(device.totalBytes)}` : device.state === 'stale' ? '显存数据已过期，暂停新 GPU 准入' : '显存空闲量未知'} ·
        {device.source}{device.sampledAt != null ? ` · ${new Date(device.sampledAt).toLocaleTimeString()}` : ''}</p>)}
      {status?.preparedCache&&<p>受控预览准备缓存 {gib(status.preparedCache.bytes)} · {status.preparedCache.entries} 项 · 复用 {status.preparedCache.hits} 次。仅复用兼容输入，明确重跑仍产生新的模型执行。</p>}
      {!status?.devices?.length && <p>未取得可用的 GPU 计量；CPU 能力继续按 RAM 预算工作。</p>}
      <p>每张 GPU 单独核对，显存不跨卡相加，共享内存不重复记账。预留属于 DAM 准入策略，不会锁定其他程序的系统资源。</p>
      {(saveError || readError) && <p role="alert">{saveError || readError}</p>}
    </section>
  );
}
