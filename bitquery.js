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

function parseblock(block)
{
	return block ? {
		time: new Date(block.t * 1000),
		seconds: block.t,
		height: block.i,
		hash: block.h
	} : undefined
}

function inaddr(addr, reverse = true)
{
	let query = { 'v': 3, 'q': { 'find': {
		'in.e.a': addr,
	}, 'project': {
		'tx.h': 1,
		'blk.i': 1,
	}, 'sort': {
		'blk.i': reverse ? -1 : 1,
	} }, 'r': {
		'f': '[.[] | .tx.h]'
	} }
	Object.defineProperty(query, 'parse', {value: inaddr.parse})
	return query
}
inaddr.parse = function(result)
{
	return result.tx.h
}

function d(address = undefined, key = undefined, reverse = true)
{
	let query = { 'v': 3, 'q': { 'find': {
		'in.e.a': address || { '$exists': true },
		'$or': [ {
			'out.s1' : D_,
			'out.s2' : key || undefined
		}, {
			'out.s2' : D_,
			'out.s3' : key || undefined
		} ]
	}, 'project': {
		'in.e.a': 1,
		'tx.h': 1,
		'blk': 1,
		'out.$': 1,
	}, 'sort': {
		'blk.i': reverse ? -1 : 1,
		'out.s6': reverse ? -1 : 1,
		'out.s5': reverse ? -1 : 1
	} } }
	Object.defineProperty(query, 'parse', {value: d.parse})
	return query
}
d.parse = function(result)
{
	//console.log(JSON.stringify(result))
	let return_value = {
		application: APPS[D_],
		sender: result.in[0].e.a,
		transaction: result.tx.h,
		block: parseblock(result.blk)
	}
	if (result.out[0].s1 === D_) {
		return_value.alias = decodeURIComponent(result.out[0].s2)
		return_value.pointer = result.out[0].s3
		return_value.type = result.out[0].s4
		return_value.sequence = result.out[0].s5
	} else {
		return_value.alias = decodeURIComponent(result.out[0].s3)
		return_value.pointer = result.out[0].s4
		return_value.type = result.out[0].s5
		return_value.sequence = result.out[0].s6
	}
	return return_value
}

function app(txid)
{
	let query = { 'v': 3, 'q': { 'find': {
		'tx.h': txid
	}, 'limit': 1, 'project': {
		'out.s1': 1,
		'out.s2': 1
	} } }
	Object.defineProperty(query, 'parse', {value: app.parse})
	return query
}
app.parse = function(result)
{
	if (!result.out) {
		return (result in APPS) ?
			APPS[result] : result
	}
	let app1 = result.out[0].s1
	let app2 = result.out[0].s2
	return (app2 in APPS) ?
		APPS[app2] : (
			app1 in APPS ?
			APPS[app1] : (
			app1 ?
				app1 :
				app2
			)
		)
}

function b(txid)
{
	let query = { 'v': 3, 'q': { 'find': {
		'in.e.a': { '$exists': true },
		'tx.h': txid,
		'$or': [
			{ 'out.s1' : B_ },
			{ 'out.s2' : B_ }
		]
	}, 'limit': 1, 'project': {
		'tx.h': 1,
		'blk': 1,
		'in.e.a': 1,
		'out.$': 1
	} } }
	Object.defineProperty(query, 'parse', {value: b.parse})
	return query
}
b.parse = function(result)
{
	let return_value = {
		application: APPS[B_],
		sender: result.in[0].e.a,
		transaction: result.tx.h,
		block: parseblock(result.blk)
	}
	if (result.out[0].s1 === B_) {
		return_value.data = result.out[0].b2 || result.out[0].lb2
		return_value.mime = result.out[0].s3
		return_value.encoding = result.out[0].s4
		return_value.filename = result.out[0].s5
	} else {
		return_value.data = result.out[0].b3 || result.out[0].lb3
		return_value.mime = result.out[0].s4
		return_value.encoding = result.out[0].s5
		return_value.filename = result.out[0].s6
	}
	return_value.size = return_value.data.length
	return return_value
}

