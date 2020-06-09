const axios = require('axios')

async function query(host, channel = 'txt', tag = undefined, limit = 100, offset = 0, descending = false, by_creation_time = false, min_block = undefined, max_block = undefined)
{
	let order = by_creation_time ? "created_at" : "i"
	if (descending) { order = "-" + order }
	let url = `${host}/${channel}`
	if (tag) { url += `/${tag}` }
	url += '/json'
	let config = {
		params: {
			limit: limit,
			offset: offset,
			order: order,
			from: (min_block != undefined && min_block != max_block) ? min_block : undefined,
			to: (max_block != undefined && max_block != min_block) ? max_block : undefined,
			at: (max_block != undefined && max_bock == min_block) ? max_block : undefined // this will also take 'null' for unconfirmed-only and '-null' for confirmed-only
		},
		transformResponse: x => x
	}
	let res
	while (true) {
		try {
			//console.log(url)
			res = (await axios.get(url, config)).data
			//console.log(res)
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
	try {
		let json = JSON.parse(res)
		return json.result
	} catch(e) {
		if (e.name === 'SyntaxError') {
			throw new Error('Invalid server response: ' + JSON.stringify(res));
		}
		throw e
	}
}

async function ctxt(tag = undefined, limit = 100, offset = 0, descending = false, by_creation_time = false, min_block = undefined, max_block = undefined)
{
	return query('https://ctxt.planaria.network', 'txt', tag, limit, offset, descending, by_creation_time, min_block, max_block)
}

async function c(hash)
{
	const result = (await ctxt(hash, 1, 0, false, true))[0]
	return result && result.tx_id
}

module.exports = {
	query: query,
	ctxt: ctxt,
	c: c
}
