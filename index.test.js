const river = require('mississippi-promise')
let bitfiles = require('.')
let test = require('tape')

test('dstatus', async (test) => {
	test.plan(2)
	let stream
	let objs
	stream = await bitfiles.dstatus(null, null, 'list', false)
	objs = []
	objs.push(await river.pull(stream))
	objs.push(await river.pull(stream))
	stream.destroy()
	let example =  [
		{
			application: 'D',
			sender: '19iG3WTYSsbyos3uJ733yK4zEioi1FesNU',
			transaction: '6f212fd496e44ea208082cd215466e8490b6394f67fd34d4c7e87048ff088c7d',
			block: {
				time: new Date(1552306480000),
				seconds: 1552306480,
				height: 573208,
				hash: '0000000000000000070da300690bcee1fa774331a17472e3468b6163d5e55cd0'
			},
			alias: 'piano.html',
			pointer: {
				application: 'tx',
				transaction: '0a68bb439a78ab5a721f0a139abedcbe0259f7f050fbba2ebed6006bb953bd5e'
			},
			type: undefined,
			sequence: undefined,
			service: 'bitdb'
		},
		{
			application: 'D',
			sender: '17faLSy9ByvE3qZSLSScGgrZTZ5YUnVjde',
			transaction: 'b05ed66d321f165a998a1ee5e2b695947f3a41d24b9a5b7c4ec41e3e16210e1f',
			block: {
				time: new Date(1552309649000),
				seconds: 1552309649,
				height: 573211,
				hash: '0000000000000000017456c11b4c0b3da5d350dd18e9df4c6c11ffdbc7616dc0'
			},
			alias: 'piano.html',
			pointer: {
				application: 'tx',
				transaction: '0a68bb439a78ab5a721f0a139abedcbe0259f7f050fbba2ebed6006bb953bd5e'
			},
			type: undefined,
			sequence: undefined,
			service: 'bitdb'
		}
	]
	test.deepEqual(objs, example)
	stream = await bitfiles.dstatus(null, null, null, false)
	objs = []
	objs.push(await river.pull(stream))
	objs.push(await river.pull(stream))
	stream.destroy()
	example[0].pointer = {
		application: 'B',
		sender: '1EnZUMB2KvXqbqdY7HzNEdLdr35pQHA4cc',
		transaction: '0a68bb439a78ab5a721f0a139abedcbe0259f7f050fbba2ebed6006bb953bd5e',
		block: {
			time: new Date(1548949073000),
			seconds: 1548949073,
			height: 567648,
			hash: '00000000000000000688a1892c3271e549ff21661b14adadcff964d72f012d8a'
		},
		mime: 'text/html',
		encoding: undefined,
		filename: undefined,
		size: 10120,
		service: 'bitdb'
	}
	example[1].pointer = {
		application: 'B',
		sender: '1EnZUMB2KvXqbqdY7HzNEdLdr35pQHA4cc',
		transaction: '0a68bb439a78ab5a721f0a139abedcbe0259f7f050fbba2ebed6006bb953bd5e',
		block: {
			time: new Date(1548949073000),
			seconds: 1548949073,
			height: 567648,
			hash: '00000000000000000688a1892c3271e549ff21661b14adadcff964d72f012d8a'
		},
		mime: 'text/html',
		encoding: undefined,
		filename: undefined,
		size: 10120,
		service: 'bitdb'
	}
	test.deepEqual(objs, example)
})
