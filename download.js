bitdb = require('./bitdb.js')

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

module.exports = {
	dlog: dlog
}
