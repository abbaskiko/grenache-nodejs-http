'use strict'

const http = require('http')
const _ = require('lodash')
const Base = require('grenache-nodejs-base')

class TransportRPCClient extends Base.TransportRPCClient {

  constructor(client, conf) {
    super(client, conf)

    this._httpKeepAliveAgent = new http.Agent({
      keepAlive: true
    })

    this.init()
  }

  request(key, payload, opts, cb) {
    this._request(key, payload, opts, cb)
  }

  sendRequest(req) {
    const dest = `http://${this.conf.dest}`
    const [host, port] = this.conf.dest.split(':')

    const postData = this.format([req.rid, req.key, req.payload])

    this.post({
      hostname: host,
      port: port,
      timeout: req.opts.timeout,
    }, postData, (err, body) => {
      if (err) {
        this.handleReply(req.rid, 'ERR_REQUEST_GENERIC')
        return
      }

      const data = this.parse(body)

      if (!data) {
        this.handleReply(req.rid, 'ERR_REPLY_EMPTY')
        return
      }

      const [rid, res] = [data[0], data[1]]
      this.handleReply(rid, res)
    })
  }

  post(_opts, postData, _cb) {
    const opts = _.extend({
      path: '/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, _opts)

    let isExecuted = false

    const cb = (err, body) => {
      if (isExecuted) return
      isExecuted = true
      _cb(err, body)
    }

    const req = http.request(opts, (res) => {
      let body = []

      res.on('data', (chunk) => {
        body.push(chunk)
      })
      res.on('end', () => {
        body = body.join('')
        cb(null, body)
      })
    })

    req.on('error', (e) => {
      cb(e)
    })
    
    req.write(postData)
    req.end()
  }
}

module.exports = TransportRPCClient
