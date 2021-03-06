const bcUrl = 'https://api.blockchair.com/'
const axios = require('axios')

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
			if (data) {
				res = (await axios.post(url, data)).data
			} else {
				res = (await axios.get(url)).data
			}
			break
		} catch(e) {
			if (e.code == 'EAI_AGAIN') {
				process.stderr.write('... network interruption ...\n')
				await new Promise(resolve => setTimeout(resolve, 1000))
				continue
			}
			if (e.response.data.context) {
				res = e.response.data
				break
			}
			let error = new Error(e)
			error.code = 'UnknownError'
			error.original = e
			throw error
		}
	}
	if (res.context.code === 200) { return res.data }

	let error = new Error(res.context.error)
	error.original = res.context
	if (res.context.error.startsWith('Invalid transaction')) {
		error.code = 'InvalidData'
	} else {
		error.code = 'UnknownError'
	}
	throw error
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
