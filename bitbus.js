const bitbusUrl = 'https://txo.bitbus.network/block'
const bitbusToken = 'eyJhbGciOiJFUzI1NksiLCJ0eXAiOiJKV1QifQ.eyJzdWIiOiIxNTZLRXBBdEVhc3VqVEM5Mlo3RTU4OWN5bmVLWTFqc0J6IiwiaXNzdWVyIjoiZ2VuZXJpYy1iaXRhdXRoIn0.SUtoOWEzSzRZaTk5ZVVWY2lneENPdE05eFQ2QytBcWIrNDZmcitHN090YVVMaSt6c0NteHIra0tFa0wzQjNMSHlJQUo3WGVVbi94bkdsYTJvQzhqY0s0PQ'
const axios = require('axios')

// WIP WIP WIP
// this is some code towards quickly migrating to the new bitbus api server.
//

const D_ = '19iG3WTYSsbyos3uJ733yK4zEioi1FesNU'
const B_ = '19HxigV4QyBv3tHpQVcUEQyq1pzZVdoAut'
	// lb2 or b2 = data
	//            s3 = contentType, s4 = encoding, s5 = filename
const BCat_ = '15DHFxWZJT58f9nhyGnsRBqrgwK4W6h4Up'
	// s2 = info, s3 = mime, s4 = encoding, s5 = filename, s6 = flag, h7... = chunks
const BCatPart_ = '1ChDHzdd1H4wSjgGMHyndZm6qxEDGjqpJL'
	// lb2 or b2 = data

const APPS = {
	[B_]: 'B',
	[BCat_]: 'BCAT',
	[BCatPart_]: 'BCATpart',
	[D_]: 'D'
}

async function bitbus(query, nothrow = false) {
    let url, token
    url = bitbusUrl
    token = bitbusToken
    
    let config = { headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'token': token
    }, transformResponse:x=>x }
    let data = JSON.stringify(query)
    let res
    while (true) {
        try {
            res = (await axios.post(url, config, data)).data
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
    res = res.split('\n')
    for (let index = 0; index < res.length; ++ index) {
        res[index] = JSON.parse(res[index])
    }
}

module.exports = {
	bitbus: bitbus,
	offsetbitbus: offsetbitbus,
	autobitbus: autobitbus,
	tx: tx,
	inaddr: inaddr,
	app: app,
	b: b,
	bcat: bcat,
	bcatpart: bcatpart,
	c: c,
	d: d,
	parseapp: parseapp,
	parsebcat: parsebcat
}
