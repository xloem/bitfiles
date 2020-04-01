const bitfsUrl = 'https://x.bitfs.network/'

const http = require('./http')

// inout is 'in' or 'out' for parts of tx
async function bitfs(inout, tx, script, chunk)
{
	const url = bitfsUrl + tx + '.' + inout + '.' + script + '.' + chunk;
	return await http.buffer(url);
}
