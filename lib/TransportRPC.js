'use strict'

const http = require('http')
const Base = require('grenache-nodejs-base')

class TransportRPC extends Base.TransportRPC {

  constructor(client, conf) {
    super(client, conf)

    this.init()
  }

  listen(port) {
    const socket = http.createServer()

    socket.on('request', (req, rep) => {
      let body = []
      
      req.on('data', (chunk) => {
        body.push(chunk)
      }).on('end', () => {
        body = Buffer.concat(body).toString()

        this.handleRequest({
          reply: (rid, res) => {
            this.sendReply(rep, rid, res)
          }
        }, this.parse(body))
      })
    }).listen(port)

    this.socket = socket
    this.port = port

    return this
  }

  request(key, payload, opts, cb) { 
    const req = this.newRequest(key, payload, opts, cb)
    this.sendRequest(req)
  }

  sendReply(rep, rid, res) {
    rep.write(this.format([rid, res]))
    rep.end()
  }

  post(host, port, data, _cb) {
    const options = {
      hostname: host,
      port: port,
      path: '/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }

    let isExecuted = false

    const cb = (err, body) => {
      if (isExecuted) return
      isExecuted = true
      _cb(err, body)
    }

    const req = http.request(options, (res) => {
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
    
    req.shouldKeepAlive = false

    req.write(data)
    req.end()
  }

  sendRequest(req) {
    const dest = `http://${this.conf.dest}`
    const [host, port] = this.conf.dest.split(':')
    const data = this.format([req.rid, req.key, req.payload])

    this.post(host, port, data, (err, body) => {
      if (err) {
        this.handleReply(req, 'ERR_REQUEST_GENERIC')
        return
      }

      const data = this.parse(body)

      if (!data) {
        this.handleReply(req, 'ERR_REPLY_EMPTY')
        return
      }

      const [rid, res] = [data[0], data[1]]
      this.handleReply(req, res)
    })
  }
}

module.exports = TransportRPC
