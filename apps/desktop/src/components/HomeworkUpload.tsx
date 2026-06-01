import { FileImage, ImagePlus } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

export interface HomeworkUploadPayload {
  text: string
  imageDataUrl?: string
  imageFileName?: string
}

interface HomeworkUploadProps {
  text: string
  onTextChange: (value: string) => void
  onAnalyze: (payload: HomeworkUploadPayload, saveRawImage: boolean) => void
  compact?: boolean
}

export function HomeworkUpload({ text, onTextChange, onAnalyze, compact }: HomeworkUploadProps) {
  const [preview, setPreview] = useState<string | undefined>()
  const [fileName, setFileName] = useState<string | undefined>()
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const loadFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = () => {
      const url = typeof reader.result === 'string' ? reader.result : undefined
      setPreview(url)
    }
    reader.readAsDataURL(file)
  }, [])

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const item = [...(event.clipboardData?.items ?? [])].find((i) => i.type.startsWith('image/'))
      if (!item) return
      const file = item.getAsFile()
      if (file) loadFile(file)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [loadFile])

  function submit(saveRaw: boolean) {
    onAnalyze({ text, imageDataUrl: preview, imageFileName: fileName }, saveRaw)
    setPreview(undefined)
    setFileName(undefined)
  }

  return (
    <div
      className={`homework-upload ${dragOver ? 'drag-over' : ''} ${compact ? 'compact' : ''}`}
      onDragOver={(event) => {
        event.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(event) => {
        event.preventDefault()
        setDragOver(false)
        const file = event.dataTransfer.files[0]
        if (file) loadFile(file)
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) loadFile(file)
        }}
      />
      {!compact && (
        <p className="muted">
          Drop a photo, paste from clipboard, or choose a file. Raw images are deleted after analysis unless you save
          them.
        </p>
      )}
      <textarea
        value={text}
        onChange={(event) => onTextChange(event.target.value)}
        placeholder="Paste problem text or describe the upload..."
        rows={compact ? 3 : 4}
      />
      {preview && (
        <div className="homework-preview">
          <img src={preview} alt="Homework preview" />
          <span>{fileName}</span>
        </div>
      )}
      <div className="action-row wrap">
        <button type="button" className="secondary" onClick={() => inputRef.current?.click()}>
          <ImagePlus size={18} />
          Choose image
        </button>
        <button type="button" className="secondary" onClick={() => submit(false)}>
          <FileImage size={18} />
          Analyze (discard image)
        </button>
        <button type="button" className="secondary" onClick={() => submit(true)}>
          Analyze &amp; save image
        </button>
      </div>
    </div>
  )
}
