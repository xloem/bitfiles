const bitdbUrl = 'https://genesis.bitdb.network/q/1FnauZ9aUH2Bex6JzdcV4eNX7oLSSEbxtN/'
const bitdbKey = ['159bcdKY4spcahzfTZhBbFBXrTWpoh4rd3']
const fetch = require('node-fetch')

const D_ = '19iG3WTYSsbyos3uJ733yK4zEioi1FesNU'
const B_ = '19HxigV4QyBv3tHpQVcUEQyq1pzZVdoAut'
	// lb2 or b2 = data
	//            s3 = contentType, s4 = encoding, s5 = filename
const BCat_ = '15DHFxWZJT58f9nhyGnsRBqrgwK4W6h4Up'
	// s2 = info, s3 = mime, s4 = encoding, s5 = filename, s6 = flag, h7... = chunks
const BCatPart_ = '1ChDHzdd1H4wSjgGMHyndZm6qxEDGjqpJL'
	// lb2 or b2 = data

async function bitdb(query) {
	let b64 = Buffer.from(JSON.stringify(query)).toString('base64')
	let url = bitdbUrl + b64
	let headers = { headers: { key: [ bitdbKey ] } }
	let res = (await fetch(url, headers))
	//console.log(await res.text())
	try {
		res = await res.json()
		if (res.u && res.c && res.u.concat && res.c.concat && res.u.length > 0) {
			return res.u.concat(res.c)
		} else {
			return (res.u && res.u.length !== 0) ? res.u : res.c
		}
	} catch(e) {
		console.log(e)
		return await res.text()
	}
}

let testaddr = ''

function d(addr, limit, skip)
{
	return { 'v': 3, 'q': { 'find': {
		'out.s1': D_,
		'in.e.a': addr,
	}, 'limit': limit, 'skip': skip }, 'r': {
		'f': '[.[] | { transaction: .tx.h, block: .blk, sender: .in[0].e.a ,appID: .out[0].s1, alias: .out[0].s2, pointer: .out[0].s3, type: .out[0].s4 , seq: .out[0].s5 }]'
	} }
}

function bcat(txid)
{
	return { 'v': 3, 'q': { 'find': {
		'out.s1': BCat_,
		'tx.h': txid,
	} }, 'r': {
		'f': '.[] | { transaction: .tx.h, block: .blk, sender: .in[0].e.a ,appID: .out[0].s1, info: .out[0].s2, mime: .out[0].s3, encoding: .out[0].s4 , filename: .out[0].s5, flag: .out[0].h6, data: .out[0] }'
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
	} }, 'r': {
		'f': '.[] | .out[0].lb2'
	} }
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
	d: d,
	bcat: bcat,
	bcatpart: bcatpart,
	parsebcat: parsebcat,
	testaddr: testaddr
}
