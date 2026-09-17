'use client'

import { useRef, useState, useCallback } from 'react'
import { compressImage, ImageProcessingError } from '@/lib/image'

interface ImageUploaderProps {
  onImageSelect: (base64: string) => void
  disabled?: boolean
}

export default function ImageUploader({ onImageSelect, disabled }: ImageUploaderProps) {
  const [preview, setPreview] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const processFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('画像ファイルを選択してください')
      return
    }

    setError(null)
    setIsProcessing(true)
    try {
      // 送信前に縮小することで、リクエストサイズとAPIコストを抑える
      const base64 = await compressImage(file)
      setPreview(base64)
      onImageSelect(base64)
    } catch (err) {
      setError(
        err instanceof ImageProcessingError
          ? err.message
          : '画像の処理に失敗しました'
      )
    } finally {
      setIsProcessing(false)
    }
  }, [onImageSelect])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) void processFile(file)
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const file = e.dataTransfer.files?.[0]
    if (file) void processFile(file)
  }

  const clearImage = () => {
    setPreview(null)
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (cameraInputRef.current) cameraInputRef.current.value = ''
  }

  const isBusy = disabled || isProcessing

  return (
    <div className="w-full">
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {error}
        </div>
      )}
      {/* Hidden inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        disabled={isBusy}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
        disabled={isBusy}
      />

      {!preview ? (
        /* Upload area */
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`
            relative border-2 border-dashed rounded-2xl p-8
            transition-all duration-200 ease-in-out
            ${dragActive
              ? 'border-green-500 bg-green-50'
              : 'border-gray-300 bg-gray-50 hover:border-green-400 hover:bg-green-50/50'
            }
            ${isBusy ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          <div className="flex flex-col items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
              <svg
                className="w-10 h-10 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>

            <div className="text-center">
              <p className="text-lg font-medium text-gray-700">
                冷蔵庫の写真またはレシートをアップロード
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {isProcessing
                  ? '画像を処理しています...'
                  : 'ドラッグ&ドロップ、または下のボタンから選択'}
              </p>
            </div>

            <div className="flex gap-3 mt-2">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                disabled={isBusy}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg
                  hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                カメラで撮影
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isBusy}
                className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-300
                  rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                ファイルを選択
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Preview area */
        <div className="relative rounded-2xl overflow-hidden bg-gray-100">
          {/* next/image はローカル生成のdata URLプレビューには使えないため素のimgを使う */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="アップロードされた画像"
            className="w-full h-64 object-contain"
          />
          <button
            type="button"
            onClick={clearImage}
            disabled={isBusy}
            className="absolute top-3 right-3 p-2 bg-black/50 text-white rounded-full
              hover:bg-black/70 transition-colors disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="absolute bottom-3 left-3 px-3 py-1 bg-black/50 text-white text-sm rounded-full">
            画像を選択済み
          </div>
        </div>
      )}
    </div>
  )
}
