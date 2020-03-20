const xUrl = 'https://x.bitfs.network/'
const axios = require('axios')

async function out(tx, script, chunk)
{
	const url = xUrl + tx + '.out.' + script + '.' + chunk;
	let res;
	do {
		try {
			res = (await axios.get(url)).data;
		} catch(e) {
			if (e.code == 'EAI_AGAIN') {
				process.stderr.write('... network interruption ...\n')
				await new Promise(resolve => setTimeout(resolve, 1000))
				continue
			}
			throw e
		}
	} while(false);
	return res;
}

module.exports = {
	out: out
}
