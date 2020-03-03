crypto = require('crypto')
fse = require('fs-extra')
path = require('path')

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
	let b = await bitdb.autobitdb(bitdb.b(txid))
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
		let bcat = await bitdb.autobitdb(bitdb.bcat(txid))
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

async function ddownload(addr, keypfx, onlyupdate = true)
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
			let app = bitdb.parseapp(await bitdb.autobitdb(bitdb.app(r.pointer)))
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

async function addrdownload(addr, path = '.', ext = '')
{
	let limit = 100
	let skip = 0
	console.log(`Downloading all raw transactions for bitcoin://${addr} ...`)
	while (true) {
		let res = await bitdb.bitdb(bitdb.inaddr(addr, limit, skip), true)
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
	let tx
	try {
		console.log(`BitDB status of tx://${txid}`)
		tx = await bitdb.bitdb(bitdb.tx(txid))
	} catch(e) {
		if (e.code == 'NoResults') {
			console.log('Not found')
			await mstatus(txid);
			tx = await bitdb.bitdb(bitdb.tx(txid))
		} else {
			throw e
		}
	}
	let app = bitdb.parseapp(await bitdb.autobitdb(bitdb.app(txid)))
	if (app === 'BCAT') {
		await bcatstatus(txid)
	} else if (app === 'B') {
		await bstatus(txid)
	} else {
		console.log(`ID: ${app||'tx'}://${txid}`)
		console.log('Date: ' + (tx.blk ? (new Date(tx.blk.t*1000)).toISOString() : 'unconfirmed'))
		console.log('Block: ' + (tx.blk ? (tx.blk.i + ' ' + tx.blk.h) : 'unconfirmed'))
		//console.log(JSON.stringify(tx))
	}
	if (!tx.blk) {
		await mstatus(txid)
	}
}

async function txstream(txid, stream)
{
	let data
	try {
		data = await whatsonchain.getTX(txid)
	} catch(e) {
		data = await blockchair.getTX(txid)
	}
	stream.write(Buffer.from(data))
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

async function mstatus(txid)
{
	let first_ratio = null
	let first_time = null
	let last_ratio = null
	console.log(`Blockchair Mempool status of tx://${txid}`)
	while (true) {
		let date = new Date()
		let priority = await blockchair.priority(txid)
		if (!priority.position) {
			console.log(`${date} Not in mempool`)
			return
		}
		// we'd like to show how it's moving scalewise

		let ratio = 100 * (priority.out_of - priority.position) / (priority.out_of - 1)
		let rate = null
		if (last_ratio && ratio != last_ratio) {
			let change = ratio - last_ratio
			let rate = (ratio - first_ratio) / ((date.getTime() - first_date.getTime()) / 1000 / 60 / 60)
			console.log(`${date.toISOString()} ${priority.position} / ${priority.out_of}  +${change}% (${rate}%/hr)`)
		} else {
			first_ratio = ratio
			first_date = date
			console.log(`${date} ${priority.position} / ${priority.out_of}`)
		}
		last_ratio = ratio
	}
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
			process.stderr.write(`(good:${goodchunks} bad:${badchunks} size:${len})\r`)
			return res
		}, chunk)
	}
	queue.on('reject', data => {
		console.log('Bad Chunk: ' + data.input)
		++ badchunks
	})
	queue.on('resolve', data => {
		hash.update(data)
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
	addrstatus: addrstatus,
	addrdownload: addrdownload,
	txstatus: txstatus,
	txstream: txstream,
	txdownload: txdownload,
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
	bdownload: bdownload,
	mstatus: mstatus
}
