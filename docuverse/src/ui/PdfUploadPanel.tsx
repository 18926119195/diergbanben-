import { useRef, useState } from 'react'
import { importPdfFile } from '../data/pdfImport'
import { useDocuverse } from '../cvs/store'

export function PdfUploadPanel() {
  const inputRef = useRef<HTMLInputElement>(null)
  const applyUploadedUniverse = useDocuverse((s) => s.applyUploadedUniverse)
  const clearWorkspaceAnnotations = useDocuverse((s) => s.clearWorkspaceAnnotations)
  const setUploadProgress = useDocuverse((s) => s.setUploadProgress)
  const uploadProgress = useDocuverse((s) => s.uploadProgress)
  const corpus = useDocuverse((s) => s.corpus)
  const uploadLabel = useDocuverse((s) => s.uploadLabel)
  const setCorpus = useDocuverse((s) => s.setCorpus)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const onPick = async (file: File | undefined) => {
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('请选择 PDF 文件')
      return
    }
    setError(null)
    setBusy(true)
    try {
      const result = await importPdfFile(file, (p) => {
        setUploadProgress({
          current: p.current,
          total: p.total,
          message: p.message,
        })
      })
      applyUploadedUniverse(result)
      setUploadProgress(null)
    } catch (e) {
      const msg = e instanceof Error ? e.message : '导入失败'
      setError(msg)
      setUploadProgress(null)
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <section className="hud-panel upload">
      <h2>上传 PDF</h2>
      <p className="meta">扫描版亦可 · 每页变成一张卡片 · 导入后标注从空开始</p>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        hidden
        onChange={(e) => void onPick(e.target.files?.[0])}
      />
      <button
        type="button"
        className="upload-btn"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? '正在渲染…' : '选择 PDF 文件'}
      </button>
      <button
        type="button"
        className="corpus-chip"
        disabled={busy}
        title="清除强调圈、紫线、OCR 粘结与本地缓存；页面保留"
        onClick={() => {
          if (
            !window.confirm(
              '清除全部强调 / 连线 / 粘结标注？页面会保留，可继续导入或重画。',
            )
          ) {
            return
          }
          clearWorkspaceAnnotations()
        }}
      >
        清空标注
      </button>
      {uploadProgress && (
        <div className="upload-progress">
          <div className="bar">
            <span
              style={{
                width:
                  uploadProgress.total > 0
                    ? `${(100 * uploadProgress.current) / uploadProgress.total}%`
                    : '12%',
              }}
            />
          </div>
          <p className="meta">{uploadProgress.message}</p>
        </div>
      )}
      {uploadLabel && (
        <button
          type="button"
          className={corpus === 'upload' ? 'active corpus-chip' : 'corpus-chip'}
          onClick={() => setCorpus('upload')}
        >
          当前上传：{uploadLabel}
        </button>
      )}
      {error && <p className="upload-error">{error}</p>}
    </section>
  )
}
