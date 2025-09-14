'use client'

import { Base64, Base64x16, Base64x128, CONTENT_NIBBLES, TIMESTAMP_DIGITS } from '../../application/types/fhe'

// Dynamic import URL for tfhe.js (browser-only)
function getTfheModuleUrl(): string {
  const url = process.env.NEXT_PUBLIC_TFHE_JS_URL || '/tfhe/pkg/tfhe.js'
  return url
}

export async function loadTfhe(): Promise<any> {
  if (typeof window === 'undefined') throw new Error('tfhe must be loaded in browser')
  const url = getTfheModuleUrl()
  const mod = await import(/* @vite-ignore */ /* webpackIgnore: true */ url as any)
  // Some bundlers require default() init; handle both
  if (typeof mod.default === 'function') {
    await mod.default()
  }
  return mod
}

export function bytesToB64(bytes: Uint8Array): string {
  if (typeof window === 'undefined') return Buffer.from(bytes).toString('base64')
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

export function b64ToBytes(b64: string): Uint8Array {
  if (typeof window === 'undefined') return new Uint8Array(Buffer.from(b64, 'base64'))
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

let lastTs = 0n
export function nextMonotonicTs(): bigint {
  const now = BigInt(Date.now())
  lastTs = now > lastTs ? now : lastTs + 1n
  return lastTs
}

// u64 -> 16 hex digits (MSB..LSB) -> encrypt each nibble
export function encryptU64ToDigitsB64Array(tfhe: any, cks: any, n: bigint | number): Base64x16 {
  let x = typeof n === 'bigint' ? n : BigInt(Math.floor(n))
  const digits: number[] = Array(16).fill(0)
  for (let i = 15; i >= 0; i--) { digits[i] = Number(x & 0xfn); x >>= 4n }
  const arr = digits.map((d) => {
    const ct = tfhe.Shortint.encrypt(cks, BigInt(d))
    const serialized: Uint8Array = tfhe.Shortint.serialize_ciphertext(ct)
    return bytesToB64(serialized)
  }) as Base64[]
  return arr as Base64x16
}

export function decryptDigitsB64ArrayToU64(tfhe: any, cks: any, digitsB64: Base64[]): bigint {
  let acc = 0n
  for (let i = 0; i < digitsB64.length; i++) {
    const ctBytes = b64ToBytes(digitsB64[i])
    const ct = tfhe.Shortint.deserialize_ciphertext(ctBytes)
    const m = tfhe.Shortint.decrypt(cks, ct) as bigint
    acc = (acc << 4n) | (m & 0xfn)
  }
  return acc
}

// UTF-8 text -> [len_hi, len_lo] + bytes -> split into nibbles -> encrypt
export function encryptContentToNibbleArrayB64(tfhe: any, cks: any, text: string): Base64x128 {
  const encoder = new TextEncoder()
  let bytes = encoder.encode(text)
  if (bytes.length > CONTENT_NIBBLES / 2 - 2) {
    bytes = bytes.slice(0, CONTENT_NIBBLES / 2 - 2)
  }
  const len = bytes.length
  const buf = new Uint8Array(2 + len)
  buf[0] = (len >> 8) & 0xff
  buf[1] = len & 0xff
  buf.set(bytes, 2)
  const nibbles: number[] = []
  for (let i = 0; i < buf.length; i++) {
    const b = buf[i]
    nibbles.push((b >> 4) & 0x0f)
    nibbles.push(b & 0x0f)
  }
  // pad to 128 nibbles
  while (nibbles.length < CONTENT_NIBBLES) nibbles.push(0)
  const out = nibbles.slice(0, CONTENT_NIBBLES).map((d) => {
    const ct = tfhe.Shortint.encrypt(cks, BigInt(d))
    const ser: Uint8Array = tfhe.Shortint.serialize_ciphertext(ct)
    return bytesToB64(ser)
  }) as Base64[]
  return out as Base64x128
}

export function decryptContentFromNibbleArrayB64(tfhe: any, cks: any, cts: Base64[]): string {
  // take first 128 nibbles
  const n = Math.min(cts.length, CONTENT_NIBBLES)
  const nibbles: number[] = new Array(n)
  for (let i = 0; i < n; i++) {
    const ct = tfhe.Shortint.deserialize_ciphertext(b64ToBytes(cts[i]))
    const m = Number(tfhe.Shortint.decrypt(cks, ct) as bigint) & 0x0f
    nibbles[i] = m
  }
  // reconstruct bytes
  const byteLen = Math.floor(n / 2)
  const buf = new Uint8Array(byteLen)
  for (let i = 0; i < byteLen; i++) {
    const hi = nibbles[i * 2] ?? 0
    const lo = nibbles[i * 2 + 1] ?? 0
    buf[i] = ((hi & 0x0f) << 4) | (lo & 0x0f)
  }
  const contentLen = (buf[0] << 8) | buf[1]
  const body = buf.slice(2, 2 + contentLen)
  const decoder = new TextDecoder()
  return decoder.decode(body)
}

export async function restoreClientKey(tfhe: any, clientKeyB64: string): Promise<any> {
  const cksBytes = b64ToBytes(clientKeyB64)
  return tfhe.Shortint.deserialize_client_key(cksBytes)
}


