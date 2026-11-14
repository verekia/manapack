import { MsgPackDecoderFast } from '@jsonjoy.com/json-pack/lib/msgpack/MsgPackDecoderFast.js'
import { MsgPackEncoderFast } from '@jsonjoy.com/json-pack/lib/msgpack/MsgPackEncoderFast.js'

export const name = '@jsonjoy.com/json-pack (MessagePack)'
export const pkg = '@jsonjoy.com/json-pack'
export const kind = 'schemaless'
export const notes = 'reused MsgPackEncoderFast and MsgPackDecoderFast; floats are always float64'

const encoder = new MsgPackEncoderFast()
const decoder = new MsgPackDecoderFast()
const session = () => ({ encode: message => encoder.encode(message), decode: data => decoder.read(data) })

export const workloads = { snapshot: session, update: session, input: session }
