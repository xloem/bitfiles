const bcUrl = 'https://api.blockchair.com/'
const fetch = require('node-fetch')

async function api(network, endpoint, data = null)
{
	const url = bcUrl + network + endpoint
	let res
	while (true) {
		try {
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
	return res[txid]
}

module.exports = {
	broadcast: broadcast,
	priority: priority
}
