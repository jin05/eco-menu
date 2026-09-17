import { describe, it, expect } from 'vitest'
import { parseBase64DataUrl, base64ByteLength } from './anthropic'

describe('parseBase64DataUrl', () => {
  it('対応形式のdata URLからメディアタイプとデータを取り出す', () => {
    expect(parseBase64DataUrl('data:image/jpeg;base64,AAAA')).toEqual({
      mediaType: 'image/jpeg',
      data: 'AAAA',
    })
    expect(parseBase64DataUrl('data:image/webp;base64,AAAA')?.mediaType).toBe(
      'image/webp'
    )
  })

  it('パディング付きのbase64を受け付ける', () => {
    expect(parseBase64DataUrl('data:image/png;base64,AA==')?.data).toBe('AA==')
    expect(parseBase64DataUrl('data:image/png;base64,AAA=')?.data).toBe('AAA=')
  })

  it('非対応のメディアタイプを拒否する', () => {
    expect(parseBase64DataUrl('data:image/svg+xml;base64,AAAA')).toBeNull()
    expect(parseBase64DataUrl('data:application/pdf;base64,AAAA')).toBeNull()
  })

  it('base64として不正な文字列を拒否する', () => {
    expect(parseBase64DataUrl('data:image/gif;base64,not valid!!')).toBeNull()
    expect(parseBase64DataUrl('data:image/gif;base64,')).toBeNull()
  })

  it('data URL以外を拒否する', () => {
    expect(parseBase64DataUrl('https://example.com/a.jpg')).toBeNull()
    expect(parseBase64DataUrl('')).toBeNull()
  })
})

describe('base64ByteLength', () => {
  it('デコード後のバイト数を返す', () => {
    // 3バイトごとに4文字へ符号化される
    expect(base64ByteLength(Buffer.from('abc').toString('base64'))).toBe(3)
    expect(base64ByteLength(Buffer.from('ab').toString('base64'))).toBe(2)
    expect(base64ByteLength(Buffer.from('a').toString('base64'))).toBe(1)
  })

  it('大きな入力でも実際のバイト数と一致する', () => {
    const bytes = Buffer.alloc(1024 * 1024, 7)
    expect(base64ByteLength(bytes.toString('base64'))).toBe(bytes.length)
  })
})
