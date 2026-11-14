// flatbuffers/ts/bench/action.ts
import * as flatbuffers from 'flatbuffers'

class Action {
  bb = null
  bb_pos = 0
  __init(i, bb) {
    this.bb_pos = i
    this.bb = bb
    return this
  }
  static getRootAsAction(bb, obj) {
    return (obj || new Action()).__init(bb.readInt32(bb.position()) + bb.position(), bb)
  }
  static getSizePrefixedRootAsAction(bb, obj) {
    bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH)
    return (obj || new Action()).__init(bb.readInt32(bb.position()) + bb.position(), bb)
  }
  ability(optionalEncoding) {
    const offset = this.bb.__offset(this.bb_pos, 4)
    return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null
  }
  target(optionalEncoding) {
    const offset = this.bb.__offset(this.bb_pos, 6)
    return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null
  }
  static startAction(builder) {
    builder.startObject(2)
  }
  static addAbility(builder, abilityOffset) {
    builder.addFieldOffset(0, abilityOffset, 0)
  }
  static addTarget(builder, targetOffset) {
    builder.addFieldOffset(1, targetOffset, 0)
  }
  static endAction(builder) {
    const offset = builder.endObject()
    return offset
  }
  static createAction(builder, abilityOffset, targetOffset) {
    Action.startAction(builder)
    Action.addAbility(builder, abilityOffset)
    Action.addTarget(builder, targetOffset)
    return Action.endAction(builder)
  }
  unpack() {
    return new ActionT(this.ability(), this.target())
  }
  unpackTo(_o) {
    _o.ability = this.ability()
    _o.target = this.target()
  }
}

class ActionT {
  ability
  target
  constructor(ability = null, target = null) {
    this.ability = ability
    this.target = target
  }
  pack(builder) {
    const ability = this.ability !== null ? builder.createString(this.ability) : 0
    const target = this.target !== null ? builder.createString(this.target) : 0
    return Action.createAction(builder, ability, target)
  }
}
// flatbuffers/ts/bench/change.ts
import * as flatbuffers2 from 'flatbuffers'

class Change {
  bb = null
  bb_pos = 0
  __init(i, bb) {
    this.bb_pos = i
    this.bb = bb
    return this
  }
  static getRootAsChange(bb, obj) {
    return (obj || new Change()).__init(bb.readInt32(bb.position()) + bb.position(), bb)
  }
  static getSizePrefixedRootAsChange(bb, obj) {
    bb.setPosition(bb.position() + flatbuffers2.SIZE_PREFIX_LENGTH)
    return (obj || new Change()).__init(bb.readInt32(bb.position()) + bb.position(), bb)
  }
  id(optionalEncoding) {
    const offset = this.bb.__offset(this.bb_pos, 4)
    return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null
  }
  x() {
    const offset = this.bb.__offset(this.bb_pos, 6)
    return offset ? this.bb.readFloat32(this.bb_pos + offset) : null
  }
  y() {
    const offset = this.bb.__offset(this.bb_pos, 8)
    return offset ? this.bb.readFloat32(this.bb_pos + offset) : null
  }
  rot() {
    const offset = this.bb.__offset(this.bb_pos, 10)
    return offset ? this.bb.readFloat32(this.bb_pos + offset) : null
  }
  vx() {
    const offset = this.bb.__offset(this.bb_pos, 12)
    return offset ? this.bb.readFloat32(this.bb_pos + offset) : null
  }
  vy() {
    const offset = this.bb.__offset(this.bb_pos, 14)
    return offset ? this.bb.readFloat32(this.bb_pos + offset) : null
  }
  health() {
    const offset = this.bb.__offset(this.bb_pos, 16)
    return offset ? this.bb.readUint16(this.bb_pos + offset) : null
  }
  mana() {
    const offset = this.bb.__offset(this.bb_pos, 18)
    return offset ? this.bb.readUint16(this.bb_pos + offset) : null
  }
  stance() {
    const offset = this.bb.__offset(this.bb_pos, 20)
    return offset ? this.bb.readUint8(this.bb_pos + offset) : null
  }
  static startChange(builder) {
    builder.startObject(9)
  }
  static addId(builder, idOffset) {
    builder.addFieldOffset(0, idOffset, 0)
  }
  static addX(builder, x) {
    builder.addFieldFloat32(1, x, null)
  }
  static addY(builder, y) {
    builder.addFieldFloat32(2, y, null)
  }
  static addRot(builder, rot) {
    builder.addFieldFloat32(3, rot, null)
  }
  static addVx(builder, vx) {
    builder.addFieldFloat32(4, vx, null)
  }
  static addVy(builder, vy) {
    builder.addFieldFloat32(5, vy, null)
  }
  static addHealth(builder, health) {
    builder.addFieldInt16(6, health, null)
  }
  static addMana(builder, mana) {
    builder.addFieldInt16(7, mana, null)
  }
  static addStance(builder, stance) {
    builder.addFieldInt8(8, stance, null)
  }
  static endChange(builder) {
    const offset = builder.endObject()
    return offset
  }
  static createChange(builder, idOffset, x, y, rot, vx, vy, health, mana, stance) {
    Change.startChange(builder)
    Change.addId(builder, idOffset)
    if (x !== null) Change.addX(builder, x)
    if (y !== null) Change.addY(builder, y)
    if (rot !== null) Change.addRot(builder, rot)
    if (vx !== null) Change.addVx(builder, vx)
    if (vy !== null) Change.addVy(builder, vy)
    if (health !== null) Change.addHealth(builder, health)
    if (mana !== null) Change.addMana(builder, mana)
    if (stance !== null) Change.addStance(builder, stance)
    return Change.endChange(builder)
  }
  unpack() {
    return new ChangeT(
      this.id(),
      this.x(),
      this.y(),
      this.rot(),
      this.vx(),
      this.vy(),
      this.health(),
      this.mana(),
      this.stance(),
    )
  }
  unpackTo(_o) {
    _o.id = this.id()
    _o.x = this.x()
    _o.y = this.y()
    _o.rot = this.rot()
    _o.vx = this.vx()
    _o.vy = this.vy()
    _o.health = this.health()
    _o.mana = this.mana()
    _o.stance = this.stance()
  }
}

