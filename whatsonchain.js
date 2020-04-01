const wocUrl = 'https://api.whatsonchain.com/v1/bsv/'
const http = require('./http.js')

async function api(network, req, data = null)
{
	const url = wocUrl + network + '/' + req
	let res = JSON.parse(await http(url, undefined, data))
	return res
}

async function broadcast(tx, network = 'main')
{
	if (tx.toString().match(/[^0-9a-fA-F\s]/)) {
		tx = tx.toString('hex')
	} else {
		tx = tx.toString()
	}
	return await api(network, 'tx/raw', tx)
}

async function getTX(txid, network = 'main')
{
	return await api(network, 'tx/' + txid + '/hex')
}

module.exports = {
	broadcast: broadcast,
	getTX: getTX
}
