const river = require('mississippi-promise')
let crypto = require('crypto')
let fse = require('fs-extra')
let path = require('path')

bitquery = require('./bitquery.js')
bitdb = require('./bitdb.js')
blockchair = require('./blockchair.js')
mattercloud = require('./mattercloud.js')
whatsonchain = require('./whatsonchain.js')
Queue = require('./queue.js')


async function txdownload(txid, fn = undefined)
{
	if (fn === undefined) {
		fn = txid
	}
	console.log(`Downloading ${fn} ...`)
	let tmpfn = fn + '.bitfiles.tmp'
	await txstream(txid, {write: data => {
		fse.writeFileSync(tmpfn, data)
		console.log(`Wrote ${data.length} bytes...`)
	}})
	fse.renameSync(tmpfn, fn)
	console.log('Done.')
}

async function bdownload(txid, fn = undefined)
{
	let b = await bitdb.autobitdb(bitquery.b(txid))
	if (fn === undefined) {
		fn = b.filename
	}
	console.log(`Downloading ${fn} ...`)
	let buf = Buffer.from(b.data, 'base64')
	let tmpfn = fn + '.bitfiles.tmp'
	fse.writeFileSync(tmpfn, buf)
	fse.renameSync(tmpfn, fn)
	console.log(`Wrote ${buf.length} bytes...`)
	console.log('Done.')
}

async function bcatdownload(txid, fn = undefined)
{
	if (fn === undefined) {
		let bcat = await bitdb.autobitdb(bitquery.bcat(txid))
		fn = bcat.filename
	}
	console.log(`Downloading ${fn} ...`)
	let tmpfn = fn + '.bitfiles.tmp'
	let fd = fse.openSync(tmpfn, 'w')
	let total = 0
	await bcatstream(txid, {write: data => {
		fse.writeSync(fd, data)
		total += data.length
		process.stderr.write(`Wrote ${total} bytes...\r`)
	}})
	process.stderr.write('\n')
	fse.closeSync(fd)
	fse.renameSync(tmpfn, fn)
	console.log('Done.')
}

// this returns all past copies
async function dstatus(addr = null, key = null, mode = null, reverse = true)
{
	//console.log(`dstatus ${addr} ${key} ${mode}`)
	//let found = false
	let stream = await bitdb.bitdb(bitquery.d(addr, key, reverse))
	/*
	if (reverse) {
		stream = river.merge(
			await bitdb.bitdb(bitquery.offset(bitquery.d(addr, key), 1)),
			await bitdb.bitdb(bitquery.offset(bitquery.d(addr, key), 0))
		)
	} else {
		stream = river.merge(
			await bitdb.bitdb(bitquery.offset(bitquery.d(addr, key, false), 0)),
			await bitdb.bitdb(bitquery.offset(bitquery.d(addr, key, false), 1))
		)
	}
	*/
	return river.pipeline.obj(
		stream,
		river.through.obj(async result => {
			//console.log('DSTATUS RESULT: ' + JSON.stringify(result))
			/*
			r.alias = decodeURIComponent(r.alias)
			//if (r.alias != key) { return [] }
			let result = {
				service: 'bitdb',
				application: 'D',
				block: r.block ? {
					time: new Date(r.block.t*1000),
					height: r.block.i,
					hash: r.block.h
				} : undefined,
				transaction: r.transaction,
				type: r.type,
			}
			*/
			if (mode === 'list') {
				result.pointer = {
					application: 'tx',
					transaction: result.pointer
				}
			} else {
				let app = (await bitdb.bitdb(bitquery.app(result.pointer))) || 'tx'
				if (app === 'BCAT') {
					result.pointer = await bcatstatus(result.pointer)
				} else if (app === 'B') {
					result.pointer = await bstatus(result.pointer)
				} else {
					result.pointer = await txstatus(result.pointer)
				}
			}
			if (mode === 'quick') {
				stream.destroy()
			}
			return result
		})
	)
}

async function d(addr, stream, key)
{
	let limit = 100
	let skip = 0
	let offset = 1
	while (offset >= 0) {
		let res = await bitdb.offsetbitdb(bitquery.d(addr, limit, skip, key), offset, true)
		for (let r of res) {
			r.alias = decodeURIComponent(r.alias)
			let app = bitquery.parseapp(await bitdb.autobitdb(bitquery.app(r.pointer)))
			if (app === 'BCAT') {
				return await bcat(r.pointer)
			} else if (app === 'B') {
				return await b(r.pointer)
			} else {
				process.stderr.write(`${r.pointer}: Unknown protocol "${app}"\n`)
			}
		}
		if (res.length < limit) { -- offset; skip = 0 }
		else { skip += res.length }
	}
	throw 'not found'
}