class ChangeT {
  id
  x
  y
  rot
  vx
  vy
  health
  mana
  stance
  constructor(
    id = null,
    x = null,
    y = null,
    rot = null,
    vx = null,
    vy = null,
    health = null,
    mana = null,
    stance = null,
  ) {
    this.id = id
    this.x = x
    this.y = y
    this.rot = rot
    this.vx = vx
    this.vy = vy
    this.health = health
    this.mana = mana
    this.stance = stance
  }
  pack(builder) {
    const id = this.id !== null ? builder.createString(this.id) : 0
    return Change.createChange(
      builder,
      id,
      this.x,
      this.y,
      this.rot,
      this.vx,
      this.vy,
      this.health,
      this.mana,
      this.stance,
    )
  }
}
// flatbuffers/ts/bench/entity.ts
import * as flatbuffers3 from 'flatbuffers'

// flatbuffers/ts/bench/kind.ts
var Kind
;(Kind => {
  Kind[(Kind['player'] = 0)] = 'player'
  Kind[(Kind['monster'] = 1)] = 'monster'
  Kind[(Kind['npc'] = 2)] = 'npc'
})((Kind ||= {}))

// flatbuffers/ts/bench/entity.ts
class Entity {
  bb = null
  bb_pos = 0
  __init(i, bb) {
    this.bb_pos = i
    this.bb = bb
    return this
  }
  static getRootAsEntity(bb, obj) {
    return (obj || new Entity()).__init(bb.readInt32(bb.position()) + bb.position(), bb)
  }
  static getSizePrefixedRootAsEntity(bb, obj) {
    bb.setPosition(bb.position() + flatbuffers3.SIZE_PREFIX_LENGTH)
    return (obj || new Entity()).__init(bb.readInt32(bb.position()) + bb.position(), bb)
  }
  id(optionalEncoding) {
    const offset = this.bb.__offset(this.bb_pos, 4)
    return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null
  }
  name(optionalEncoding) {
    const offset = this.bb.__offset(this.bb_pos, 6)
    return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null
  }
  kind() {
    const offset = this.bb.__offset(this.bb_pos, 8)
    return offset ? this.bb.readUint8(this.bb_pos + offset) : 0 /* player */
  }
  x() {
    const offset = this.bb.__offset(this.bb_pos, 10)
    return offset ? this.bb.readFloat32(this.bb_pos + offset) : 0
  }
  y() {
    const offset = this.bb.__offset(this.bb_pos, 12)
    return offset ? this.bb.readFloat32(this.bb_pos + offset) : 0
  }
  rot() {
    const offset = this.bb.__offset(this.bb_pos, 14)
    return offset ? this.bb.readFloat32(this.bb_pos + offset) : 0
  }
  health() {
    const offset = this.bb.__offset(this.bb_pos, 16)
    return offset ? this.bb.readUint16(this.bb_pos + offset) : 0
  }
  maxHealth() {
    const offset = this.bb.__offset(this.bb_pos, 18)
    return offset ? this.bb.readUint16(this.bb_pos + offset) : 0
  }
  mana() {
    const offset = this.bb.__offset(this.bb_pos, 20)
    return offset ? this.bb.readUint16(this.bb_pos + offset) : 0
  }
  level() {
    const offset = this.bb.__offset(this.bb_pos, 22)
    return offset ? this.bb.readUint8(this.bb_pos + offset) : 0
  }
  alive() {
    const offset = this.bb.__offset(this.bb_pos, 24)
    return offset ? !!this.bb.readInt8(this.bb_pos + offset) : false
  }
  static startEntity(builder) {
    builder.startObject(11)
  }
  static addId(builder, idOffset) {
    builder.addFieldOffset(0, idOffset, 0)
  }
  static addName(builder, nameOffset) {
    builder.addFieldOffset(1, nameOffset, 0)
  }
  static addKind(builder, kind) {
    builder.addFieldInt8(2, kind, 0 /* player */)
  }
  static addX(builder, x) {
    builder.addFieldFloat32(3, x, 0)
  }
  static addY(builder, y) {
    builder.addFieldFloat32(4, y, 0)
  }
  static addRot(builder, rot) {
    builder.addFieldFloat32(5, rot, 0)
  }
  static addHealth(builder, health) {
    builder.addFieldInt16(6, health, 0)
  }
  static addMaxHealth(builder, maxHealth) {
    builder.addFieldInt16(7, maxHealth, 0)
  }
  static addMana(builder, mana) {
    builder.addFieldInt16(8, mana, 0)
  }
  static addLevel(builder, level) {
    builder.addFieldInt8(9, level, 0)
  }
  static addAlive(builder, alive) {
    builder.addFieldInt8(10, +alive, 0)
  }
  static endEntity(builder) {
    const offset = builder.endObject()
    return offset
  }
  static createEntity(builder, idOffset, nameOffset, kind, x, y, rot, health, maxHealth, mana, level, alive) {
    Entity.startEntity(builder)
    Entity.addId(builder, idOffset)
    Entity.addName(builder, nameOffset)
    Entity.addKind(builder, kind)
    Entity.addX(builder, x)
    Entity.addY(builder, y)
    Entity.addRot(builder, rot)
    Entity.addHealth(builder, health)
    Entity.addMaxHealth(builder, maxHealth)
    Entity.addMana(builder, mana)
    Entity.addLevel(builder, level)
    Entity.addAlive(builder, alive)
    return Entity.endEntity(builder)
  }
  unpack() {
    return new EntityT(
      this.id(),
      this.name(),
      this.kind(),
      this.x(),
      this.y(),
      this.rot(),
      this.health(),
      this.maxHealth(),
      this.mana(),
      this.level(),
      this.alive(),
    )
  }
  unpackTo(_o) {
    _o.id = this.id()
    _o.name = this.name()
    _o.kind = this.kind()
    _o.x = this.x()
    _o.y = this.y()
    _o.rot = this.rot()
    _o.health = this.health()
    _o.maxHealth = this.maxHealth()
    _o.mana = this.mana()
    _o.level = this.level()
    _o.alive = this.alive()
  }
}

