crypto = require('crypto')
fs = require('fs')

bitdb = require('./bitdb.js')
Queue = require('./queue.js')

async function bdownload(txid, fn = undefined)
{
	let b = await bitdb.autobitdb(bitdb.b(txid))
	if (fn === undefined) {
		fn = b.filename
	}
	process.stdout.write(`Downloading ${fn} ...\n`)
	let buf = Buffer.from(b.data, 'base64')
	fs.writeFileSync(fn, buf)
	process.stdout.write(`Wrote ${buf.length} bytes...\n`)
	process.stdout.write('Done.\n')
}

async function bcatdownload(txid, fn = undefined)
{
	if (fn === undefined) {
		let bcat = await bitdb.autobitdb(bitdb.bcat(txid))
		fn = bcat.filename
	}
	process.stdout.write(`Downloading ${fn} ...\n`)
	let fd = fs.openSync(fn, 'w')
	let total = 0
	await bcatstream(txid, {write: data => {
		fs.writeSync(fd, data)
		total += data.length
		process.stdout.write(`Wrote ${total} bytes...\r`)
	}})
	process.stdout.write('\nDone.\n')
	fs.closeSync(fd)
}

async function dstatus(addr, key, mode = null)
{
	let limit = 100
	let skip = 0
	let offset = 1
	let found = false
	while (offset >= 0) {
		let res = await bitdb.offsetbitdb(bitdb.d(addr, limit, skip, key), offset, true)
		for (let r of res) {
			//if (r.alias != key) { continue }
			let time = r.block ? (new Date(r.block.t*1000)).toISOString() : 'unconfirmed'
			let app = (mode == 'list') ? 'tx' : bitdb.parseapp(await bitdb.autobitdb(bitdb.app(r.pointer)))
			console.log(`${time} ${r.transaction} ${r.type} ${app||'tx'}://${r.pointer}`)

			if (mode == 'list') {
				found = true
			} else {
				if (app === 'BCAT') {
					await bcatstatus(r.pointer)
					found = true
				} else if (app === 'B') {
					await bstatus(r.pointer)
					found = true
				} else {
					console.log(`${r.pointer}: Unknown protocol "${app}"`)
				}
			}
			if (mode == 'quick') { offset = -1; break }
		}
		if (res.length < limit) { -- offset; skip = 0 }
		else { skip += res.length }
	}
	if (!found) {
		let e = new Error('Not found')
		e.code = 'NoResults'
		throw e
	}
}

async function dstream(addr, stream, key)
{
	let limit = 100
	let skip = 0
	let offset = 1
	while (offset >= 0) {
		let res = await bitdb.offsetbitdb(bitdb.d(addr, limit, skip, key), offset, true)
		for (let r of res) {
			let app = bitdb.parseapp(await bitdb.autobitdb(bitdb.app(r.pointer)))
			if (app === 'BCAT') {
				await bcatstream(r.pointer, stream)
				return
			} else if (app === 'B') {
				await bstream(r.pointer, stream)
				return
			} else {
				process.stderr.write(`${r.pointer}: Unknown protocol "${app}"\n`)
			}
		}
		if (res.length < limit) { -- offset; skip = 0 }
		else { skip += res.length }
	}
}

async function ddownload(addr, keypfx)
{
	let keys = {}
	let limit = 100
	let skip = 0
	let offset = 1
	while (offset >= 0) {
		let res = await bitdb.offsetbitdb(bitdb.d(addr, limit, skip), offset, true)
		for (let r of res) {
			if (r.alias.length < keypfx || r.alias.slice(0,keypfx.length) !== keypfx) { continue }
			if (r.alias in keys) { continue }
			keys[r.alias] = true
			//console.log(r.alias)
			let app = bitdb.parseapp(await bitdb.autobitdb(bitdb.app(r.pointer)))
			if (app === 'BCAT') {
				await bcatdownload(r.pointer, r.alias)
			} else if (app === 'B') {
				await bdownload(r.pointer, r.alias)
			} else {
				console.log(`${r.pointer}: Unknown protocol "${app}"`)
			}
		}
		if (res.length < limit) { -- offset; skip = 0 }
		else { skip += res.length }
	}

}

