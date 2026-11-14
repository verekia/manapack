import { BSON } from 'bson'

export const name = 'bson'
export const pkg = 'bson'
export const kind = 'schemaless'
export const notes = 'BSON.serialize and BSON.deserialize with default options; floats are float64'

const session = () => ({ encode: message => BSON.serialize(message), decode: data => BSON.deserialize(data) })

export const workloads = { snapshot: session, update: session, input: session }