class EntityT {
  id
  name
  kind
  x
  y
  rot
  health
  maxHealth
  mana
  level
  alive
  constructor(
    id = null,
    name = null,
    kind = 0 /* player */,
    x = 0,
    y = 0,
    rot = 0,
    health = 0,
    maxHealth = 0,
    mana = 0,
    level = 0,
    alive = false,
  ) {
    this.id = id
    this.name = name
    this.kind = kind
    this.x = x
    this.y = y
    this.rot = rot
    this.health = health
    this.maxHealth = maxHealth
    this.mana = mana
    this.level = level
    this.alive = alive
  }
  pack(builder) {
    const id = this.id !== null ? builder.createString(this.id) : 0
    const name = this.name !== null ? builder.createString(this.name) : 0
    return Entity.createEntity(
      builder,
      id,
      name,
      this.kind,
      this.x,
      this.y,
      this.rot,
      this.health,
      this.maxHealth,
      this.mana,
      this.level,
      this.alive,
    )
  }
}
// flatbuffers/ts/bench/input.ts
import * as flatbuffers4 from 'flatbuffers'
class Input {
  bb = null
  bb_pos = 0
  __init(i, bb) {
    this.bb_pos = i
    this.bb = bb
    return this
  }
  static getRootAsInput(bb, obj) {
    return (obj || new Input()).__init(bb.readInt32(bb.position()) + bb.position(), bb)
  }
  static getSizePrefixedRootAsInput(bb, obj) {
    bb.setPosition(bb.position() + flatbuffers4.SIZE_PREFIX_LENGTH)
    return (obj || new Input()).__init(bb.readInt32(bb.position()) + bb.position(), bb)
  }
  seq() {
    const offset = this.bb.__offset(this.bb_pos, 4)
    return offset ? this.bb.readUint32(this.bb_pos + offset) : 0
  }
  t() {
    const offset = this.bb.__offset(this.bb_pos, 6)
    return offset ? this.bb.readUint64(this.bb_pos + offset) : BigInt('0')
  }
  x() {
    const offset = this.bb.__offset(this.bb_pos, 8)
    return offset ? this.bb.readFloat32(this.bb_pos + offset) : 0
  }
  y() {
    const offset = this.bb.__offset(this.bb_pos, 10)
    return offset ? this.bb.readFloat32(this.bb_pos + offset) : 0
  }
  vx() {
    const offset = this.bb.__offset(this.bb_pos, 12)
    return offset ? this.bb.readFloat32(this.bb_pos + offset) : 0
  }
  vy() {
    const offset = this.bb.__offset(this.bb_pos, 14)
    return offset ? this.bb.readFloat32(this.bb_pos + offset) : 0
  }
  rot() {
    const offset = this.bb.__offset(this.bb_pos, 16)
    return offset ? this.bb.readFloat32(this.bb_pos + offset) : 0
  }
  zone(optionalEncoding) {
    const offset = this.bb.__offset(this.bb_pos, 18)
    return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null
  }
  actions(index, obj) {
    const offset = this.bb.__offset(this.bb_pos, 20)
    return offset
      ? (obj || new Action()).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos + offset) + index * 4), this.bb)
      : null
  }
  actionsLength() {
    const offset = this.bb.__offset(this.bb_pos, 20)
    return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0
  }
  static startInput(builder) {
    builder.startObject(9)
  }
  static addSeq(builder, seq) {
    builder.addFieldInt32(0, seq, 0)
  }
  static addT(builder, t) {
    builder.addFieldInt64(1, t, BigInt('0'))
  }
  static addX(builder, x) {
    builder.addFieldFloat32(2, x, 0)
  }
  static addY(builder, y) {
    builder.addFieldFloat32(3, y, 0)
  }
  static addVx(builder, vx) {
    builder.addFieldFloat32(4, vx, 0)
  }
  static addVy(builder, vy) {
    builder.addFieldFloat32(5, vy, 0)
  }
  static addRot(builder, rot) {
    builder.addFieldFloat32(6, rot, 0)
  }
  static addZone(builder, zoneOffset) {
    builder.addFieldOffset(7, zoneOffset, 0)
  }
  static addActions(builder, actionsOffset) {
    builder.addFieldOffset(8, actionsOffset, 0)
  }
  static createActionsVector(builder, data) {
    builder.startVector(4, data.length, 4)
    for (let i = data.length - 1; i >= 0; i--) {
      builder.addOffset(data[i])
    }
    return builder.endVector()
  }
  static startActionsVector(builder, numElems) {
    builder.startVector(4, numElems, 4)
  }
  static endInput(builder) {
    const offset = builder.endObject()
    return offset
  }
  static createInput(builder, seq, t, x, y, vx, vy, rot, zoneOffset, actionsOffset) {
    Input.startInput(builder)
    Input.addSeq(builder, seq)
    Input.addT(builder, t)
    Input.addX(builder, x)
    Input.addY(builder, y)
    Input.addVx(builder, vx)
    Input.addVy(builder, vy)
    Input.addRot(builder, rot)
    Input.addZone(builder, zoneOffset)
    Input.addActions(builder, actionsOffset)
    return Input.endInput(builder)
  }
  unpack() {
    return new InputT(
      this.seq(),
      this.t(),
      this.x(),
      this.y(),
      this.vx(),
      this.vy(),
      this.rot(),
      this.zone(),
      this.bb.createObjList(this.actions.bind(this), this.actionsLength()),
    )
  }
  unpackTo(_o) {
    _o.seq = this.seq()
    _o.t = this.t()
    _o.x = this.x()
    _o.y = this.y()
    _o.vx = this.vx()
    _o.vy = this.vy()
    _o.rot = this.rot()
    _o.zone = this.zone()
    _o.actions = this.bb.createObjList(this.actions.bind(this), this.actionsLength())
  }
}

