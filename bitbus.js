const bitbusUrl = 'https://txo.bitbus.network/block'
const bitbusToken = 'eyJhbGciOiJFUzI1NksiLCJ0eXAiOiJKV1QifQ.eyJzdWIiOiIxNTZLRXBBdEVhc3VqVEM5Mlo3RTU4OWN5bmVLWTFqc0J6IiwiaXNzdWVyIjoiZ2VuZXJpYy1iaXRhdXRoIn0.SUtoOWEzSzRZaTk5ZVVWY2lneENPdE05eFQ2QytBcWIrNDZmcitHN090YVVMaSt6c0NteHIra0tFa0wzQjNMSHlJQUo3WGVVbi94bkdsYTJvQzhqY0s0PQ'
const axios = require('axios')

// WIP WIP WIP
// this is some code towards quickly migrating to the new bitbus api server.
//

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

async function autobitbus(query) {
	try {
		return await offsetbitbus(query, 1)
	} catch(e) {
		if (e.code != 'NoResults') { throw e }
		return await bitbus(query, true)
	}
}

async function offsetbitbus(query, offset, nothrow = false) {
	let fix = []
	function mutated(a, offset) {
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
		return n
	}
	for (let f0 of ['find', 'project', 'sort']) {
		let a = query.q[f0]
		if (!a) { continue }
		let n = mutated(a, offset)
		let f9 = f0
		fix.push(()=>{query.q[f9] = a})
		query.q[f0] = n
	}
	if (query.parse) {
		const wrapped = query.parse
		query.parse = function (obj) {
			obj.out[0] = mutated(obj.out[0], -offset)
			obj = wrapped(obj)
			return obj
		}
	}
	if (query.r && query.r.f) {
		let a = query.r.f
		fix.push(()=>{query.r.f = a})
		query.r.f = a.replace(/[^\[]\d([^0-9a-z]|$)/g, d => d[0] + (parseInt(d[1]) + offset) + d.slice(2))
	}
	try {
		return await bitbus(query, nothrow)
	} catch(e) {
		for (let f of fix) { f() }
		throw e
	}
	return ret
}

async function bitbus(query, nothrow = false) {
    let url, token
    url = bitbusUrl
    token = bitbusToken
    
    let config = { headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'token': token
    }, transformResponse:x=>x }
    let parse = query.parse
    delete query.parse
    let data = JSON.stringify(query)
    let res
    while (true) {
        try {
            res = (await axios.post(url, data, config)).data
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
    res = res.split('\n')
    if (res[res.length-1].length == 0) {
        res.length --
    }
    for (let index = 0; index < res.length; ++ index) {
        res[index] = JSON.parse(res[index])
        if (parse) {
            res[index] = parse(res[index])
        }
    }
    return res
}

function inaddr(addr, limit, skip, reverse = true)
{
	return { 'v': 3, 'q': { 'find': {
		'in.e.a': addr,
	}, 'project': {
		'tx.h': 1,
		'blk.i': 1,
	}, 'sort': {
		'blk.i': reverse ? -1 : 1,
	}, 'limit': limit, 'skip': skip }, 'parse': function (obj) {
        return obj.tx.h
	} }
}

// reverse = true means newest-first
function d(addr, limit, skip, key = undefined, reverse = true)
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
	}, 'limit': limit, 'skip': skip }, 'parse': function (obj, offset) {
        return {
          transaction: obj.tx.h,
          block: obj.blk,
          alias: obj.out[0].s2,
          pointer: obj.out[0].s3,
          type: obj.out[0].s4,
          seq: obj.out[0].s5
        }
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
	} }, 'parse': function (obj) {
        return obj.out[0].s1
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
	} }, 'parse': function (obj) {
        return {
            block: obj.blk,
            sender: obj.in[0].e.a,
            data: obj.out[0].b2 || obj.out[0].lb2,
            mime: obj.out[0].s3,
            encoding: obj.out[0].s4,
            filename: obj.out[0].s5
        }
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
	} }, 'parse': function (obj) {
        return {
            block: obj.blk,
            sender: obj.in[0].e.a,
            info: obj.out[0].s2,
            mime: obj.out[0].s3,
            encoding: obj.out[0].s4,
            filename: obj.out[0].s5,
            flag: obj.out[0].h6,
            data: obj.out[0]
        }
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
		'out.$': 1,
	} }, 'parse': function (obj) {
        return obj.out[0].b2 || obj.out[0].lb2
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

module.exports = {
	bitbus: bitbus,
	offsetbitbus: offsetbitbus,
	autobitbus: autobitbus,
	tx: tx,
	inaddr: inaddr,
	app: app,
	b: b,
	bcat: bcat,
	bcatpart: bcatpart,
	//c: c,
	d: d,
	parseapp: parseapp,
	parsebcat: parsebcat
}
