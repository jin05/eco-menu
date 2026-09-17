import { NextRequest } from 'next/server'

// =============================================
// シンプルなインメモリレート制限
// =============================================
// NOTE: プロセスメモリ上で状態を持つため、サーバーレスで複数インスタンスに
// スケールした場合はインスタンスごとの制限になる。厳密な制限が必要になったら
// Upstash Redis などの外部ストアに置き換えること。

interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

export interface RateLimitResult {
  allowed: boolean
  retryAfterSeconds: number
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now()
  const bucket = buckets.get(key)

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    pruneExpired(now)
    return { allowed: true, retryAfterSeconds: 0 }
  }

  if (bucket.count >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    }
  }

  bucket.count += 1
  return { allowed: true, retryAfterSeconds: 0 }
}

// Mapが無制限に増えないよう、期限切れのエントリを掃除する
function pruneExpired(now: number): void {
  for (const [key, bucket] of buckets) {
    if (now >= bucket.resetAt) {
      buckets.delete(key)
    }
  }
}

/**
 * レート制限のキーに使うクライアント識別子を取得する。
 * プロキシ配下では x-forwarded-for の最左要素がクライアントIP。
 */
export function getClientKey(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  return request.headers.get('x-real-ip') ?? 'unknown'
}