class InputT {
  seq
  t
  x
  y
  vx
  vy
  rot
  zone
  actions
  constructor(seq = 0, t = BigInt('0'), x = 0, y = 0, vx = 0, vy = 0, rot = 0, zone = null, actions = []) {
    this.seq = seq
    this.t = t
    this.x = x
    this.y = y
    this.vx = vx
    this.vy = vy
    this.rot = rot
    this.zone = zone
    this.actions = actions
  }
  pack(builder) {
    const zone = this.zone !== null ? builder.createString(this.zone) : 0
    const actions = Input.createActionsVector(builder, builder.createObjectOffsetList(this.actions))
    return Input.createInput(builder, this.seq, this.t, this.x, this.y, this.vx, this.vy, this.rot, zone, actions)
  }
}
// flatbuffers/ts/bench/snapshot.ts
import * as flatbuffers5 from 'flatbuffers'
class Snapshot {
  bb = null
  bb_pos = 0
  __init(i, bb) {
    this.bb_pos = i
    this.bb = bb
    return this
  }
  static getRootAsSnapshot(bb, obj) {
    return (obj || new Snapshot()).__init(bb.readInt32(bb.position()) + bb.position(), bb)
  }
  static getSizePrefixedRootAsSnapshot(bb, obj) {
    bb.setPosition(bb.position() + flatbuffers5.SIZE_PREFIX_LENGTH)
    return (obj || new Snapshot()).__init(bb.readInt32(bb.position()) + bb.position(), bb)
  }
  t() {
    const offset = this.bb.__offset(this.bb_pos, 4)
    return offset ? this.bb.readUint64(this.bb_pos + offset) : BigInt('0')
  }
  entities(index, obj) {
    const offset = this.bb.__offset(this.bb_pos, 6)
    return offset
      ? (obj || new Entity()).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos + offset) + index * 4), this.bb)
      : null
  }
  entitiesLength() {
    const offset = this.bb.__offset(this.bb_pos, 6)
    return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0
  }
  static startSnapshot(builder) {
    builder.startObject(2)
  }
  static addT(builder, t) {
    builder.addFieldInt64(0, t, BigInt('0'))
  }
  static addEntities(builder, entitiesOffset) {
    builder.addFieldOffset(1, entitiesOffset, 0)
  }
  static createEntitiesVector(builder, data) {
    builder.startVector(4, data.length, 4)
    for (let i = data.length - 1; i >= 0; i--) {
      builder.addOffset(data[i])
    }
    return builder.endVector()
  }
  static startEntitiesVector(builder, numElems) {
    builder.startVector(4, numElems, 4)
  }
  static endSnapshot(builder) {
    const offset = builder.endObject()
    return offset
  }
  static createSnapshot(builder, t, entitiesOffset) {
    Snapshot.startSnapshot(builder)
    Snapshot.addT(builder, t)
    Snapshot.addEntities(builder, entitiesOffset)
    return Snapshot.endSnapshot(builder)
  }
  unpack() {
    return new SnapshotT(this.t(), this.bb.createObjList(this.entities.bind(this), this.entitiesLength()))
  }
  unpackTo(_o) {
    _o.t = this.t()
    _o.entities = this.bb.createObjList(this.entities.bind(this), this.entitiesLength())
  }
}