async function dstream(addr, stream, key)
{
	let limit = 100
	let skip = 0
	let offset = 1
	while (offset >= 0) {
		let res = await bitdb.offsetbitdb(bitquery.d(addr, limit, skip, key), offset, true)
		for (let r of res) {
			r.alias = decodeURIComponent(r.alias)
			let app = bitquery.parseapp(await bitdb.autobitdb(bitquery.app(r.pointer)))
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

async function ddownload(addr, keypfx, onlyupdate = true)
{
	let keys = {}
	let limit = 100
	let skip = 0
	let offset = 1
	while (offset >= 0) {
		let res = await bitdb.offsetbitdb(bitquery.d(addr, limit, skip), offset, true)
		for (let r of res) {
			r.alias = decodeURIComponent(r.alias)
			if (r.alias.length < keypfx || r.alias.slice(0,keypfx.length) !== keypfx) { continue }
			if (r.alias in keys) { continue }
			let rio = keypfx.lastIndexOf('/')
			let fn = (rio === -1 ? r.alias : r.alias.slice(rio))
			if (fn[0] === '/') { fn = fn.slice(1) }
			if (fn[fn.length-1] === '/') { continue }
			// okay, we don't want the git-remote-bsv.git subdir to be written out
			// a quick fix is to make sure it is treated as an ignored directory component
			fse.ensureDirSync(path.dirname(fn))
			keys[r.alias] = true
			//console.log(r.alias)
			if (onlyupdate) {
				try {
					const stat = fse.statSync(fn)
					if (stat.mtimeMs / 1000 >= r.block.t) {
						// nothing new
						continue
					}
				} catch(e) { }
			}
			let app = bitquery.parseapp(await bitdb.autobitdb(bitquery.app(r.pointer)))
			if (app === 'BCAT') {
				await bcatdownload(r.pointer, fn)
			} else if (app === 'B') {
				await bdownload(r.pointer, fn)
			} else {
				console.log(`${r.pointer}: Unknown protocol "${app}"`)
			}
		}
		if (res.length < limit) { -- offset; skip = 0 }
		else { skip += res.length }
	}

}

/*async function dlog(addr, mode = null, reverse = true)
{
	let stream
	if (reverse) {
		stream = concatstream([
			await bitdb.bitdb(bitquery.offset(bitquery.d(addr), 1)),
			await bitdb.bitdb(bitquery.offset(bitquery.d(addr), 0))
		])
	} else {
		stream = concatstream([
			await bitdb.bitdb(bitquery.offset(bitquery.d(addr, null, false), 0)),
			await bitdb.bitdb(bitquery.offset(bitquery.d(addr, null, false), 1))

		])
	}
	return miss.pipe(
		stream,
		miss.through((r, encoding, callback) => {
			r.alias = decodeURIComponent(r.alias)
			let time = r.block ? (new Date(r.block.t*1000)).toISOString() : 'unconfirmed'
			let app = mode == 'list' ? 'tx' : bitquery.parseapp(await bitdb.autobitdb(bitquery.app(r.pointer)))
			console.log(`${time} ${r.transaction} ${r.alias} ${r.type} ${app || 'tx'}:/\/${r.pointer}`)
		})
	)
}*/

async function addrdownload(addr, path = '.', ext = '')
{
	let limit = 100
	let skip = 0
	console.log(`Downloading all raw transactions for bitcoin://${addr} ...`)
	while (true) {
		let res = await bitdb.bitdb(bitquery.inaddr(addr, limit, skip), true)
		for (let txid of res) {
			await txdownload(txid, `${path}/txid${ext}`);
		}
		if (res.length < limit) { break; }
		skip += res.length;
	}
}

async function addrstatus(addr)
{
	let utxos = await mattercloud.getUtxos(addr)
	console.log(`Mattercloud status of bitcoin://${addr}`)
	console.log(`Balance in satoshis: ${utxos.reduce((sats, utxo) => sats += utxo.satoshis, 0)}`)
	console.log(`UTXO count: ${utxos.length}`)
}

async function txstatus(txid)
{
	let tx = await bitdb.bitdb(bitquery.tx(txid))
	if (tx === null) {
		return {
			service: 'bitdb',
			application: 'tx',
			transaction: txid,
			mempool: await mstatus(txid)
		}
	}
	let app = bitquery.parseapp(await bitdb.autobitdb(bitquery.app(txid)))
	if (app === 'BCAT') {
		return await bcatstatus(txid)
	} else if (app === 'B') {
		return await bstatus(txid)
	} else {
		let result = {
			service: 'bitdb',
			application: app||'tx',
			transaction: txid,
			block: tx.blk ? {
				time: new Date(tx.blk.t*1000),
				height: tx.blk.i,
				hash: tx.blk
			} : undefined
		}
	}
	if (!tx.blk) {
		result.mempool = await mstatus(txid)
	}
	return result
}

async function tx(txid)
{
	let data
	try {
		data = await whatsonchain.getTX(txid)
	} catch(e) {
		data = await blockchair.getTX(txid)
	}
	return data
}

async function txstream(txid, stream)
{
	stream.write(await tx(txid))
}

async function b(txid)
{
	let b = await bitdb.autobitdb(bitquery.b(txid))
	return Buffer.from(b.data, 'base64')
}

async function bstream(txid, stream)
{
	stream.write(await b(txid))
}

async function bcat(txid)
{
	let bcat = await bitdb.autobitdb(bitquery.bcat(txid))
	bcat = bitquery.parsebcat(bcat)
	let queue = new Queue(10);
	for (let chunk of bcat.data) {
		queue.add(async (chunk) => {
			let res = await bitdb.autobitdb(bitquery.bcatpart(chunk))
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
	let data = []
	queue.on('resolve', x => data.push(x))
	await queue.wait()
	return Buffer.concat(data)
}

async function bcatstream(txid, stream)
{
	let bcat = await bitdb.autobitdb(bitquery.bcat(txid))
	bcat = bitquery.parsebcat(bcat)
	let queue = new Queue(10);
	for (let chunk of bcat.data) {
		queue.add(async (chunk) => {
			let res = await bitdb.autobitdb(bitquery.bcatpart(chunk))
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
	let c = await bitdb.bitdb(bitquery.c(sha256))
	let app = await bitdb.autobitdb(bitquery.app(c))
	let parsed = bitquery.parseapp(app)
	console.log(`${parsed}://${c}`)
}

_priorities = {}

async function mstatus(txid)
{
	let result = {
		service: 'blockchair',
		application: 'mempool',
		time: new Date(),
	}

	let priority = await blockchair.priority(txid)
	if (!priority.position) {
		return result
	}
	result.position = priority.position
	result.out_of = priority.out_of

	if (!_priorities[txid]) {
		_priorities[txid] = {}
	}
	state = _priorities[txid]

	// we'd like to show how it's moving scalewise
	let ratio = 100 * (priority.out_of - priority.position) / (priority.out_of - 1)
	let rate = null
	if (state.last_ratio && ratio != state.last_ratio) {
		let change = ratio - state.last_ratio
		let rate = (ratio - state.first_ratio) / ((result.time.getTime() - state.first_date.getTime()) / 1000 / 60 / 60)
		result.change = change
		result.change_hr = rate
	} else {
		state.first_ratio = ratio
		state.first_date = result.time
	}
	state.last_ratio = ratio
	return result
}

async function bstatus(txid)
{
	let b = await bitdb.bitdb(bitquery.b(txid))
	b.size = b.data.length
	delete b.data
	return b
}

async function bcatstatus(txid)
{
	let bcat = bitquery.parsebcat(await bitdb.autobitdb(bitquery.bcat(txid)))
	const result = {
		service: 'bitdb',
		application: 'BCAT',
		transaction: txid,
		filename: bcat.filename,
		sender: bcat.sender,
		mime: bcat.mime,
		encoding: bcat.encoding,
		size: 0,
		info: bcat.info,
		flag: bcat.flag,
		chunkstotal: bcat.data.length,
		chunksbad: [],
		chunksgood: 0,
		chunkmaxsize: 0,
	}
	let totchunks = bcat.data.length
	let chunkindex = {}
	for (let i = 0; i < totchunks; ++ i) {
		chunkindex[bcat.data[i]] = i
	}
	let hash = crypto.createHash('sha256')
	let queue = new Queue(10);
	for (let chunk of bcat.data) {
		queue.add(async (chunk) => {
			let res = await bitdb.autobitdb(bitquery.bcatpart(chunk))
			if (!res) throw res
			res = Buffer.from(res, 'base64')
			if (res.length > result.chunkmaxsize) { result.chunkmaxsize = res.length }
			result.size += res.length
			++ result.chunksgood
			process.stderr.write(`(good:${result.chunksgood} bad:${result.chunksbad.length} size:${result.size})\r`)
			return res
		}, chunk)
	}
	queue.on('reject', data => {
		result.chunksbad.push(data.input)
	})
	queue.on('resolve', data => {
		hash.update(data)
	})
	try {
		await queue.wait()
	} catch(e) { }
	result.sha256 = hash.digest('hex')
	return result
}

module.exports = {
	bitdb: bitdb,
	blockchair: blockchair,
	mattercloud: mattercloud,
	whatsonchain: whatsonchain,

	addrstatus: addrstatus,
	addrdownload: addrdownload,
	tx: tx,
	txstatus: txstatus,
	txstream: txstream,
	txdownload: txdownload,
	mstatus: mstatus,
	b: b,
	bstatus: bstatus,
	bstream: bstream,
	bdownload: bdownload,
	bcat: bcat,
	bcatstatus: bcatstatus,
	bcatstream: bcatstream,
	bcatdownload: bcatdownload,
	d: d,
	//dlog: dlog,
	dstatus: dstatus,
	ddownload: ddownload,
	dstream: dstream,
	cstatus: cstatus
}
