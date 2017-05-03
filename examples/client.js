'use strict'

const _ = require('lodash')
const Base = require('grenache-nodejs-base')
const Peer = require('./../lib/PeerRPC')

const link = new Base.Link({
  grape: 'ws://127.0.0.1:30002'
})
link.start()

const client = new Peer(link, {})
client.init()

const reqs = 1000
let reps = 0

setTimeout(() => {
  const d1 = new Date()
  for (let i = 0; i < reqs; i++) {
    client.request('test', 'hello', { timeout: 10000 }, (err, data) => {
      //console.log(err, data)
      if (++reps === reqs) {
        const d2 = new Date()
        console.log(d2 - d1) 
      }
    })
  }
}, 2000)
  
setInterval(() => {
  link.get('e28910ea0adb94dd45ced75fbff3e135c01bc437', console.log) // request 'hello'
  link.get('malformed hash', console.log)
}, 2000)
