const bcUrl = 'https://api.blockchair.com/'
const fetch = require('node-fetch')

let last_req_time = 0

async function api(network, endpoint, data = null)
{
	let time = Date.now()
	if (time - last_req_time < 60000) {
		// blockchair without api key allows a daily average of 1 req/minute, reset at midnight utc
		await new Promise(resolve => setTimeout(resolve, last_req_time + 60000 - time))
	}
	const url = bcUrl + network + endpoint
	let res
	while (true) {
		try {
			last_req_time = Date.now()
			res = await fetch(url, data ? { method: 'POST', body: data } : undefined)
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
	res = await res.json()
	if (res.context.code == 200) { return res.data }
	throw res.context
}

async function broadcast(tx, network = 'bitcoin-sv')
{
	if (tx.toString().match(/[^0-9a-fA-F\s]/)) {
		tx = tx.toString('hex')
	} else {
		tx = tx.toString()
	}
	let res = await api(network, '/push/transaction', 'data=' + tx)
	return res.transaction_hash
}

async function priority(txid, network = 'bitcoin-sv')
{
	let res = await api(network, '/dashboards/transaction/' + txid + '/priority')
	return res[txid].priority
}

module.exports = {
	broadcast: broadcast,
	priority: priority
}
