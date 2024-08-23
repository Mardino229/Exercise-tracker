const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const mongoose = require('mongoose')
const bodyParser = require('body-parser')
const user = require('./model/user')
const exercise = require('./model/exercise')

mongoose.connect(process.env.MONGODB_URI, {useNewUrlParser: true, useUnifiedTopology: true})
    .then(r =>{
      console.log("Connected to the database");
    })
    .catch(err=>{
      console.log("Error connecting to the database");
    })


app.use(bodyParser.urlencoded({ extended: "false" }));
app.use(bodyParser.json())
app.use(cors())
app.use(express.static('public'))

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.get('/api/users', (req, res) => {
  user.find({}, {__v:0})
      .then(students => res.status(200).send(students))
      .catch(error => res.status(400).json({ error }));
})

app.post('/api/users', (req, res) => {
    console.log(req.body)
    new user({...req.body}).save().then(result => {
        res.json({_id: result._id, username: result.username})
    }).catch(error => {
        res.json({error: error, status: error.status || 500})
    })
})
app.post('/api/users/:_id/exercises', (req, res) => {
    const dateString = req.body.date
    if (dateString === ""){
        req.body.date = new Date().toDateString();
    } else {
        req.body.date = new Date(dateString).toDateString();
        if (req.body.date === "Invalid Date"){
            req.body.date = new Date().toDateString();
        }
    }
    user.findOne({_id: req.params._id}).then((user) => {
        new exercise({...req.body, user_id: req.params._id}).save().then(result => {
                res.json({
                    _id: user._id,
                    username: user.username,
                    date :result.date,
                    duration: result.duration,
                    description: result.description})
            }).catch(error => {
                res.json({error: error, status: error.status || 500})
            })
        }).catch(error => {
            res.json({error: error, status: error.status || 500})
        })
})

app.get('/api/users/:_id/logs', (req, res) => {
    const fromDate = req.query.from ? new Date(req.query.from) : null;
    const toDate = req.query.to ? new Date(req.query.to) : null;

    const query = {user_id: req.params._id,
        $expr: {
            $and: []
        }
    }

    if (fromDate) {
        query.$expr.$and.push({ $gte: [{ $dateFromString: { dateString: "$date" } }, fromDate] });
    }

    if (toDate) {
        query.$expr.$and.push({ $lte: [{ $dateFromString: { dateString: "$date" } }, toDate] });
    }
    exercise.find(query, { _id: 0, date: 1, duration: 1, description: 1 })
        .limit(req.query.limit)
        .then((exercises) => {
            user.findOne({_id: req.params._id}).then((user) => {
                console.log({
                    username: user.username,
                    count: exercises.length,
                    _id: req.params._id,
                    log: exercises
                })
                res.json({
                    username: user.username,
                    count: exercises.length,
                    _id: req.params._id,
                    log: exercises
                })
            })
                .catch(err => {
                    res.json({error: err, status:err.status||500})
                })
        })
        .catch(err => {
            res.json({error: err, status:err.status||500})
        })
})


app.delete('/api/users/:_id/logs', (req, res) => {
    exercise.deleteMany({user_id: req.params._id}).then(() => {
        res.json().status(200)
    })
})


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
