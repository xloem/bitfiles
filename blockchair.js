const bcUrl = 'https://api.blockchair.com/'
const http = require('./http.js')

let last_req_time = 0

async function api(network, endpoint, data = null)
{
	let time = Date.now()
	if (time - last_req_time < 60000) {
		// blockchair without api key allows a daily average of 1 req/minute, reset at midnight utc
		await new Promise(resolve => setTimeout(resolve, last_req_time + 60000 - time))
	}
	const url = bcUrl + network + endpoint
	let res = await http.json(url, undefined, data)
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

async function getTX(txid, network = 'bitcoin-sv')
{
	let res = await api(network, '/raw/transaction/' + txid)
	return res[txid].raw_transaction
}

module.exports = {
	broadcast: broadcast,
	priority: priority,
	getTX: getTX
}
