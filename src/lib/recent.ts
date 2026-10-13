"use client"

import { useSyncExternalStore } from "react"

const KEY = "dnx:recent"
const MAX = 8
const EMPTY: string[] = []
let snapshot: string[] | null = null
const listeners = new Set<() => void>()

function read(): string[] {
  if (snapshot) return snapshot
  try {
    snapshot = JSON.parse(localStorage.getItem(KEY) ?? "[]")
  } catch {
    snapshot = []
  }
  return snapshot!
}

function write(list: string[]) {
  snapshot = list
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {}
  listeners.forEach((l) => l())
}

export function addRecent(domain: string) {
  write([domain, ...read().filter((d) => d !== domain)].slice(0, MAX))
}

export function clearRecent() {
  write([])
}

export function useRecent(): string[] {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    read,
    () => EMPTY,
  )
}
