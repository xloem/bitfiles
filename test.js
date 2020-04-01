const fetch = require('cross-fetch')
const bitbusToken = 'eyJhbGciOiJFUzI1NksiLCJ0eXAiOiJKV1QifQ.eyJzdWIiOiIxNTZLRXBBdEVhc3VqVEM5Mlo3RTU4OWN5bmVLWTFqc0J6IiwiaXNzdWVyIjoiZ2VuZXJpYy1iaXRhdXRoIn0.SUtoOWEzSzRZaTk5ZVVWY2lneENPdE05eFQ2QytBcWIrNDZmcitHN090YVVMaSt6c0NteHIra0tFa0wzQjNMSHlJQUo3WGVVbi94bkdsYTJvQzhqY0s0PQ'

const query = {
	  q: {
	      find: { "out.s2": "19HxigV4QyBv3tHpQVcUEQyq1pzZVdoAut", "blk.i": { "$gt": 609000 } },
	      sort: { "blk.i": 1 },
	      project: { "blk": 1, "tx.h": 1, "out.s4": 1, "out.o1": 1, "in.e.a": 1 },
	      r: { f: ".out.o1" }
	    }
};
fetch("https://txo.bitbus.network/block", {
	  method: "post",
	  headers: { 'Content-type': 'application/json; charset=utf-8', 'token': bitbusToken },
	  body: '{"v":3,"q":{"find":{"tx.h":"0a68bb439a78ab5a721f0a139abedcbe0259f7f050fbba2ebed6006bb953bd5e","$or":[{"out.s1":"19HxigV4QyBv3tHpQVcUEQyq1pzZVdoAut"},{"out.s2":"19HxigV4QyBv3tHpQVcUEQyq1pzZVdoAut"}]},"limit":1,"project":{"tx.h":1,"blk":1,"in.e.a":1,"out.$":1}}}'
})
.then((res) => {
	  res.body.pipe(process.stdout)
})