function bcat(txid)
{
	let query = { 'v': 3, 'q': { 'find': {
		'in.e.a': { '$exists': true },
		'$or': [
			{ 'out.s1' : BCat_ },
			{ 'out.s2' : BCat_ }
		],
		'tx.h': txid,
	}, 'project': {
		'tx.h': 1,
		'blk': 1,
		'in.e.a': 1,
		'out.$': 1
	} } }
	Object.defineProperty(query, 'parse', {value: bcat.parse})
	return query
}
bcat.parse = function(result)
{
	let return_value = {
		application: APPS[BCat_],
		sender: result.in[0].e.a,
		transaction: result.tx.h,
		block: parseblock(result.blk)
	}
	let data_index
	if (result.out[0].s1 === BCat_) {
		return_value.info = result.out[0].s2
		return_value.mime = result.out[0].s3
		return_value.encoding = result.out[0].s4
		return_value.filename = result.out[0].s5
		return_value.flag = result.out[0].h6
		data_index = 7
	} else {
		return_value.info = result.out[0].s2
		return_value.mime = result.out[0].s3
		return_value.encoding = result.out[0].s4
		return_value.filename = result.out[0].s5
		return_value.flag = result.out[0].h6
		data_index = 8
	}
	return_value.data = []
	let chunk_identifier
	while (chunk_identifier = result.out[0]['h'+data_index])
	{
		return_value.data.push(chunk_identifier)
	}
	return return_value
}

function c(hash)
{
	let query = { 'v': 3, 'q': { 'find': {
		'c': hash
	}, 'project': {
		'tx.h': 1
	} } }
	Object.defineProperty(query, 'parse', {value: c.parse})
	return query
}
c.parse = function(result)
{
	return result.tx.h
}

function tx(id)
{
	let query = { 'v': 3, 'q': { 'find': {
		'tx.h': id,
	} } }
	Object.defineProperty(query, 'parse', {value: tx.parse})
	return query
}
tx.parse = function(result)
{
	return result
}

function bcatpart(txid)
{
	let query = { 'v': 3, 'q': { 'find': {
		'tx.h': txid,
		'$or': [
			{ 'out.s1' : BCatPart_ },
			{ 'out.s2' : BCatPart_ }
		]
	}, 'project': {
		'out.$': 1,
	} } }
	Object.defineProperty(query, 'parse', {value: bcatpart.parse})
	return query
}
bcatpart.parse = function(result)
{
	if (result.out[0].s1 === BCatPart_) {
		return result.out[0].b2 || result.out[0].lb2
	} else {
		return result.out[0].b3 || result.out[0].lb3
	}
}

function ismultiple(query)
{
	return !query.q.find['tx.h'] && !query.q.find.c && query.q.limit !== 1
}

function chunk(query, limit, skip)
{
	query.q.limit = limit
	query.q.skip = skip
	return query
}

/*
// offset = 1 converts from pre-genesis to genesis
// this change happened in 2020; all future data should be
// offset, but old data is unoffset
function offset(query, offset = 1)
{
	query = JSON.parse(JSON.stringify(query)) // deep clone
	for (let f0 of ['find', 'project', 'sort']) {
		let a = query.q[f0]
		if (!a) { continue }
		let n = {}
		for (let f in a) {
			if (f.match('\\d$')) {
				let v = a[f]
				let f2 = f.slice(0,-1) + (parseInt(f.slice(-1))+offset)
				n[f2] = v
			} else {
				n[f] = a[f]
			}
		}
		let f9 = f0
		query.q[f0] = n
	}
	if (query.r && query.r.f) {
		let a = query.r.f
		query.r.f = a.replace(/[^\[]\d([^0-9a-z]|$)/g, d => d[0] + (parseInt(d[1]) + offset) + d.slice(2))
	}
	return query
}
*/

module.exports = {
	inaddr: inaddr,
	app: app,
	b: b,
	bcat: bcat,
	bcatpart: bcatpart,
	c: c,
	d: d,
	tx: tx,
	ismultiple: ismultiple,
	//parseapp: parseapp,
	//parsebcat: parsebcat,
	chunk: chunk,
	//offset: offset
}
