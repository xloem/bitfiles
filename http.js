const river = require('mississippi-promise')
const fetch = require('cross-fetch')

async function stream(url, headers = undefined, data = null)
{
	const options = {
		method: data === null ? 'GET' : 'POST',
		body: data,
		headers: headers
	}
	while(true) {
		try {
			const res = await fetch(url, options)
			if (!res.ok) {
				const err = new Error(res.statusText)
				err.response = res
				throw err
			}
			return res.body
		} catch(e) {
			console.log("ERROR: " + e)
			if (e.code === 'EAI_AGAIN') {
				// this is left over from axios and hasn't been tested with 'fetch' yet
				process.stderr.write('... network interruption ...\n')
				await new Promise(resolve => setTimeout(resolve, 1000))
			} else {
				throw e
			}
		}
	}
}

async function buffer(url, headers = undefined, data = null)
{
  const body = await stream(url, headers, data)
  return await river.concat(body)
}

async function string(url, headers = undefined, data = null)
{
	return (await buffer(url, headers, data)).toString('utf8')
}

async function json(url, headers = undefined, data = null)
{
	return JSON.parse(await string(url, headers, data))
}

async function ndjson(url, headers = undefined, data = null)
{
	return river.pipeline(
		await stream(url, headers, data),
		river.split('\n'),
		river.through.obj(async line => JSON.parse(line))
	)
}

module.exports = {
	stream: stream,
	buffer: buffer,
	string: string,
	json: json,
	ndjson: ndjson
}
