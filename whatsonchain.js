const wocUrl = 'https://api.whatsonchain.com/v1/bsv/'
const axios = require('axios')

async function api(network, req, data = null)
{
	const url = wocUrl + network + '/' + req
	let res
	while (true) {
		try {
			if (data) {
				res = await axios.post(url, data)
			} else {
				res = await axios.get(url)
			}
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
	return res.data
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
