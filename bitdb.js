const genesisUrl = 'https://genesis.bitdb.network/q/1FnauZ9aUH2Bex6JzdcV4eNX7oLSSEbxtN/'
const genesisKey = ['159bcdKY4spcahzfTZhBbFBXrTWpoh4rd3']
const dataUrl = 'https://data.bitdb.network/q/1KuUr2pSJDao97XM8Jsq8zwLS6W1WtFfLg/'
const dataKey = ['1Px8CKdrfJUw7eVrTmVYjYtmtDoxjD6tGt']
const fetch = require('node-fetch')

const D_ = '19iG3WTYSsbyos3uJ733yK4zEioi1FesNU'
const B_ = '19HxigV4QyBv3tHpQVcUEQyq1pzZVdoAut'
	// lb2 or b2 = data
	//            s3 = contentType, s4 = encoding, s5 = filename
const BCat_ = '15DHFxWZJT58f9nhyGnsRBqrgwK4W6h4Up'
	// s2 = info, s3 = mime, s4 = encoding, s5 = filename, s6 = flag, h7... = chunks
const BCatPart_ = '1ChDHzdd1H4wSjgGMHyndZm6qxEDGjqpJL'
	// lb2 or b2 = data

const APPS = {
	[B_]: 'B',
	[BCat_]: 'BCAT',
	[BCatPart_]: 'BCATpart',
	[D_]: 'D'
}

async function bitdb(query) {
	let url, key
	url = genesisUrl
	key = genesisKey
	if (query.q.find.c) {
		url = dataUrl
		key = dataKey
	}
	let b64 = Buffer.from(JSON.stringify(query)).toString('base64')
	url = url + b64
	let headers = { headers: { key: [ key ] } }
	let res
	while (true) {
		try {
			res = (await fetch(url, headers))
			break
		} catch(e) {
			if (e.code == 'EAI_AGAIN') {
				process.stderr.write('... network interruption ...\n')
				await new Promise(resolve => setTimeout(resolve, 1000))
				continue
			}
			throw e
		}
	}
	res = await res.text()
	try {
		let json = JSON.parse(res)
		if (json.u && json.c && json.u.concat && json.c.concat && json.u.length > 0) {
			return json.u.concat(json.c)
		} else if (json.u && (json.u.length === undefined || json.u.length !== 0)) {
			return json.u
		} else if (json.c && (json.c.length === undefined || json.c.length !== 0)) {
			return json.c
		} else {
			throw new Error("no results for " + JSON.stringify(query))
		}
	} catch(e) {
		if (e.name === 'SyntaxError') {
			throw new Error('Invalid server response: ' + JSON.stringify(res))
		}
		throw e
	}
}


function d(addr, limit, skip, key = undefined)
{
	return { 'v': 3, 'q': { 'find': {
		'out.s1': D_,
		'in.e.a': addr,
		'out.s2': key
	}, 'project': {
		'tx.h': 1,
		'blk': 1,
		'out.$': 1,
	}, 'sort': {
		'blk.i': -1
	}, 'limit': limit, 'skip': skip }, 'r': {
		'f': '[.[] | { transaction: .tx.h, block: .blk, alias: .out[0].s2, pointer: .out[0].s3, type: .out[0].s4 , seq: .out[0].s5 }]'
	} }
}

function app(txid)
{
	return { 'v': 3, 'q': { 'find': {
		'tx.h': txid,
	}, 'project': {
		'out.s1': 1
	} }, 'r': {
		'f': '.[] | .out[0].s1'
	} }
}

function b(txid)
{
	return { 'v': 3, 'q': { 'find': {
		'out.s1': B_,
		'tx.h': txid,
	}, 'limit': 1, 'project': {
		'blk': 1,
		'in.e.a': 1,
		'out.$': 1
	} }, 'r': {
		'f': '.[] | { block: .blk, sender: .in[0].e.a, data: .out[0].lb2, mime: .out[0].s3, encoding: .out[0].s4, filename: .out[0].s5 }'
	} }
}

function bcat(txid)
{
	return { 'v': 3, 'q': { 'find': {
		'out.s1': BCat_,
		'tx.h': txid,
	}, 'project': {
		'blk': 1,
		'in.e.a': 1,
		'out.$': 1
	} }, 'r': {
		'f': '.[] | { block: .blk, sender: .in[0].e.a , info: .out[0].s2, mime: .out[0].s3, encoding: .out[0].s4 , filename: .out[0].s5, flag: .out[0].h6, data: .out[0] }'
	} }
}

function c(hash)
{
	return { 'v': 3, 'q': { 'find': {
		'c': hash
	}, 'project': {
		'tx': 1
	} }, 'r': {
	    'f': '.[] | .tx.h'
	} }
}

function tx(id)
{
	return { 'v': 3, 'q': { 'find': {
		'tx.h': id,
	} } }
}

function bcatpart(txid)
{
	return { 'v': 3, 'q': { 'find': {
		'out.s1': BCatPart_,
		'tx.h': txid,
	}, 'project': {
		'out.$.lb2': 1
	} }, 'r': {
		'f': '.[] | .out[0].lb2'
	} }
}

function parseapp(res)
{
	res = res.toString()
	return (res in APPS) ? APPS[res] : res
}

function parsebcat(res)
{
	let r = res
	let d = r.data
	r.data = []
	let i = 7; let chunkid;
	while (chunkid = d['h'+i]) {
		r.data.push(chunkid)
		++ i
	}
	return r
}

module.exports = {
	bitdb: bitdb,
	tx: tx,
	app: app,
	b: b,
	bcat: bcat,
	bcatpart: bcatpart,
	c: c,
	d: d,
	parseapp: parseapp,
	parsebcat: parsebcat
}
