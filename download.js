crypto = require('crypto')
fs = require('fs')

bitdb = require('./bitdb.js')
Queue = require('./queue.js')

async function ddownload(addr, keypfx)
{
	let keys = {}
	let more = true
	let limit = 100
	let skip = 0
	while (more) {
		let res = await bitdb.bitdb(bitdb.d(addr, limit, skip))
		for (let r of res) {
			if (r.alias.length < keypfx || r.alias.slice(0,keypfx.length) !== keypfx) { continue }
			if (r.alias in keys) { continue }
			keys[r.alias] = res
			console.log(r.alias)
		}
		if (res.length < limit) break
		skip += res.length
	}

}

async function dlog(addr)
{
	let more = true
	let limit = 100
	let skip = 0
	while (more) {
		let res = await bitdb.bitdb(bitdb.d(addr, limit, skip))
		for (let r of res) {
			let time = (new Date(r.block.t*1000)).toISOString()
			console.log(`${time} ${r.transaction} ${r.alias} ${r.type} ${r.pointer}`)
		}
		if (res.length < limit) break
		skip += res.length
	}
}

async function bcatstream(txid, stream)
{
	let bcat = bitdb.parsebcat(await bitdb.bitdb(bitdb.bcat(txid)))
	let queue = new Queue(10);
	for (let chunk of bcat.data) {
		queue.add(async (chunk) => {
			let res = await bitdb.bitdb(bitdb.bcatpart(chunk))
			return Buffer.from(res, 'base64')
		}, chunk)
	}
	queue.on('reject', e => {
		process.stderr.write('DATA MISSING')
	})
	queue.on('resolve', x => stream.write(x))
	await queue.wait()
}

async function bcatstatus(txid)
{
	let bcat = bitdb.parsebcat(await bitdb.bitdb(bitdb.bcat(txid)))
	console.log('Filename: ' + bcat.filename)
	console.log('ID: bcat://' + bcat.transaction)
	console.log('Author: ' + bcat.sender)
	console.log('Info: ' + bcat.info)
	console.log('Content-Type: ' + bcat.mime)
	console.log('Encoding: ' + bcat.encoding)
	console.log('Flag: ' + bcat.flag)
	let totchunks = bcat.data.length
	console.log(`Chunks: ${totchunks}`)
	let badchunks = 0
	let goodchunks = 0
	let len = 0
	let chunkindex = {}
	let maxsize = 0
	for (let i = 0; i < totchunks; ++ i) {
		chunkindex[bcat.data[i]] = i
	}
	let hash = crypto.createHash('sha256')
	let queue = new Queue(10);
	for (let chunk of bcat.data) {
		queue.add(async (chunk) => {
			let res = await bitdb.bitdb(bitdb.bcatpart(chunk))
			res = Buffer.from(res, 'base64')
			if (!res.length) throw res;
			if (res.length > maxsize) { maxsize = res.length }
			len += res.length
			++ goodchunks
			process.stdout.write(`(good:${goodchunks} bad:${badchunks} size:${len})\r`)
			return res
		}, chunk)
	}
	queue.on('reject', e => {
		console.log(`Bad Chunk?: #${chunkindex[chunk]} ${chunk} ${e.toString()}`)
		++ badchunks
	})
	queue.on('resolve', e => {
		hash.update(e)
	})
	await queue.wait()
	console.log('ID: C://' + hash.digest('hex'))
	console.log('Max Chunk Size: ' + maxsize)
	console.log('Size: ' + len)
}

module.exports = {
	dlog: dlog,
	bcatstatus: bcatstatus,
	bcatstream: bcatstream
}
