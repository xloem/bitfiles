#!/usr/bin/env node

let argv = {_: process.argv.slice(2)}//require('minimist')(process.argv.slice(2))
let download = require('./download')

let action = argv._[0]
let url = argv._[1].split('://')
let type = url[0].toUpperCase()
let path = url[1].split('/')
let id = path.shift()
let dkey = path.join('/')

if (action == 'status') {
	if (type == 'D') {
		download.dlog(id)
	} else if (type == 'BCAT') {
		download.bcatstatus(id)
	}
} else if (action == 'stream') {
	if (type == 'BCAT') {
		download.bcatstream(id, process.stdout)
	}
} else if (action == 'download') {
	if (type == 'D') {
		download.ddownload(id, dkey)
	}
}


