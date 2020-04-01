const stream = require('stream')

const EMPTY_STREAM = {}

async function isObjectMode(stream)
{
  if (stream.readableObjectMode !== undefined) return stream.read
  const chunk = await pop(stream)
  stream.unshift(chunk)
  if (chunk === null) { throw EMPTY_STREAM }
  return chunk.constructor !== Uint8Array && !Buffer.isBuffer(chunk)
}

// concatenates readable streams
async function concat(...streams)
{
  let objectMode = EMPTY_STREAM
  for (let stream of streams) {
    try {
      objectMode = await isObjectMode(stream)
    } catch(e) {
      if (e === EMPTY_STREAM) {
        continue
      }
      throw e
    }
  }
  if (objectMode === EMPTY_STREAM) {
    console.log('::: ERROR EMPTY STREAMS CONCATENATED')
    throw EMPTY_STREAM
  }
  const pass = new stream.PassThrough({
    writableObjectMode: objectMode,
    readableObjectMode: objectMode
  })
  for (let s of streams) {
    s.pipe(pass, {end: false})
  }
  streams[streams.length-1].once('end', () => pass.destroy())
  pass.once('end', () => { for (let s of streams) { s.destroy() } })
  return pass
}

// pops an item off a stream, null when done, throws on error
async function pop(stream)
{
	return new Promise((resolve, reject) => {
		if (stream.destroyed) {
			stream.once('error', reject)
			return
		}
		let result = stream.read()
		if (result) {
			resolve(result)
			return
		}
		stream.once('readable', () => {
			if (stream.destroyed) {
				stream.once('error', reject)
				return
			}
			result = stream.read()
			console.log('result2! ' + result)
			resolve(result)
		})
	})
}

// resolves when stream has ended
async function wait(stream)
{
  await new Promise((resolve, reject) => {
    stream.once('end', resolve)
    stream.once('error', reject)
  })
}

const END = {}

// simplification of transforming a stream
async function transform(s, map)
{
  console.log('transform-outer')
  s = await s
  let objectMode
  try {
    objectMode = await isObjectMode(s)
  } catch (e) {
    console.log(':::: ERROR EMPTY STREAM TRANSFORMED')
    throw e
  }
  const transform = s.pipe(new stream.Transform({
    writableObjectMode: objectMode,
    readableObjectMode: objectMode,
    allowHalfOpen: false,
    destroy: (err, callback) => {
      s.once('error', callback)
      s.destroy(err)
    },
    transform: async (chunk, encoding, callback) => {
      try {
        console.log('transform-pre')
        let vals = await map(chunk)
        console.log('transform-post')
        if (!Array.isArray(vals)) {
          vals = [vals]
        }
        for (let val of vals) {
          if (val === END) {
            transform.end()
            s.destroy()
            break
          } else {
            transform.push(val)
          }
        }
      } catch(e) {
        callback(e)
      }
    }
  }))
  s.on('end', () => { console.log('end-event on s'); transform.destroy() })
  s.on('error', error => { console.log('error-event on s'); transform.destroy(error) })
  return transform
}

module.exports = {
  concat: concat,
  pop: pop,
  wait: wait,
  transform: transform,
  END: END
}
