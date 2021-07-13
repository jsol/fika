const express = require('express')
const app = express()
const path = require('path')
const http = require('http').createServer(app)
const names = require('./names.json')
const fs = require('fs')
const bodyParser = require('body-parser')
const morgan = require('morgan')
const uuid = require('uuid')
const webpush = require('web-push');

const secrets = JSON.parse(fs.readFileSync(process.env.KEY_FILE, 'utf8'))

//webpush.setGCMAPIKey('<Your GCM API Key Here>');
webpush.setVapidDetails(
  'mailto:jens@rootsy.nu',
  secrets.publicKey,
  secrets.privateKey
);


app.use(bodyParser.json())
app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, '..', 'html')))

app.get('/api/newid', (req, res) => {
  res.json({ id: getRandomName() })
})

app.get('/api/details/:id', (req, res) => {
  const id = req.params.id.replace(/[^a-z0-9]/gmi, '')
  fs.readFile(`./data/${id}.json`, 'utf8', (err, data) => {
    if (err) {
      return res.json({
        id: req.params.id,
        key: secrets.publicKey,
        participants: [],
        times: [],
        lastTime: '14:45'
      })
    }
    const room = JSON.parse(data)
    res.json({
      id: req.params.id,
      key: secrets.publicKey,
      participants: room.participants.map(p => p.name),
      times: room.times,
      lastTime: room.lastTime
    })
  })
})

app.post('/api/subscription/:id', (req, res) => {
  const id = req.params.id.replace(/[^a-z0-9]/gmi, '')
  const name = req.body.name.replace(/[^a-z0-9]/gmi, ' ').replace(/\s+/g, ' ')
  const sub = req.body.sub
  if (id !== req.params.id) {
    // someone done funky stuff to the id, we want none of that
    return res.status(400).end()
  }

  fs.readFile(`./data/${id}.json`, 'utf8', (err, data) => {
    if (err) {
      console.log(err)
      data = `{"id":"${id}", "participants": [], "times":[], "lastTime": "15:00"}`
    }

    const room = JSON.parse(data)
    const participant = {
      id: uuid.v4(),
      name: name,
      sub: sub
    }
    room.participants.push(participant)
    fs.writeFile(`./data/${id}.json`, JSON.stringify(room), err => {
      if (err) {
        return res.status(500).end()
      }
      return res.json(participant).end()
    })
  })
})


function getTime(time) {
  const timestamp = new Date()
  timestamp.setMilliseconds(0)
  timestamp.setSeconds(0)
  const ts = time.split(':')
  timestamp.setHours(ts[0])
  timestamp.setMinutes(ts[1])

  if (timestamp < Date.now()) {
    // setDate fixes end-of-month, 32/7 => 1/8 etc.
    timestamp.setDate(timestamp.getDate() + 1)
  }
  return timestamp
}

function getCleanTimeList(list) {
  if (!list || list.length === 0) {
    return []
  }
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 3)

  return list.map(t => t.timestamp >= cutoff ? t : null).filter(t => t != null)
}

app.put('/api/calls/:roomid/:callid', (req, res) => {
  const roomid = req.params.roomid.replace(/[^a-z0-9]/gmi, '')

  if (req.body.answer !== 'yes' && req.body.answer !== 'no') {
    return res.status(400).end()
  }

  fs.readFile(`./data/${roomid}.json`, 'utf8', (err, data) => {
    if (err) {
      console.log(err)
      return res.status(400).end()
    }

    const room = JSON.parse(data)
    const call = room.times.find(t => (t.id === req.params.callid))

    if (!call) {
      return res.status(400).end()
    }
    const user = room.participants.find(u => u.id === req.body.uuid)
    if (!user) {
      return res.status(400).end()
    }

    call.participants.push({name: user.name, answer: req.body.answer})
    fs.writeFile(`./data/${roomid}.json`, JSON.stringify(room), err => {
      if (err) {
        console.log(err)
        return res.status(500).end()
      }
      return res.status(204).end()
    })
  })
})

app.put('/api/subscription/:id/call', (req, res) => {
  const id = req.params.id.replace(/[^a-z0-9]/gmi, '')
  const time = req.body.time

  if (!time.match(/^[0-9]{2}:[0-9]{2}$/)) {
    return res.status(400).end()
  }

  const callid = uuid.v4()

  const timestamp = getTime(time)

  const callDetails = {
    id: callid,
    time: time,
    timestamp: +timestamp,
    participants: [],
    room: id
  }

  fs.readFile(`./data/${id}.json`, 'utf8', (err, data) => {
    if (err) {
      console.log(err)
      return res.status(204).end()
    }

    const room = JSON.parse(data)

    room.times = getCleanTimeList(room.times)
    room.times.push(callDetails)
    room.lastTime = time

    fs.writeFile(`./data/${id}.json`, JSON.stringify(room), err => {
      if (err) {
        console.log(err)
      }
    })

    const sendData = JSON.parse(JSON.stringify(callDetails))

    for (const p of room.participants) {
      console.log('Sending to ', p.name)
      sendData.uuid = p.id
      webpush.sendNotification(p.sub, JSON.stringify(sendData))
        .then(r => console.log(r))
        .catch(err => console.log(err))
    }
  })
})

app.delete('/api/subscription/:id', (req, res) => {

})

http.listen(process.env.PORT)

function getRandomName() {
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1)
  const rand = a => a[Math.floor(Math.random() * a.length)]

  return `${cap(rand(names[0]))}${cap(rand(names[1]))}`
}
