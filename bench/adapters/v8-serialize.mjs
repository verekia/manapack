import { deserialize, serialize } from 'node:v8'

export const name = 'node:v8 serialize'
export const kind = 'schemaless'
export const version = 'built in'
export const notes = 'structured clone format of the runtime: V8 in Node, JavaScriptCore in Bun'

const session = () => ({ encode: message => serialize(message), decode: data => deserialize(data) })

export const workloads = { snapshot: session, update: session, input: session }
