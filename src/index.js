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
        lastTime: '14:45'
      })
    }
    const room = JSON.parse(data)
    res.json({
      id: req.params.id,
      key: secrets.publicKey,
      participants: room.participants.map(p => p.name),
      lastTime: '14:45'
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
      data = `{"id":"${id}", "participants": [], "lastTime": "15:00"}`
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

app.put('/api/subscription/:id/call', (req, res) => {
  const id = req.params.id.replace(/[^a-z0-9]/gmi, '')
  const time = req.body.time

  if (!time.match(/^[0-9]{2}:[0-9]{2}$/)) {
    return res.status(400).end()
  }

  fs.readFile(`./data/${id}.json`, 'utf8', (err, data) => {
    if (err) {
      console.log(err)
      return res.status(204).end()
    }

    const room = JSON.parse(data)

    for (const p of room.participants) {
      console.log('Sending to ', p.name)
      webpush.sendNotification(p.sub, 'Time: ' + time).then(r => console.log(r)).catch(err => console.log(err))
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