async function dlog(addr, mode = null)
{
	let limit = 100
	let skip = 0
	let offset = 1
	while (offset >= 0) {
		let res = await bitdb.offsetbitdb(bitdb.d(addr, limit, skip), offset, true)
		for (let r of res) {
			let time = r.block ? (new Date(r.block.t*1000)).toISOString() : 'unconfirmed'
			let app = mode == 'list' ? 'tx' : bitdb.parseapp(await bitdb.autobitdb(bitdb.app(r.pointer)))
			console.log(`${time} ${r.transaction} ${r.alias} ${r.type} ${app || 'tx'}://${r.pointer}`)
		}
		if (res.length < limit) { -- offset; skip = 0 }
		else { skip += res.length }
	}
}

async function txstatus(txid)
{
	let tx = await bitdb.bitdb(bitdb.tx(txid))
	console.log(JSON.stringify(tx))
	let app = bitdb.parseapp(await bitdb.autobitdb(bitdb.app(txid)))
	if (app === 'BCAT') {
		await bcatstatus(txid)
	} else if (app === 'B') {
		await bstatus(txid)
	}
}

async function bstream(txid, stream)
{
	let b = await bitdb.autobitdb(bitdb.b(txid))
	stream.write(Buffer.from(b.data, 'base64'))
}

async function bcatstream(txid, stream)
{
	let bcat = await bitdb.autobitdb(bitdb.bcat(txid))
	bcat = bitdb.parsebcat(bcat)
	let queue = new Queue(10);
	for (let chunk of bcat.data) {
		queue.add(async (chunk) => {
			let res = await bitdb.autobitdb(bitdb.bcatpart(chunk))
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
	let app = await bitdba.autobitdb(bitdb.app(c))
	let parsed = bitdb.parseapp(app)
	console.log(`${parsed}://${c}`)
}

async function bstatus(txid)
{
	let b = await bitdb.autobitdb(bitdb.b(txid))
	console.log('Filename: ' + b.filename)
	console.log('ID: b://' + txid)
	console.log('Author: ' + b.sender)
	console.log('Content-Type: ' + b.mime)
	console.log('Encoding: ' + b.encoding)
	console.log('Date: ' + (b.block ? (new Date(b.block.t*1000)).toISOString() : 'unconfirmed'))
	console.log('Block: ' + (b.block ? (b.block.i + ' ' + b.block.h) : 'unconfirmed'))
	console.log('Size: ' + b.data.length)
}

async function bcatstatus(txid)
{
	let bcat = bitdb.parsebcat(await bitdb.autobitdb(bitdb.bcat(txid)))
	console.log('Filename: ' + bcat.filename)
	console.log('ID: bcat://' + txid)
	console.log('Author: ' + bcat.sender)
	console.log('Info: ' + bcat.info)
	console.log('Content-Type: ' + bcat.mime)
	console.log('Encoding: ' + bcat.encoding)
	console.log('Flag: ' + bcat.flag)
	console.log('Date: ' + (bcat.block ? (new Date(bcat.block.t*1000)).toISOString() : 'unconfirmed'))
	console.log('Block: ' + (bcat.block ? bcat.block.i + ' ' + bcat.block.h : 'unconfirmed'))
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
			let res = await bitdb.autobitdb(bitdb.bcatpart(chunk))
			res = Buffer.from(res, 'base64')
			if (!res.length) throw res;
			if (res.length > maxsize) { maxsize = res.length }
			len += res.length
			++ goodchunks
			process.stdout.write(`(good:${goodchunks} bad:${badchunks} size:${len})\r`)
			return res
		}, chunk)
	}
	queue.on('reject', data => {
		console.log('Bad Chunk: ' + data.input)
		++ badchunks
	})
	queue.on('resolve', data => {
		hash.update(data.data)
	})
	try {
		await queue.wait()
	} catch(e) { }
	console.log('ID: C://' + hash.digest('hex'))
	console.log('Max Chunk Size: ' + maxsize)
	if (badchunks) {
		console.log('Total Good Data Size: ' + len)
		let estimatedmissing = badchunks * maxsize
		console.log('Estimated Missing Data Size: ' + estimatedmissing)
		console.log('Estimated Total Size: ' + (estimatedmissing + len))
	} else {
		console.log('Total size: ' + len)
	}
}

module.exports = {
	txstatus: txstatus,
	bstatus: bstatus,
	bcatstatus: bcatstatus,
	bstream: bstream,
	bcatstream: bcatstream,
	dlog: dlog,
	dstatus: dstatus,
	ddownload: ddownload,
	dstream: dstream,
	bcatdownload: bcatdownload,
	cstatus: cstatus,
	bdownload: bdownload
}
