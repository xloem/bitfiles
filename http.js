const axios = require('axios')

module.exports = async function(url, headers = undefined, data = null)
{
	let config = { 'headers': headers, transformResponse: x => x }
	while(true) {
		try {
			if (data === null) {
				return (await axios.get(url, config)).data
			} else {
				return (await axios.post(url, data, config)).data
			}
		} catch(e) {
			if (e.code === 'EAI_AGAIN') {
				process.stderr.write('... network interruption ...\n')
				await new Promise(resolve => setTimeout(resolve, 1000))
			} else {
				throw e;
			}
		}
	}
}
