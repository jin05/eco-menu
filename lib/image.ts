// =============================================
// クライアント側の画像リサイズ・圧縮
// =============================================

// Claude のビジョンAPIは長辺1568pxを超える画像を内部で縮小するため、
// それ以上の解像度で送ってもコストが増えるだけで精度は上がらない。
const MAX_EDGE_PX = 1568
const JPEG_QUALITY = 0.85

export class ImageProcessingError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ImageProcessingError'
  }
}

/**
 * 画像ファイルを長辺1568px以内にリサイズし、JPEGのdata URLとして返す。
 * 透過を持つPNGは白背景に合成される。
 */
export async function compressImage(file: File): Promise<string> {
  const bitmap = await loadBitmap(file)

  try {
    const scale = Math.min(1, MAX_EDGE_PX / Math.max(bitmap.width, bitmap.height))
    const width = Math.round(bitmap.width * scale)
    const height = Math.round(bitmap.height * scale)

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new ImageProcessingError('画像の処理に失敗しました')
    }

    // JPEGは透過を扱えないため、透過部分が黒くならないよう白で塗りつぶす
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(bitmap, 0, 0, width, height)

    return canvas.toDataURL('image/jpeg', JPEG_QUALITY)
  } finally {
    bitmap.close()
  }
}

async function loadBitmap(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file)
  } catch {
    throw new ImageProcessingError(
      '画像を読み込めませんでした。別の画像を試してください。'
    )
  }
}
