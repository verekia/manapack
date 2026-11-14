import { FLOAT32_OPTIONS, Packr, Unpackr } from 'msgpackr'

export const name = 'msgpackr (records, float32)'
export const pkg = 'msgpackr'
export const kind = 'schemaless'
export const stateful = true
export const notes = 'sequential record structures per socket, read in order; useFloat32: ALWAYS'

const session = () => {
  const packr = new Packr({ sequential: true, useFloat32: FLOAT32_OPTIONS.ALWAYS })
  const unpackr = new Unpackr({ sequential: true })
  return { encode: message => packr.pack(message), decode: data => unpackr.unpack(data) }
}

export const workloads = { snapshot: session, update: session, input: session }