class SnapshotT {
  t
  entities
  constructor(t = BigInt('0'), entities = []) {
    this.t = t
    this.entities = entities
  }
  pack(builder) {
    const entities = Snapshot.createEntitiesVector(builder, builder.createObjectOffsetList(this.entities))
    return Snapshot.createSnapshot(builder, this.t, entities)
  }
}
// flatbuffers/ts/bench/stance.ts
var Stance
;(Stance => {
  Stance[(Stance['idle'] = 0)] = 'idle'
  Stance[(Stance['run'] = 1)] = 'run'
  Stance[(Stance['cast'] = 2)] = 'cast'
  Stance[(Stance['stun'] = 3)] = 'stun'
})((Stance ||= {}))
// flatbuffers/ts/bench/update.ts
import * as flatbuffers6 from 'flatbuffers'
class Update {
  bb = null
  bb_pos = 0
  __init(i, bb) {
    this.bb_pos = i
    this.bb = bb
    return this
  }
  static getRootAsUpdate(bb, obj) {
    return (obj || new Update()).__init(bb.readInt32(bb.position()) + bb.position(), bb)
  }
  static getSizePrefixedRootAsUpdate(bb, obj) {
    bb.setPosition(bb.position() + flatbuffers6.SIZE_PREFIX_LENGTH)
    return (obj || new Update()).__init(bb.readInt32(bb.position()) + bb.position(), bb)
  }
  t() {
    const offset = this.bb.__offset(this.bb_pos, 4)
    return offset ? this.bb.readUint64(this.bb_pos + offset) : BigInt('0')
  }
  ack() {
    const offset = this.bb.__offset(this.bb_pos, 6)
    return offset ? this.bb.readUint32(this.bb_pos + offset) : 0
  }
  updates(index, obj) {
    const offset = this.bb.__offset(this.bb_pos, 8)
    return offset
      ? (obj || new Change()).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos + offset) + index * 4), this.bb)
      : null
  }
  updatesLength() {
    const offset = this.bb.__offset(this.bb_pos, 8)
    return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0
  }
  static startUpdate(builder) {
    builder.startObject(3)
  }
  static addT(builder, t) {
    builder.addFieldInt64(0, t, BigInt('0'))
  }
  static addAck(builder, ack) {
    builder.addFieldInt32(1, ack, 0)
  }
  static addUpdates(builder, updatesOffset) {
    builder.addFieldOffset(2, updatesOffset, 0)
  }
  static createUpdatesVector(builder, data) {
    builder.startVector(4, data.length, 4)
    for (let i = data.length - 1; i >= 0; i--) {
      builder.addOffset(data[i])
    }
    return builder.endVector()
  }
  static startUpdatesVector(builder, numElems) {
    builder.startVector(4, numElems, 4)
  }
  static endUpdate(builder) {
    const offset = builder.endObject()
    return offset
  }
  static createUpdate(builder, t, ack, updatesOffset) {
    Update.startUpdate(builder)
    Update.addT(builder, t)
    Update.addAck(builder, ack)
    Update.addUpdates(builder, updatesOffset)
    return Update.endUpdate(builder)
  }
  unpack() {
    return new UpdateT(this.t(), this.ack(), this.bb.createObjList(this.updates.bind(this), this.updatesLength()))
  }
  unpackTo(_o) {
    _o.t = this.t()
    _o.ack = this.ack()
    _o.updates = this.bb.createObjList(this.updates.bind(this), this.updatesLength())
  }
}

class UpdateT {
  t
  ack
  updates
  constructor(t = BigInt('0'), ack = 0, updates = []) {
    this.t = t
    this.ack = ack
    this.updates = updates
  }
  pack(builder) {
    const updates = Update.createUpdatesVector(builder, builder.createObjectOffsetList(this.updates))
    return Update.createUpdate(builder, this.t, this.ack, updates)
  }
}
export {
  Action,
  ActionT,
  Change,
  ChangeT,
  Entity,
  EntityT,
  Input,
  InputT,
  Kind,
  Snapshot,
  SnapshotT,
  Stance,
  Update,
  UpdateT,
}
