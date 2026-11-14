import { useEffect, useRef, useState } from 'react'

import { channel, createWireState, delta, fixed, float, list, optional, struct, sym, uint } from 'manapack'
import type { Codec } from 'manapack'

import Head from 'next/head'

type Update = { id: string; x?: number; y?: number; health?: number }
type Diff = { t: number; updates: Update[] }
type Message = { type: 'diff'; payload: Diff }

const wireOf = (position: Codec<number>) =>
  channel<Message>([
    [
      'diff',
      struct<Diff>({
        t: delta(0),
        updates: list(
          struct<Update>(
            { id: sym(), x: optional(position), y: optional(position), health: optional(uint) },
            { sparse: true },
          ),
        ),
      }),
    ],
  ])

const WIRES = { fixed: wireOf(fixed(512)), float: wireOf(float) }
type Position = keyof typeof WIRES

const SCHEMA = `const update = struct<Update>(
  {
    id: sym(),
    x: optional(fixed(512)),
    y: optional(fixed(512)),
    health: optional(uint),
  },
  { sparse: true },
)

const diff = struct<Diff>({ t: delta(0), updates: list(update) })

const toClient = channel<Message>([['diff', diff]])`

const TICK_MS = 50
// metres, and pixels a metre on the board
const WIDTH = 40
const HEIGHT = 24
const SCALE = 20
const KINDS = ['imp', 'orc', 'bat', 'elf']
const HEX_BYTES = 120

type Body = { id: string; x: number; y: number; vx: number; vy: number; health: number; rest: number }
type Seen = { x: number; y: number; health: number }
type Stats = {
  packed: number
  json: number
  packedSecond: number
  jsonSecond: number
  messages: number
  hex: string
  first: string
}

const spawn = (i: number): Body => {
  const angle = Math.random() * Math.PI * 2
  const speed = 2 + Math.random() * 6
  return {
    id: `${KINDS[i % KINDS.length]}-${Math.random().toString(16).slice(2, 10)}`,
    x: Math.random() * WIDTH,
    y: Math.random() * HEIGHT,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    health: 100,
    rest: 0,
  }
}

// One tick of the server: what changed, and everything on the first tick of a socket
const step = (bodies: Body[], whole: boolean): Update[] => {
  const updates: Update[] = []
  for (const body of bodies) {
    const update: Update = { id: body.id }
    if (body.rest > 0) body.rest--
    else {
      body.x += (body.vx * TICK_MS) / 1000
      body.y += (body.vy * TICK_MS) / 1000
      if (body.x < 0 || body.x > WIDTH) body.vx = -body.vx
      if (body.y < 0 || body.y > HEIGHT) body.vy = -body.vy
      body.x = Math.min(Math.max(body.x, 0), WIDTH)
      body.y = Math.min(Math.max(body.y, 0), HEIGHT)
      update.x = body.x
      update.y = body.y
      if (Math.random() < 0.01) body.rest = 20 + Math.floor(Math.random() * 60)
    }
    if (Math.random() < 0.03) {
      body.health = body.health > 20 ? body.health - Math.ceil(Math.random() * 20) : 100
      update.health = body.health
    }
    if (whole) Object.assign(update, { x: body.x, y: body.y, health: body.health })
    if (update.x !== undefined || update.health !== undefined) updates.push(update)
  }
  return updates
}

const draw = (canvas: HTMLCanvasElement, world: Map<string, Seen>) => {
  const context = canvas.getContext('2d')
  if (!context) return
  const ratio = canvas.width / (WIDTH * SCALE)
  context.setTransform(ratio, 0, 0, ratio, 0, 0)
  context.clearRect(0, 0, WIDTH * SCALE, HEIGHT * SCALE)
  for (const seen of world.values()) {
    context.fillStyle = `hsl(${seen.health * 1.2} 75% 55%)`
    context.beginPath()
    context.arc(seen.x * SCALE, seen.y * SCALE, 6, 0, Math.PI * 2)
    context.fill()
  }
}

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0)
const bytes = (n: number) => (n < 1024 ? `${n} B` : `${(n / 1024).toFixed(1)} KB`)

