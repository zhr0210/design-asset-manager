import { PageHeader } from '../components/ui/WorkspacePrimitives'
import React, { useCallback, useEffect, useState } from 'react'
import {
  AlertTriangle,
  Database,
  HardDrive,
  Loader2,
  RefreshCw,
  ShieldCheck
} from 'lucide-react'

import {
  createElectronModelLibraryWorkspaceModule
} from '../modules/model-library-workspace/electron-model-library-workspace.adapter'
import {
  projectModelStorageCondition,
  type ModelLibraryPageSnapshot,
  type ModelLibraryStorageReviewSnapshot
} from '../modules/model-library-workspace/model-library-workspace.module'

type PageState = { readonly state: 'loading' } | ModelLibraryPageSnapshot

export default function ModelLibraryPage() {
  const [workspace] = useState(createElectronModelLibraryWorkspaceModule)
  const [page, setPage] = useState<PageState>({ state: 'loading' })
  const [storageReview, setStorageReview] =
    useState<ModelLibraryStorageReviewSnapshot | null>(null)
  const [configuringStorage, setConfiguringStorage] = useState(false)

  const loadPage = useCallback(async () => {
    setPage({ state: 'loading' })
    setPage(await workspace.loadPage())
  }, [workspace])

  const reviewStorage = useCallback(async (
    source: 'recommended' | 'choose-parent'
  ) => {
    setConfiguringStorage(true)
    setStorageReview(await workspace.reviewStorage(source))
    setConfiguringStorage(false)
  }, [workspace])

  const confirmStorage = useCallback(async () => {
    if (storageReview?.state !== 'review-required') return
    setConfiguringStorage(true)
    setPage(await workspace.confirmStorage(storageReview.review.review))
    setStorageReview(null)
    setConfiguringStorage(false)
  }, [storageReview, workspace])

  useEffect(() => {
    let active = true
    void workspace.loadPage().then((snapshot) => {
      if (active) setPage(snapshot)
    })
    return () => {
      active = false
    }
  }, [workspace])

  const summary = page.state === 'ready' ? page.summary : null
  const catalogAvailable = summary?.catalog.state === 'available'
  const storagePresentation = summary?.storage.state === 'configured'
    ? projectModelStorageCondition(summary.storage.condition)
    : null

  return (
    <main className="ui-page ui-tool-page mx-auto max-w-6xl space-y-6 pb-12">
      <PageHeader eyebrow="MODEL LIBRARY" title="模型库" description="查看发布目录与模型存储状态，按需配置。" actions={<>
        <button
          type="button"
          onClick={() => void loadPage()}
          disabled={page.state === 'loading'}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 transition hover:border-brand-300 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        >
          <RefreshCw
            size={16}
            className={page.state === 'loading' ? 'animate-spin' : ''}
          />
          刷新状态
        </button>
      </>} />


      {page.state === 'loading' ? (
        <StatusPanel icon={<Loader2 className="animate-spin" size={20} />}>
          正在验证本机随附的 Official Catalog…
        </StatusPanel>
      ) : null}

      {page.state === 'bridge-unavailable' ? (
        <StatusPanel icon={<AlertTriangle size={20} />} warning>
          当前环境未连接桌面应用，模型库保持只读且不可配置。
        </StatusPanel>
      ) : null}

      {page.state === 'unavailable' ? (
        <StatusPanel icon={<AlertTriangle size={20} />} warning>
          模型库状态暂时无法验证，请稍后手动刷新。
        </StatusPanel>
      ) : null}

      {summary ? (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <SectionHeading icon={<ShieldCheck size={20} />} title="Official Catalog" />
            {summary.catalog.state === 'unavailable' ? (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                <p className="font-bold">未包含可验证的官方模型目录</p>
                <p className="mt-1 leading-6">
                  当前版本没有通过发布签名与版本绑定验证的目录，也不会改用网络或旧设置作为替代来源。
                </p>
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">
                <p className="font-bold">此版本的 Official Catalog 已通过验证</p>
                <p className="mt-1 leading-6">
                  目录仅展示发布者确认的只读元数据，不授予网络、模型文件或 Runtime 权限。
                </p>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <SectionHeading icon={<Database size={20} />} title="模型存储" />
            {summary.storage.state === 'not-configured' ? (
              <div className="mt-4">
                <p className="font-bold text-slate-800 dark:text-slate-100">
                  模型存储尚未设置
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  设置时将在选定父位置内创建应用管理的专属目录，不接管现有文件夹。
                </p>
              </div>
            ) : storagePresentation ? (
              <div className={`mt-4 rounded-xl border p-4 text-sm ${
                storagePresentation.tone === 'positive'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200'
                  : storagePresentation.tone === 'danger'
                    ? 'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200'
                    : storagePresentation.tone === 'attention'
                      ? 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200'
                      : 'border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200'
              }`}>
                <p className="font-bold">{storagePresentation.title}</p>
                <p className="mt-1 leading-6">{storagePresentation.detail}</p>
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-3">
              <StorageLocationButton
                label="使用推荐位置"
                disabled={!catalogAvailable || configuringStorage}
                onClick={() => void reviewStorage('recommended')}
              />
              <StorageLocationButton
                label="选择其他位置"
                disabled={!catalogAvailable || configuringStorage}
                onClick={() => void reviewStorage('choose-parent')}
                secondary
              />
            </div>

            <p className={`mt-3 text-sm leading-6 ${
              catalogAvailable
                ? 'text-slate-500 dark:text-slate-400'
                : 'text-amber-700 dark:text-amber-300'
            }`}>
              {catalogAvailable
                ? '选择位置后会先显示受管目录与操作后果，确认前不会写入。'
                : '只有 Official Catalog 通过此版本的发布验证后，位置配置才会开放。'}
            </p>

            {storageReview?.state === 'review-required' ? (
              <div className="mt-4 rounded-xl border border-brand-200 bg-brand-50 p-4 dark:border-brand-900/60 dark:bg-brand-950/30">
                <p className="text-sm font-black text-brand-800 dark:text-brand-200">
                  确认模型存储位置
                </p>
                <p className="mt-2 text-sm text-brand-700 dark:text-brand-300">
                  {storageReview.review.location.volumeName} · {storageReview.review.location.managedFolderName}
                </p>
                <p className="mt-2 text-xs leading-5 text-brand-700 dark:text-brand-300">
                  应用会创建并登记专属受管根；不会移动、删除、导入或安装模型，也不会激活模型、启动 Runtime 或开始推理。
                </p>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => void confirmStorage()}
                    disabled={configuringStorage}
                    className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-black text-white disabled:opacity-50"
                  >
                    确认使用此位置
                  </button>
                  <button
                    type="button"
                    onClick={() => setStorageReview(null)}
                    disabled={configuringStorage}
                    className="rounded-xl border border-brand-200 px-4 py-2 text-sm font-black text-brand-700 disabled:opacity-50 dark:border-brand-800 dark:text-brand-300"
                  >
                    取消
                  </button>
                </div>
              </div>
            ) : null}

            {storageReview?.state === 'blocked' ? (
              <p className="mt-4 text-sm font-bold text-amber-700 dark:text-amber-300">
                此位置无法用于当前操作：{storageReview.reason}
              </p>
            ) : null}

            {storageReview?.state === 'unavailable' ? (
              <p className="mt-4 text-sm font-bold text-rose-700 dark:text-rose-300">
                当前无法复核此位置，请稍后重试。
              </p>
            ) : null}
          </section>
        </>
      ) : null}
    </main>
  )
}

function SectionHeading({
  icon,
  title
}: {
  readonly icon: React.ReactNode
  readonly title: string
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="rounded-xl bg-slate-100 p-2 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        {icon}
      </span>
      <h2 className="font-black text-slate-950 dark:text-white">{title}</h2>
      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        只读
      </span>
    </div>
  )
}

function StorageLocationButton({
  label,
  disabled,
  onClick,
  secondary = false
}: {
  readonly label: string
  readonly disabled: boolean
  readonly onClick: () => void
  readonly secondary?: boolean
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={disabled ? 'Official Catalog 验证后开放' : undefined}
      className={secondary
        ? 'inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-600 disabled:cursor-not-allowed disabled:text-slate-400 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
        : 'inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 dark:disabled:bg-slate-800'
      }
    >
      <HardDrive size={17} />
      {label}
    </button>
  )
}

function StatusPanel({
  children,
  icon,
  warning = false
}: {
  readonly children: React.ReactNode
  readonly icon: React.ReactNode
  readonly warning?: boolean
}) {
  const colors = warning
    ? 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200'
    : 'border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
  return (
    <div className={`flex items-center gap-3 rounded-2xl border p-5 text-sm ${colors}`}>
      {icon}
      <span>{children}</span>
    </div>
  )
}
