const wocUrl = 'https://api.whatsonchain.com/v1/bsv/'
const axios = require('axios')

async function broadcast(tx, network = 'main')
{
	if (tx.toString().match(/[^0-9a-fA-F\s]/)) {
		tx = tx.toString('hex')
	} else {
		tx = tx.toString()
	}
	const url = wocUrl + network + '/tx/raw'
	let res
	while (true) {
		try {
			res = await axios.post(url, tx)
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

module.exports = {
	broadcast: broadcast
}
