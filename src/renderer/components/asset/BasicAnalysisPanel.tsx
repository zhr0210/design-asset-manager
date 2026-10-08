import { useEffect, useRef, useState } from "react";
import { getWorkspaceClient } from "../../workspace-client";
import type {
  BasicAnalysisApi,
  BasicReview,
  BasicJob,
  CaptionEvidence,
  BasicAttempts,
  BasicAttempt,
} from "../../../shared/contracts/basic-analysis.contract";
import type {
  BackgroundScope,
  BasicCapability,
} from "../../../shared/contracts/background-analysis.contract";
const names = { tags: "标签", caption: "短描述", ocr: "OCR" },
  states = {
    queued: "等待",
    running: "执行中",
    succeeded: "已保存",
    failed: "未完成",
    cancelled: "已取消",
    unknown: "需要核对",
  };
export default function BasicAnalysisPanel({
  scope,
  assetIds,
  backendId,
  model,
  onChanged,
}: {
  scope: BackgroundScope;
  assetIds: string[];
  backendId: string;
  model: string;
  onChanged?: () => void;
}) {
  const api = getWorkspaceClient()?.basicAnalysis as
      | BasicAnalysisApi
      | undefined,
    key = JSON.stringify([scope, assetIds]),
    life = useRef(0),
    receipt = useRef<string | null>(null),
    [review, setReview] = useState<BasicReview | null>(null),
    [job, setJob] = useState<BasicJob | null>(null),
    [captions, setCaptions] = useState<CaptionEvidence[]>([]),
    [attempts, setAttempts] = useState<BasicAttempts | null>(null),
    [abandon, setAbandon] = useState<BasicAttempt | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const running = !!job && ["queued", "running"].includes(job.state);
  const read = async (version: number) => {
    if (api && assetIds.length === 1) {
      const s = { ...scope, assetId: assetIds[0] },
        results = await Promise.all([api.captions(s), api.attempts(s)]);
      if (version !== life.current) return;
      if (results[0].ok) setCaptions(results[0].value);
      if (results[1].ok) setAttempts(results[1].value);
    }
  };
  useEffect(() => {
    const version = ++life.current;
    setReview(null);
    setJob(null);
    setCaptions([]);
    setAttempts(null);
    setAbandon(null);
    setBusy(false);
    setError("");
    void read(version).catch(() => {});
    return () => {
      life.current++;
      if (receipt.current) void api?.discard(receipt.current);
      receipt.current = null;
    };
  }, [key, api]);
  useEffect(() => {
    if (!running || !api || !job) return;
    let gone = false,
      timer: ReturnType<typeof setTimeout>,
      saved = 0;
    const version = life.current,
      poll = async () => {
        try {
          const r = await api.inspect(job.id);
          if (gone || version !== life.current) return;
          if (r.ok) {
            setJob(r.value);
            const count = r.value.items.filter(
              (i) => i.state === "succeeded",
            ).length;
            if (count > saved) {
              saved = count;
              onChanged?.();
              void read(version).catch(() => {});
            }
            if (!["queued", "running"].includes(r.value.state)) {
              void read(version).catch(() => {});
              return;
            }
          } else setError(r.error);
        } catch {
          if (!gone && version === life.current)
            setError("状态暂时不可用，将继续核对。");
        }
        if (!gone) timer = setTimeout(poll, 800);
      };
    timer = setTimeout(poll, 100);
    return () => {
      gone = true;
      clearTimeout(timer);
    };
  }, [running, job?.id, api, key]);
  const operate = async (action: () => Promise<void>) => {
    if (busy) return;
    const version = life.current;
    setBusy(true);
    setError("");
    try {
      await action();
    } catch {
      if (version === life.current)
        setError("操作未完成，请核对当前素材和模型。");
    } finally {
      if (version === life.current) setBusy(false);
    }
  };
  const prepare = (capabilities: BasicCapability[], rerun = false) =>
    void operate(async () => {
      const version = life.current,
        r = await api!.prepare({
          ...scope,
          assetIds,
          capabilities,
          ...(capabilities.some((c) => c !== "ocr")
            ? { backendId, model }
            : {}),
        });
      if (version !== life.current) {
        if (r.ok) void api!.discard(r.value.receipt);
        return;
      }
      if (r.ok) {
        receipt.current = r.value.receipt;
        setReview({
          ...r.value,
          notice:
            (rerun
              ? "此前请求可能已执行，云端可能重复计算和扣除用量。确认后建立新的请求，旧不确定记录保留；旧响应不能覆盖新请求。\n"
              : "") + r.value.notice,
        });
      } else setError(r.error);
    });
  const recover = (
    item: BasicAttempt,
    action: "reconcile" | "keep" | "abandon",
  ) =>
    void operate(async () => {
      const version = life.current,
        r = await api!.recover({
          ...scope,
          assetId: assetIds[0],
          sessionToken: attempts!.sessionToken,
          requestId: item.requestId,
          attemptId: item.attemptId,
          action,
        });
      if (version !== life.current) return;
      if (r.ok) {
        setAttempts(r.value);
        setAbandon(null);
        onChanged?.();
        void read(version).catch(() => {});
      } else setError(r.error);
    });
  if (!api) return null;
  return (
    <section className="visual-ai-panel" aria-label="基础 AI 分析">
      <header>
        <strong>基础 AI 分析</strong>
      </header>
      <p>
        标签、短描述和文字识别各自保存。基础分析不会生成反推提示词；人工修改保持优先。
      </p>
      <div className="visual-ai-actions">
        {(["tags", "caption", "ocr"] as const).map((c) => (
          <button
            key={c}
            disabled={
              busy ||
              running ||
              assetIds.length > 8 ||
              (c !== "ocr" && (!backendId || !model))
            }
            onClick={() => prepare([c])}
          >
            仅生成{names[c]}
          </button>
        ))}
        <button
          disabled={
            busy || running || assetIds.length > 8 || !backendId || !model
          }
          onClick={() => prepare(["tags", "caption", "ocr"])}
        >
          一键基础分析 · {assetIds.length} 个素材
        </button>
      </div>
      {review && (
        <div
          className="visual-ai-review"
          role="region"
          aria-label="确认基础分析"
        >
          <p style={{ whiteSpace: "pre-line" }}>{review.notice}</p>
          <div className="visual-ai-actions">
            <button
              disabled={busy}
              onClick={() => {
                const id = review.receipt;
                receipt.current = null;
                setReview(null);
                void api.discard(id);
              }}
            >
              取消
            </button>
            <button
              disabled={busy}
              onClick={() =>
                void operate(async () => {
                  const version = life.current,
                    r = await api.run(review.receipt);
                  if (version !== life.current) return;
                  if (r.ok) {
                    receipt.current = null;
                    setReview(null);
                    setJob(r.value);
                  } else setError(r.error);
                })
              }
            >
              确认范围并执行
            </button>
          </div>
        </div>
      )}
      {busy && <p role="status">正在核对配置与执行范围…</p>}
      {job && (
        <div role="status">
          <p>
            {running
              ? "基础分析进行中"
              : job.state === "completed"
                ? "基础分析已保存"
                : job.state === "partial"
                  ? "部分已保存"
                  : job.state === "cancelled"
                    ? "已取消"
                    : "有项目未完成"}{" "}
            · {job.items.filter((i) => i.state === "succeeded").length}/
            {job.items.length}
          </p>
          {running && (
            <button
              onClick={() =>
                void operate(async () => {
                  const version = life.current,
                    r = await api.cancel(job.id);
                  if (version !== life.current) return;
                  if (r.ok) setJob(r.value);
                  else setError(r.error);
                })
              }
            >
              取消剩余分析
            </button>
          )}
          {job.items.map((i, n) => (
            <p key={n}>
              {names[i.capability]} · {states[i.state]}
              {i.error ? " · " + i.error : ""}
            </p>
          ))}
        </div>
      )}
      {captions.slice(0, 3).map((c) => (
        <article className="visual-ai-result" key={c.id}>
          <small>
            {c.model} · {c.location === "external" ? "外部服务" : "本机"} ·{" "}
            {new Date(c.createdAt).toLocaleString()}
            {c.historicalOnly ? " · 历史结果" : " · 当前 AI 描述"}
          </small>
          {c.reasoning && <small> · 思考强度：{c.reasoning}</small>}
          {c.physicalCalls && <p>实际调用 {c.physicalCalls} 次</p>}
          {c.usage && <p>用量：输入 {c.usage.inputTokens ?? "未报告"} / 输出 {c.usage.outputTokens ?? "未报告"} tokens
            {c.usage.costEstimateUsd === null ? " · 费用未知" : ` · 目录估算 $${c.usage.costEstimateUsd}`}</p>}
          <p>{c.caption}</p>
        </article>
      ))}
      {error && <p role="alert">{error}</p>}
      {attempts?.items.some((i) =>
        ["unknown", "failed", "paused", "cancelled"].includes(i.state),
      ) && (
        <details aria-label="基础分析中断记录">
          <summary>查看中断与未完成记录</summary>
          {attempts.items
            .filter((i) =>
              ["unknown", "failed", "paused", "cancelled"].includes(i.state),
            )
            .map((i) => (
              <article key={i.requestId} className="visual-ai-result">
                <p>
                  {names[i.capability]} ·{" "}
                  {i.state === "unknown"
                    ? "结果不确定"
                    : i.state === "paused"
                      ? "发送前中断"
                      : "未完成"}
                  {i.disposition ? " · 已放弃等待" : ""} · {i.model} ·{" "}
                  {new Date(i.updatedAt).toLocaleString()}
                </p>
                <p>
                  {i.sourceMatches
                    ? "原输入版本仍匹配"
                    : "素材版本已变化；原记录保留"}
                </p>
                <div className="visual-ai-actions">
                  <button
                    disabled={busy || running}
                    onClick={() => recover(i, "reconcile")}
                  >
                    核对已保存回执
                  </button>
                  <button
                    disabled={busy || running}
                    onClick={() => recover(i, "keep")}
                  >
                    保留记录
                  </button>
                  <button
                    disabled={
                      busy || running || !!i.disposition || !i.attemptId
                    }
                    onClick={() => setAbandon(i)}
                  >
                    放弃等待…
                  </button>
                  <button
                    disabled={busy || running}
                    onClick={() => prepare([i.capability], true)}
                  >
                    重新确认执行…
                  </button>
                </div>
              </article>
            ))}
        </details>
      )}
      {abandon && (
        <div className="visual-ai-review" aria-label="确认基础分析中断处置">
          <p>
            放弃只表示停止等待，不代表此前模型没有执行或云端用量为零。原不确定记录会保留。
          </p>
          <button disabled={busy} onClick={() => setAbandon(null)}>
            取消
          </button>
          <button disabled={busy} onClick={() => recover(abandon, "abandon")}>
            确认放弃等待
          </button>
        </div>
      )}
    </section>
  );
}
