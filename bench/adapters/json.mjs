export const name = 'JSON'
export const kind = 'schemaless'
export const version = 'built in'
export const notes = 'JSON.stringify and TextEncoder'

const encoder = new TextEncoder()
const decoder = new TextDecoder()
const session = () => ({
  encode: message => encoder.encode(JSON.stringify(message)),
  decode: data => JSON.parse(decoder.decode(data)),
})

export const workloads = { snapshot: session, update: session, input: session }
