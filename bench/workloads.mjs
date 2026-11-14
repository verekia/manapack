// The messages every library packs: a seeded world of 48 entities, as a game server and a client would send it.
// Every float is a float32 already, so a float32 field loses nothing.

export const MESSAGES = 256
export const KINDS = ['player', 'monster', 'npc']
export const STANCES = ['idle', 'run', 'cast', 'stun']

const mulberry32 = seed => {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
const SYLLABLES = ['ka', 'ri', 'no', 'va', 'el', 'th', 'or', 'mi', 'su', 'da', 'len', 'gar']

const build = () => {
  const random = mulberry32(20261114)
  const int = (min, max) => min + Math.floor(random() * (max - min + 1))
  const float = (min, max) => Math.fround(min + random() * (max - min))
  const pick = list => list[Math.floor(random() * list.length)]
  const id = length => Array.from({ length }, () => ALPHABET[Math.floor(random() * ALPHABET.length)]).join('')
  const name = () => {
    const text = Array.from({ length: int(2, 5) }, () => pick(SYLLABLES)).join('')
    return text[0].toUpperCase() + text.slice(1, 12)
  }

  const world = Array.from({ length: 48 }, () => {
    const maxHealth = int(80, 2000)
    return {
      id: id(20),
      name: name(),
      kind: pick(KINDS),
      x: float(0, 400),
      y: float(0, 400),
      rot: float(-Math.PI, Math.PI),
      vx: 0,
      vy: 0,
      health: maxHealth,
      maxHealth,
      mana: int(0, 1000),
      level: int(1, 60),
      alive: true,
    }
  })
  const zones = [id(5), id(5), id(5)]
  const abilities = Array.from({ length: 12 }, () => id(5))
  const startedAt = 1_794_600_000_000

  const step = entity => {
    const moving = random() < 0.8
    entity.vx = moving ? float(-12, 12) : 0
    entity.vy = moving ? float(-12, 12) : 0
    entity.x = Math.fround(Math.min(Math.max(entity.x + entity.vx * 0.05, 0), 400))
    entity.y = Math.fround(Math.min(Math.max(entity.y + entity.vy * 0.05, 0), 400))
    entity.rot = float(-Math.PI, Math.PI)
  }

  // Everything about 32 entities: what a client is sent when it joins
  const snapshot = Array.from({ length: MESSAGES }, (_, i) => {
    for (const entity of world) step(entity)
    const first = int(0, world.length - 32)
    return {
      t: startedAt + i * 1000,
      entities: world.slice(first, first + 32).map(e => ({
        id: e.id,
        name: e.name,
        kind: e.kind,
        x: e.x,
        y: e.y,
        rot: e.rot,
        health: e.health,
        maxHealth: e.maxHealth,
        mana: e.mana,
        level: e.level,
        alive: e.alive,
      })),
    }
  })

  // What changed in one tick of 50 ms: a few fields of some entities
  const update = Array.from({ length: MESSAGES }, (_, i) => {
    const updates = []
    for (const entity of world) {
      if (updates.length >= 24 || random() > 0.36) continue
      const change = { id: entity.id }
      if (random() < 0.75) {
        step(entity)
        Object.assign(change, { x: entity.x, y: entity.y, rot: entity.rot, vx: entity.vx, vy: entity.vy })
      }
      if (random() < 0.15) change.health = entity.health = int(0, entity.maxHealth)
      if (random() < 0.2) change.mana = entity.mana = int(0, 1000)
      if (random() < 0.05) change.stance = pick(STANCES)
      if (Object.keys(change).length > 1) updates.push(change)
    }
    return { t: startedAt + i * 50, ack: 1000 + i * 3 + int(0, 2), updates }
  })

  // What a client sends 20 times a second
  const input = Array.from({ length: MESSAGES }, (_, i) => {
    const roll = random()
    const actions = Array.from({ length: roll < 0.6 ? 0 : roll < 0.9 ? 1 : 2 }, () =>
      random() < 0.7 ? { ability: pick(abilities), target: pick(world).id } : { ability: pick(abilities) },
    )
    return {
      seq: 5000 + i,
      t: startedAt + i * 50 + int(0, 9),
      x: float(0, 400),
      y: float(0, 400),
      vx: float(-12, 12),
      vy: float(-12, 12),
      rot: float(-Math.PI, Math.PI),
      zone: zones[i < 200 ? 0 : 1],
      actions,
    }
  })

  return { snapshot, update, input }
}

export const workloads = build()
export const WORKLOADS = Object.keys(workloads)

// The same message, whatever a library reads an absent field as: no undefined, and numbers to 2 mm
export const same = (a, b, path = '') => {
  if (typeof a === 'number' && typeof b === 'number') {
    if (Math.abs(a - b) <= 0.002 + Math.abs(a) * 1e-6) return null
    return `${path}: ${a} is not ${b}`
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return `${path}: ${a.length} items, not ${b.length}`
    for (let i = 0; i < a.length; i++) {
      const difference = same(a[i], b[i], `${path}[${i}]`)
      if (difference) return difference
    }
    return null
  }
  if (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) && !Array.isArray(b)) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)].filter(key => a[key] !== undefined || b[key] !== undefined))
    for (const key of keys) {
      const difference = same(a[key], b[key], `${path}.${key}`)
      if (difference) return difference
    }
    return null
  }
  return a === b ? null : `${path}: ${JSON.stringify(a)} is not ${JSON.stringify(b)}`
}
