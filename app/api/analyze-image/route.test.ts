import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from './route'

// レート制限はIP単位なので、テストごとに別IPを使って干渉を避ける
let ipCounter = 0

function postRequest(body: unknown): NextRequest {
  ipCounter += 1
  return new NextRequest('http://localhost/api/analyze-image', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': `10.1.0.${ipCounter}`,
    },
    body: JSON.stringify(body),
  })
}

describe('POST /api/analyze-image のバリデーション', () => {
  it('画像が無ければ400', async () => {
    const response = await POST(postRequest({}))
    expect(response.status).toBe(400)
  })

  it('画像が文字列でなければ400', async () => {
    const response = await POST(postRequest({ image: 12345 }))
    expect(response.status).toBe(400)
  })

  it('data URL形式でなければ400', async () => {
    const response = await POST(
      postRequest({ image: 'https://example.com/a.jpg' })
    )
    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining('画像形式'),
    })
  })

  it('非対応のメディアタイプを400で拒否する', async () => {
    const response = await POST(
      postRequest({ image: 'data:image/svg+xml;base64,AAAA' })
    )
    expect(response.status).toBe(400)
  })

  it('5MBを超える画像を413で拒否する', async () => {
    const oversized = Buffer.alloc(6 * 1024 * 1024, 1).toString('base64')
    const response = await POST(
      postRequest({ image: `data:image/jpeg;base64,${oversized}` })
    )
    expect(response.status).toBe(413)
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining('大きすぎます'),
    })
  })
})
