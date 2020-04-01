const bitbusUrl = 'https://txo.bitbus.network/block'
const bitbusToken = 'eyJhbGciOiJFUzI1NksiLCJ0eXAiOiJKV1QifQ.eyJzdWIiOiIxNTZLRXBBdEVhc3VqVEM5Mlo3RTU4OWN5bmVLWTFqc0J6IiwiaXNzdWVyIjoiZ2VuZXJpYy1iaXRhdXRoIn0.SUtoOWEzSzRZaTk5ZVVWY2lneENPdE05eFQ2QytBcWIrNDZmcitHN090YVVMaSt6c0NteHIra0tFa0wzQjNMSHlJQUo3WGVVbi94bkdsYTJvQzhqY0s0PQ'
const http = require('./http.js')

async function bitbus(query, nothrow = false)
{
	return http.ndjson(bitbusUrl, {'Content-type': 'application/json; charset=utf-8', 'token': bitbusToken}, JSON.stringify(query))
}


