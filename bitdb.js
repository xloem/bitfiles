const genesisUrl = 'https://genesis.bitdb.network/q/1FnauZ9aUH2Bex6JzdcV4eNX7oLSSEbxtN/'
const genesisKey = ['159bcdKY4spcahzfTZhBbFBXrTWpoh4rd3']
const dataUrl = 'https://data.bitdb.network/q/1KuUr2pSJDao97XM8Jsq8zwLS6W1WtFfLg/'
const dataKey = ['1Px8CKdrfJUw7eVrTmVYjYtmtDoxjD6tGt']

const river = require('mississippi-promise')

const bitquery = require('./bitquery.js')
const http = require('./http.js')

/*
async function autobitdb(query) {
	try {
		return await offsetbitdb(query)
	} catch(e) {
		if (e.code != 'NoResults') { throw e }
		return await bitdb(query, true)
	}
}


async function offsetbitdb(query, offset = 1) {
	query = bitquery.offset(query, offset)
	return await bitdb(query)
}
*/

function mutate(result)
{
	result.service = 'bitdb'
	return result
}

async function bitdb(query)
{
	if (!bitquery.ismultiple(query)) {
		return mutate(query.parse((await singlebitdb(query))[0]))
	}

	const limit = 100
	let skip = 0
	let items = []
	let index = 0

	return river.from.obj(async () => {
		if (index >= items.length) {
	 		items = await singlebitdb(bitquery.chunk(query, limit, skip))
			if (items.length < limit) {
				return
			}
			skip += items.length
			index = 0
		}
		return mutate(query.parse(items[index ++]))
	})
}

async function singlebitdb(query)
{
	let url, key
	//process.stderr.write(JSON.stringify(query) + '\n')
	url = genesisUrl
	key = genesisKey
	if (query.q.find.c) {
		url = dataUrl
		key = dataKey
	}
	let b64 = Buffer.from(JSON.stringify(query)).toString('base64')
	url = url + b64
	let res = await http.string(url, {key: key})
	//process.stderr.write(res + '\n')
	try {
		let json = JSON.parse(res)
		if (json.errors) { throw json.errors[0] }
		if (json.u && json.c && json.u.concat && json.c.concat && json.u.length > 0) {
			return json.u.concat(json.c) // returns array
		} else if (json.u && (json.u.length === undefined || json.u.length !== 0)) {
			return json.u // returns single object
		} else if (json.c && (json.c.length === undefined || json.c.length !== 0)) {
			return json.c // returns single object
		} else {
			return null
		}
	} catch(e) {
		if (e.name === 'SyntaxError') {
			throw new Error('Invalid server response: ' + res);
		}
		throw e
	}
}

module.exports = {
	bitdb: bitdb//,
	//offsetbitdb: offsetbitdb,
	//autobitdb: autobitdb
}
