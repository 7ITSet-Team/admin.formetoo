const express = require('express')
const MongoClient = require('mongodb').MongoClient
const bodyParser = require("body-parser")
const cors = require('cors')
const app = express()

const url = require('./constants/constants').url
const routes = require('./config/routes/index')

app.use(cors())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({
    extended: true
}))


MongoClient.connect(url, (err, client) => {
    if (err) throw err

    routes(app, client)

    app.listen(3001, () => {
        console.log('Example app listening on port 3001!');
    })
})