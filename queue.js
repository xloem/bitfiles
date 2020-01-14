const EventEmitter = require('events')

class Queue extends EventEmitter
{
	constructor(concurrency = 1) {
		super()
		this.max = concurrency
		this.active = 0
		this.pending = []
		this.results = []
		this.completedIndex = 0
		this.nextIndex = 0
		this.waiter = null
	}
	wait() {
		if (this.waiter) { return this.waiter }
		return new Promise((resolve, reject) => {
			this.waiter={'resolve':resolve, 'reject':reject}
		})
	}
	add(asyncfunc, ...data) {
		this.pending.push({'func': asyncfunc, 'index': this.nextIndex, 'data': data})
		++ this.nextIndex
		this._checkpending()
	}
	_checkpending() {
		if (this.active >= this.max) { return }
		if (this.pending.length == 0) { return }
		++ this.active
		let next = this.pending.shift()
		next.func(...next.data).then(x => {
			this.results[next.index - this.completedIndex] = { 'status': 'resolve', 'data': x }
		}).catch(x => {
			this.results[next.index - this.completedIndex] = { 'status': 'reject', 'data': x }
		}).finally(() => {
			-- this.active
			this._checkpending()
			if (next.index == this.completedIndex) {
				while(this.results[0] !== undefined) {
					let data = this.results.shift()
					this.completedIndex ++
					this.emit(data.status, data.data)
					this.emit('any', data)
					if (data.status == 'reject') {
						this.waiter.resolve = this.waiter.reject
					}
				}
				if (this.completedIndex == this.nextIndex) {
					this.completedIndex = 0
					this.nextIndex = 0
					this.waiter.resolve()
				}
			}
		})
	}
}

module.exports = Queue

