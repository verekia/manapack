import { Packr, Unpackr } from 'msgpackr'

export const name = 'msgpackr'
export const pkg = 'msgpackr'
export const kind = 'schemaless'
export const notes = 'plain MessagePack maps (useRecords: false)'

const packr = new Packr({ useRecords: false })
const unpackr = new Unpackr({ useRecords: false })
const session = () => ({ encode: message => packr.pack(message), decode: data => unpackr.unpack(data) })

export const workloads = { snapshot: session, update: session, input: session }
