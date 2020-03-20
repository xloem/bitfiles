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

function inaddr(addr, reverse = true)
{
	return { 'v': 3, 'q': { 'find': {
		'in.e.a': addr,
	}, 'project': {
		'tx.h': 1,
		'blk.i': 1,
	}, 'sort': {
		'blk.i': reverse ? -1 : 1,
	} }, 'r': {
		'f': '[.[] | .tx.h]'
	} }
}

function d(addr, key = undefined, reverse = true)
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
		'blk.i': reverse ? -1 : 1,
		'out.s5': reverse ? -1 : 1
	} }, 'r': {
		'f': '[.[] | { transaction: .tx.h, block: .blk, alias: .out[0].s2, pointer: .out[0].s3, type: .out[0].s4 , seq: .out[0].s5 }]'
	} }
}

function app(txid)
{
	return { 'v': 3, 'q': { 'find': {
		'tx.h': txid,
		'out.s0': {'$exists': false},
		'out.s1': {'$exists': true}
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
		'f': '.[] | { block: .blk, sender: .in[0].e.a, data: (.out[0].b2 // .out[0].lb2), mime: .out[0].s3, encoding: .out[0].s4, filename: .out[0].s5 }'
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
	} }, 'r': {
		'f': '.[]'
	} }
}

function bcatpart(txid)
{
	return { 'v': 3, 'q': { 'find': {
		'out.s1': BCatPart_,
		'tx.h': txid,
	}, 'project': {
		'out.$': 1,
	} }, 'r': {
		'f': '.[] | (.out[0].b2 // .out[0].lb2)'
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
	if (d.s2 == BCat_) { ++ i; }
	while (chunkid = d['h'+i]) {
		r.data.push(chunkid)
		++ i
	}
	return r
}

function chunk(query, limit, skip)
{
	query.q.limit = limit
	query.q.skip = skip
	return chunk
}

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

module.exports = {
	inaddr: inaddr,
	app: app,
	b: b,
	bcat: bcat,
	bcatpart: bcatpart,
	c: c,
	d: d,
	parseapp: parseapp,
	parsebcat: parsebcat,
	chunk: chunk,
	offset: offset
}
