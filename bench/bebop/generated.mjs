import { BebopView } from 'bebop'
export const BEBOP_SCHEMA = new Uint8Array([
  3, 8, 0, 0, 0, 75, 105, 110, 100, 0, 4, 0, 254, 255, 255, 255, 0, 1, 0, 0, 0, 4, 85, 110, 107, 110, 111, 119, 110, 0,
  0, 0, 80, 108, 97, 121, 101, 114, 0, 0, 1, 77, 111, 110, 115, 116, 101, 114, 0, 0, 2, 78, 112, 99, 0, 0, 3, 83, 116,
  97, 110, 99, 101, 0, 4, 0, 254, 255, 255, 255, 0, 1, 0, 0, 0, 5, 85, 110, 107, 110, 111, 119, 110, 0, 0, 0, 73, 100,
  108, 101, 0, 0, 1, 82, 117, 110, 0, 0, 2, 67, 97, 115, 116, 0, 0, 3, 83, 116, 117, 110, 0, 0, 4, 69, 110, 116, 105,
  116, 121, 0, 1, 0, 0, 29, 0, 0, 0, 0, 11, 105, 100, 0, 245, 255, 255, 255, 0, 110, 97, 109, 101, 0, 245, 255, 255,
  255, 0, 107, 105, 110, 100, 0, 0, 0, 0, 0, 0, 120, 0, 247, 255, 255, 255, 0, 121, 0, 247, 255, 255, 255, 0, 114, 111,
  116, 0, 247, 255, 255, 255, 0, 104, 101, 97, 108, 116, 104, 0, 253, 255, 255, 255, 0, 109, 97, 120, 72, 101, 97, 108,
  116, 104, 0, 253, 255, 255, 255, 0, 109, 97, 110, 97, 0, 253, 255, 255, 255, 0, 108, 101, 118, 101, 108, 0, 254, 255,
  255, 255, 0, 97, 108, 105, 118, 101, 0, 255, 255, 255, 255, 0, 83, 110, 97, 112, 115, 104, 111, 116, 0, 1, 0, 0, 12,
  0, 0, 0, 0, 2, 116, 0, 249, 255, 255, 255, 0, 101, 110, 116, 105, 116, 105, 101, 115, 0, 242, 255, 255, 255, 0, 2, 0,
  0, 0, 0, 67, 104, 97, 110, 103, 101, 0, 2, 0, 5, 0, 0, 0, 9, 105, 100, 0, 245, 255, 255, 255, 0, 1, 120, 0, 247, 255,
  255, 255, 0, 2, 121, 0, 247, 255, 255, 255, 0, 3, 114, 111, 116, 0, 247, 255, 255, 255, 0, 4, 118, 120, 0, 247, 255,
  255, 255, 0, 5, 118, 121, 0, 247, 255, 255, 255, 0, 6, 104, 101, 97, 108, 116, 104, 0, 253, 255, 255, 255, 0, 7, 109,
  97, 110, 97, 0, 253, 255, 255, 255, 0, 8, 115, 116, 97, 110, 99, 101, 0, 1, 0, 0, 0, 0, 9, 85, 112, 100, 97, 116, 101,
  0, 1, 0, 0, 16, 0, 0, 0, 0, 3, 116, 0, 249, 255, 255, 255, 0, 97, 99, 107, 0, 251, 255, 255, 255, 0, 117, 112, 100,
  97, 116, 101, 115, 0, 242, 255, 255, 255, 0, 4, 0, 0, 0, 0, 65, 99, 116, 105, 111, 110, 0, 2, 0, 5, 0, 0, 0, 2, 97,
  98, 105, 108, 105, 116, 121, 0, 245, 255, 255, 255, 0, 1, 116, 97, 114, 103, 101, 116, 0, 245, 255, 255, 255, 0, 2,
  73, 110, 112, 117, 116, 0, 1, 0, 0, 40, 0, 0, 0, 0, 9, 115, 101, 113, 0, 251, 255, 255, 255, 0, 116, 0, 249, 255, 255,
  255, 0, 120, 0, 247, 255, 255, 255, 0, 121, 0, 247, 255, 255, 255, 0, 118, 120, 0, 247, 255, 255, 255, 0, 118, 121, 0,
  247, 255, 255, 255, 0, 114, 111, 116, 0, 247, 255, 255, 255, 0, 122, 111, 110, 101, 0, 245, 255, 255, 255, 0, 97, 99,
  116, 105, 111, 110, 115, 0, 242, 255, 255, 255, 0, 6, 0, 0, 0, 0, 0, 0, 0, 0,
])
export var Kind
;(Kind => {
  Kind[(Kind['Unknown'] = 0)] = 'Unknown'
  Kind[(Kind['Player'] = 1)] = 'Player'
  Kind[(Kind['Monster'] = 2)] = 'Monster'
  Kind[(Kind['Npc'] = 3)] = 'Npc'
})((Kind ||= {}))
export var Stance
;(Stance => {
  Stance[(Stance['Unknown'] = 0)] = 'Unknown'
  Stance[(Stance['Idle'] = 1)] = 'Idle'
  Stance[(Stance['Run'] = 2)] = 'Run'
  Stance[(Stance['Cast'] = 3)] = 'Cast'
  Stance[(Stance['Stun'] = 4)] = 'Stun'
})((Stance ||= {}))
export const Entity = /* @__PURE__ */ Object.freeze(
  /* @__PURE__ */ Object.assign(
    data => {
      return Object.freeze({
        ...data,
        encode() {
          return Entity.encode(this)
        },
      })
    },
    {
      encode(record) {
        const view = BebopView.getInstance()
        view.startWriting()
        Entity.encodeInto(record, view)
        return view.toArray()
      },
      encodeInto(record, view) {
        view.writeString(record.id)
        view.writeString(record.name)
        view.writeByte(record.kind)
        view.writeFloat32(record.x)
        view.writeFloat32(record.y)
        view.writeFloat32(record.rot)
        view.writeUint16(record.health)
        view.writeUint16(record.maxHealth)
        view.writeUint16(record.mana)
        view.writeByte(record.level)
        view.writeByte(Number(record.alive))
      },
      decode(buffer) {
        const view = BebopView.getInstance()
        view.startReading(buffer)
        const decoded = Entity.readFrom(view)
        return Entity(decoded)
      },
      readFrom(view) {
        let field0
        field0 = view.readString()
        let field1
        field1 = view.readString()
        let field2
        field2 = view.readByte()
        let field3
        field3 = view.readFloat32()
        let field4
        field4 = view.readFloat32()
        let field5
        field5 = view.readFloat32()
        let field6
        field6 = view.readUint16()
        let field7
        field7 = view.readUint16()
        let field8
        field8 = view.readUint16()
        let field9
        field9 = view.readByte()
        let field10
        field10 = !!view.readByte()
        return {
          id: field0,
          name: field1,
          kind: field2,
          x: field3,
          y: field4,
          rot: field5,
          health: field6,
          maxHealth: field7,
          mana: field8,
          level: field9,
          alive: field10,
        }
      },
    },
  ),
)
export const Snapshot = /* @__PURE__ */ Object.freeze(
  /* @__PURE__ */ Object.assign(
    data => {
      return Object.freeze({
        ...data,
        encode() {
          return Snapshot.encode(this)
        },
      })
    },
    {
      encode(record) {
        const view = BebopView.getInstance()
        view.startWriting()
        Snapshot.encodeInto(record, view)
        return view.toArray()
      },
      encodeInto(record, view) {
        view.writeUint64(record.t)
        {
          const length0 = record.entities.length
          view.writeUint32(length0)
          for (let i0 = 0; i0 < length0; i0++) {
            Entity.encodeInto(record.entities[i0], view)
          }
        }
      },
      decode(buffer) {
        const view = BebopView.getInstance()
        view.startReading(buffer)
        const decoded = Snapshot.readFrom(view)
        return Snapshot(decoded)
      },
      readFrom(view) {
        let field0
        field0 = view.readUint64()
        let field1
        {
          const length0 = view.readUint32()
          field1 = []
          for (let i0 = 0; i0 < length0; i0++) {
            let x0
            x0 = Entity.readFrom(view)
            field1[i0] = x0
          }
        }
        return {
          t: field0,
          entities: field1,
        }
      },
    },
  ),
)
export const Change = /* @__PURE__ */ Object.freeze(
  /* @__PURE__ */ Object.assign(
    data => {
      return {
        ...data,
        encode() {
          return Change.encode(this)
        },
      }
    },
    {
      encode(record) {
        const view = BebopView.getInstance()
        view.startWriting()
        Change.encodeInto(record, view)
        return view.toArray()
      },
      encodeInto(record, view) {
        const pos = view.reserveMessageLength()
        const start = view.length
        if (record.id !== undefined) {
          view.writeByte(1)
          view.writeString(record.id)
        }
        if (record.x !== undefined) {
          view.writeByte(2)
          view.writeFloat32(record.x)
        }
        if (record.y !== undefined) {
          view.writeByte(3)
          view.writeFloat32(record.y)
        }
        if (record.rot !== undefined) {
          view.writeByte(4)
          view.writeFloat32(record.rot)
        }
        if (record.vx !== undefined) {
          view.writeByte(5)
          view.writeFloat32(record.vx)
        }
        if (record.vy !== undefined) {
          view.writeByte(6)
          view.writeFloat32(record.vy)
        }
        if (record.health !== undefined) {
          view.writeByte(7)
          view.writeUint16(record.health)
        }
        if (record.mana !== undefined) {
          view.writeByte(8)
          view.writeUint16(record.mana)
        }
        if (record.stance !== undefined) {
          view.writeByte(9)
          view.writeByte(record.stance)
        }
        view.writeByte(0)
        const end = view.length
        view.fillMessageLength(pos, end - start)
      },
      decode(buffer) {
        const view = BebopView.getInstance()
        view.startReading(buffer)
        const decoded = Change.readFrom(view)
        return Change(decoded)
      },
      readFrom(view) {
        const message = {}
        const length = view.readMessageLength()
        const end = view.index + length
        while (true) {
          switch (view.readByte()) {
            case 0:
              return message
            case 1:
              message.id = view.readString()
              break
            case 2:
              message.x = view.readFloat32()
              break
            case 3:
              message.y = view.readFloat32()
              break
            case 4:
              message.rot = view.readFloat32()
              break
            case 5:
              message.vx = view.readFloat32()
              break
            case 6:
              message.vy = view.readFloat32()
              break
            case 7:
              message.health = view.readUint16()
              break
            case 8:
              message.mana = view.readUint16()
              break
            case 9:
              message.stance = view.readByte()
              break
            default:
              view.index = end
              return message
          }
        }
      },
    },
  ),
)
export const Update = /* @__PURE__ */ Object.freeze(
  /* @__PURE__ */ Object.assign(
    data => {
      return Object.freeze({
        ...data,
        encode() {
          return Update.encode(this)
        },
      })
    },
    {
      encode(record) {
        const view = BebopView.getInstance()
        view.startWriting()
        Update.encodeInto(record, view)
        return view.toArray()
      },
      encodeInto(record, view) {
        view.writeUint64(record.t)
        view.writeUint32(record.ack)
        {
          const length0 = record.updates.length
          view.writeUint32(length0)
          for (let i0 = 0; i0 < length0; i0++) {
            Change.encodeInto(record.updates[i0], view)
          }
        }
      },
      decode(buffer) {
        const view = BebopView.getInstance()
        view.startReading(buffer)
        const decoded = Update.readFrom(view)
        return Update(decoded)
      },
      readFrom(view) {
        let field0
        field0 = view.readUint64()
        let field1
        field1 = view.readUint32()
        let field2
        {
          const length0 = view.readUint32()
          field2 = []
          for (let i0 = 0; i0 < length0; i0++) {
            let x0
            x0 = Change.readFrom(view)
            field2[i0] = x0
          }
        }
        return {
          t: field0,
          ack: field1,
          updates: field2,
        }
      },
    },
  ),
)
export const Action = /* @__PURE__ */ Object.freeze(
  /* @__PURE__ */ Object.assign(
    data => {
      return {
        ...data,
        encode() {
          return Action.encode(this)
        },
      }
    },
    {
      encode(record) {
        const view = BebopView.getInstance()
        view.startWriting()
        Action.encodeInto(record, view)
        return view.toArray()
      },
      encodeInto(record, view) {
        const pos = view.reserveMessageLength()
        const start = view.length
        if (record.ability !== undefined) {
          view.writeByte(1)
          view.writeString(record.ability)
        }
        if (record.target !== undefined) {
          view.writeByte(2)
          view.writeString(record.target)
        }
        view.writeByte(0)
        const end = view.length
        view.fillMessageLength(pos, end - start)
      },
      decode(buffer) {
        const view = BebopView.getInstance()
        view.startReading(buffer)
        const decoded = Action.readFrom(view)
        return Action(decoded)
      },
      readFrom(view) {
        const message = {}
        const length = view.readMessageLength()
        const end = view.index + length
        while (true) {
          switch (view.readByte()) {
            case 0:
              return message
            case 1:
              message.ability = view.readString()
              break
            case 2:
              message.target = view.readString()
              break
            default:
              view.index = end
              return message
          }
        }
      },
    },
  ),
)
export const Input = /* @__PURE__ */ Object.freeze(
  /* @__PURE__ */ Object.assign(
    data => {
      return Object.freeze({
        ...data,
        encode() {
          return Input.encode(this)
        },
      })
    },
    {
      encode(record) {
        const view = BebopView.getInstance()
        view.startWriting()
        Input.encodeInto(record, view)
        return view.toArray()
      },
      encodeInto(record, view) {
        view.writeUint32(record.seq)
        view.writeUint64(record.t)
        view.writeFloat32(record.x)
        view.writeFloat32(record.y)
        view.writeFloat32(record.vx)
        view.writeFloat32(record.vy)
        view.writeFloat32(record.rot)
        view.writeString(record.zone)
        {
          const length0 = record.actions.length
          view.writeUint32(length0)
          for (let i0 = 0; i0 < length0; i0++) {
            Action.encodeInto(record.actions[i0], view)
          }
        }
      },
      decode(buffer) {
        const view = BebopView.getInstance()
        view.startReading(buffer)
        const decoded = Input.readFrom(view)
        return Input(decoded)
      },
      readFrom(view) {
        let field0
        field0 = view.readUint32()
        let field1
        field1 = view.readUint64()
        let field2
        field2 = view.readFloat32()
        let field3
        field3 = view.readFloat32()
        let field4
        field4 = view.readFloat32()
        let field5
        field5 = view.readFloat32()
        let field6
        field6 = view.readFloat32()
        let field7
        field7 = view.readString()
        let field8
        {
          const length0 = view.readUint32()
          field8 = []
          for (let i0 = 0; i0 < length0; i0++) {
            let x0
            x0 = Action.readFrom(view)
            field8[i0] = x0
          }
        }
        return {
          seq: field0,
          t: field1,
          x: field2,
          y: field3,
          vx: field4,
          vy: field5,
          rot: field6,
          zone: field7,
          actions: field8,
        }
      },
    },
  ),
)