const Row = ({ label, packed, json }: { label: string; packed: number; json: number }) => (
  <div className="flex items-baseline justify-between gap-4">
    <span className="text-zinc-400">{label}</span>
    <span className="tabular-nums">
      <span className="font-semibold text-emerald-400">{bytes(packed)}</span>
      <span className="text-zinc-500"> · JSON {bytes(json)}</span>
      <span className="text-zinc-400"> · {packed > 0 ? (json / packed).toFixed(1) : '–'}×</span>
    </span>
  </div>
)

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [count, setCount] = useState(24)
  const [named, setNamed] = useState(true)
  const [position, setPosition] = useState<Position>('fixed')
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = WIDTH * SCALE * window.devicePixelRatio
    canvas.height = HEIGHT * SCALE * window.devicePixelRatio

    // a socket opens: the server's writer and the client's reader start together
    const wire = WIRES[position]
    const writer = named ? createWireState() : null
    const reader = named ? createWireState() : null
    const bodies = Array.from({ length: count }, (_, i) => spawn(i))
    const world = new Map<string, Seen>()
    const text = new TextEncoder()
    const packedSizes: number[] = []
    const jsonSizes: number[] = []
    const openedAt = Date.now()
    let messages = 0

    const tick = () => {
      const message: Message = {
        type: 'diff',
        payload: { t: openedAt + messages * TICK_MS, updates: step(bodies, messages === 0) },
      }
      const packed = wire.encode(message, writer)
      const json = text.encode(JSON.stringify(message)).length
      messages++

      const read = wire.decode(packed, reader)
      for (const update of read.payload.updates) {
        const seen = world.get(update.id) ?? { x: 0, y: 0, health: 100 }
        if (update.x !== undefined) seen.x = update.x
        if (update.y !== undefined) seen.y = update.y
        if (update.health !== undefined) seen.health = update.health
        world.set(update.id, seen)
      }
      draw(canvas, world)

      packedSizes.push(packed.length)
      jsonSizes.push(json)
      if (packedSizes.length > 1000 / TICK_MS) {
        packedSizes.shift()
        jsonSizes.shift()
      }
      setStats({
        packed: packed.length,
        json,
        packedSecond: sum(packedSizes),
        jsonSecond: sum(jsonSizes),
        messages,
        hex:
          Array.from(packed.subarray(0, HEX_BYTES), byte => byte.toString(16).padStart(2, '0')).join(' ') +
          (packed.length > HEX_BYTES ? ' …' : ''),
        first: JSON.stringify(read.payload.updates[0] ?? null),
      })
    }

    tick()
    const interval = setInterval(tick, TICK_MS)
    return () => clearInterval(interval)
  }, [count, named, position])

  return (
    <>
      <Head>
        <title>Manapack</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <main className="min-h-full bg-zinc-950 text-zinc-200">
        <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
          <header className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold">Manapack</h1>
            <p className="max-w-2xl text-zinc-400">
              Every dot went through the codec. A server loop in this page writes a state diff {1000 / TICK_MS} times a
              second, and the board draws what the reader decoded.
            </p>
          </header>

          <section className="grid gap-6 lg:grid-cols-[1fr_22rem]">
            <canvas ref={canvasRef} className="aspect-5/3 w-full rounded-lg bg-zinc-900" />

            <aside className="flex flex-col gap-5 text-sm">
              <label className="flex flex-col gap-1">
                <span className="flex justify-between text-zinc-400">
                  Entities <span className="text-zinc-200 tabular-nums">{count}</span>
                </span>
                <input
                  type="range"
                  min={1}
                  max={200}
                  value={count}
                  onChange={event => setCount(Number(event.target.value))}
                />
              </label>

              <label className="flex items-center gap-2">
                <input type="checkbox" checked={named} onChange={event => setNamed(event.target.checked)} />
                A state per socket: an id is spelled once, the time is a step
              </label>

              <label className="flex items-center justify-between gap-2">
                <span className="text-zinc-400">Positions</span>
                <select
                  className="rounded bg-zinc-800 px-2 py-1"
                  value={position}
                  onChange={event => setPosition(event.target.value as Position)}
                >
                  <option value="fixed">fixed(512): 2 mm, 1 to 3 bytes</option>
                  <option value="float">float: 4 bytes</option>
                </select>
              </label>

              {stats && (
                <div className="flex flex-col gap-2 rounded-lg bg-zinc-900 p-4">
                  <Row label="This message" packed={stats.packed} json={stats.json} />
                  <Row label="A second" packed={stats.packedSecond} json={stats.jsonSecond} />
                  <div className="flex justify-between text-zinc-400">
                    <span>Since the socket opened</span>
                    <span className="tabular-nums">{stats.messages} messages</span>
                  </div>
                </div>
              )}
            </aside>
          </section>

          <section className="grid gap-6 text-sm lg:grid-cols-2">
            <div className="flex flex-col gap-2">
              <h2 className="text-zinc-400">The schema</h2>
              <pre className="overflow-x-auto rounded-lg bg-zinc-900 p-4 text-xs leading-5">{SCHEMA}</pre>
            </div>
            <div className="flex flex-col gap-2">
              <h2 className="text-zinc-400">The message on the wire</h2>
              <pre className="h-32 overflow-hidden rounded-lg bg-zinc-900 p-4 text-xs leading-5 break-all whitespace-pre-wrap text-emerald-400">
                {stats?.hex}
              </pre>
              <h2 className="text-zinc-400">Its first update, read back</h2>
              <pre className="overflow-x-auto rounded-lg bg-zinc-900 p-4 text-xs leading-5">{stats?.first}</pre>
            </div>
          </section>
        </div>
      </main>
    </>
  )
}
