import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from './route'

// レート制限はIP単位なので、テストごとに別IPを使って干渉を避ける
let ipCounter = 0

function postRequest(body: unknown): NextRequest {
  ipCounter += 1
  return new NextRequest('http://localhost/api/generate-menu', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': `10.0.0.${ipCounter}`,
    },
    body: JSON.stringify(body),
  })
}

async function postRaw(body: string): Promise<Response> {
  ipCounter += 1
  return POST(
    new NextRequest('http://localhost/api/generate-menu', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': `10.0.0.${ipCounter}`,
      },
      body,
    })
  )
}

describe('POST /api/generate-menu のバリデーション', () => {
  it('JSONとして壊れたボディを400で拒否する', async () => {
    const response = await postRaw('{ not json')
    expect(response.status).toBe(400)
  })

  it('食材リストが無ければ400', async () => {
    const response = await POST(postRequest({}))
    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining('食材リスト'),
    })
  })

  it('食材リストが空配列なら400', async () => {
    const response = await POST(postRequest({ ingredients: [] }))
    expect(response.status).toBe(400)
  })

  it('空白のみの食材しか無ければ400', async () => {
    const response = await POST(postRequest({ ingredients: ['   ', ''] }))
    expect(response.status).toBe(400)
  })

  it('食材が配列でなければ400', async () => {
    const response = await POST(postRequest({ ingredients: 'トマト' }))
    expect(response.status).toBe(400)
  })

  it('食材に文字列以外が混ざっていれば400', async () => {
    const response = await POST(postRequest({ ingredients: ['トマト', 42] }))
    expect(response.status).toBe(400)
  })

  it('食材が50件を超えたら400', async () => {
    const ingredients = Array.from({ length: 51 }, (_, i) => `食材${i}`)
    const response = await POST(postRequest({ ingredients }))
    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining('50件'),
    })
  })

  it('食材名が50文字を超えたら400', async () => {
    const response = await POST(postRequest({ ingredients: ['あ'.repeat(51)] }))
    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining('50文字'),
    })
  })

  it('レート制限を超えたら429とRetry-Afterを返す', async () => {
    const ip = '10.99.0.1'
    const send = () =>
      POST(
        new NextRequest('http://localhost/api/generate-menu', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-forwarded-for': ip,
          },
          body: JSON.stringify({ ingredients: [] }),
        })
      )

    // 制限は20件/分。全て400で返るが、レート制限のカウントは進む
    for (let i = 0; i < 20; i++) {
      await send()
    }

    const limited = await send()
    expect(limited.status).toBe(429)
    expect(limited.headers.get('Retry-After')).toBeTruthy()
  })
})
