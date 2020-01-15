crypto = require('crypto')
fs = require('fs')

bitdb = require('./bitdb.js')
Queue = require('./queue.js')

async function bdownload(txid, fn = undefined)
{
	let b = await bitdb.bitdb(bitdb.b(txid))
	if (fn === undefined) {
		fn = b.filename
	}
	fs.writeFileSync(fn, Buffer.from(b.data, 'base64'))
}

async function bcatdownload(txid, fn = undefined)
{
	if (fn === undefined) {
		let bcat = await bitdb.bitdb(bitdb.bcat(txid))
		fn = bcat.filename
	}
	let fd = fs.openSync(fn, 'w')
	let total = 0
	await bcatstream(txid, {write: data => {
		fs.writeSync(fd, data)
		total += data.length
		process.stdout.write(`${total} ...\r`)
	}})
	process.stdout.write('                       \r')
	fs.closeSync(fd)
}

async function dstatus(addr, key)
{
	let more = true
	let limit = 100
	let skip = 0
	while (more) {
		let res = await bitdb.bitdb(bitdb.d(addr, limit, skip))
		for (let r of res) {
			if (r.alias != key) { continue }
			let time = (new Date(r.block.t*1000)).toISOString()
			let app = bitdb.parseapp(await bitdb.bitdb(bitdb.app(r.pointer)))
			console.log(`${time} ${r.transaction} ${r.type} ${app}://${r.pointer}`)
			if (app === 'BCAT') {
				await bcatstatus(r.pointer)
			} else if (app === 'B') {
				await txstatus(r.pointer)
			} else {
				console.log('Unknown protocol ' + app)
			}
		}
		if (res.length < limit) break
		skip += res.length
	}
	console.log('Not found')
}

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
			keys[r.alias] = true
			console.log(r.alias)
			let app = bitdb.parseapp(await bitdb.bitdb(bitdb.app(r.pointer)))
			if (app === 'BCAT') {
				await bcatdownload(r.pointer, r.alias)
			} else if (app === 'B') {
				await bdownload(r.pointer, r.alias)
			} else {
				console.log('Unknown protocol ' + app)
			}
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

async function txstatus(txid)
{
	let tx = await bitdb.bitdb(bitdb.tx(txid))
	console.log(JSON.stringify(tx))
}

async function bcatstream(txid, stream)
{
	let bcat = await bitdb.bitdb(bitdb.bcat(txid))
	bcat = bitdb.parsebcat(bcat)
	let queue = new Queue(10);
	for (let chunk of bcat.data) {
		queue.add(async (chunk) => {
			let res = await bitdb.bitdb(bitdb.bcatpart(chunk))
			try {
				return Buffer.from(res, 'base64')
			} catch(e) {
				console.log('THROWING')
				throw res;
			}
		}, chunk)
	}
	queue.on('reject', e => {
		process.stderr.write('DATA MISSING\n')
		queue.stop('reject', e)
	})
	queue.on('resolve', x => stream.write(x))
	await queue.wait()
}

async function cstatus(sha256)
{
	let c = await bitdb.bitdb(bitdb.c(sha256))
	let app = await bitdb.bitdb(bitdb.app(c))
	app = bitdb.parseapp(app)
	console.log(`${app}://${c}`)
}

async function bcatstatus(txid)
{
	let bcat = bitdb.parsebcat(await bitdb.bitdb(bitdb.bcat(txid)))
	console.log('Filename: ' + bcat.filename)
	console.log('ID: bcat://' + txid)
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
	txstatus: txstatus,
	bcatstatus: bcatstatus,
	bcatstream: bcatstream,
	dlog: dlog,
	dstatus: dstatus,
	ddownload: ddownload,
	bcatdownload: bcatdownload,
	cstatus: cstatus
}
