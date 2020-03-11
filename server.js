const express = require('express');
const bodyParser = require('body-parser')
const app = express();
const MongoClient = require('mongodb').MongoClient
const url = 'mongodb://127.0.0.1:27017'
app.use(bodyParser.json())
app.use(express.static('public'))
app.set('view engine', 'ejs')
const uuid = require('uuid/v4')
app.use(bodyParser.urlencoded({ extended: true }))
var quotes;
var db;
app.get("/", function (req, res) {
    // console.log(req);
    // console.log(res);
    console.log("Hello world")
    res.send("Welcome to fasting backend")
    // res.sendFile(__dirname + '/index.html')
})

app.post('/register', (req, res) => {
    let err = {
        meta: {
            status: false,
            message: "Invalid Username"
        }
    }
    console.log(req.body)
    console.log(req.body.password)
    if (req.body.username == undefined || req.body.username == "") {
        err.meta.message = "Username not entered. Please enter a user name."
        res.status(400).send(err)
        return;
    }

    if (req.body.password == undefined || req.body.password == "") {
        err.meta.message = "Password Field is Empty. Please enter a password."
        res.status(400).send(err)
        return;
    }
    var obj = {
        username: req.body.username.trim(),
        password: req.body.password
    }
    if (!validateEmail(obj.username)) {
        res.status(400).send(err)
        return;
    }
    db.collection('users').find({ username: obj.username }).toArray((error, result) => {
        if (error) {
            err.meta.message = error
            res.status(500).send(err)
            return;
        }
        if (result.length > 0) {
            err.meta.message = "User Already Exists"
            res.status(409).send(err)
            return;
        }

        db.collection('users').insertOne(obj, (e, r) => {
            if (e) {
                err.meta.message = e
                res.status(500).send(err)
                return;
            }
            err.meta.message = "Succesfully Inserted"
            err.meta.status = true
            res.status(200).send(err)
        })

    })
})

app.post('/login', (req, res) => {
    let err = {
        meta: {
            status: false,
            message: "Invalid Username"
        }
    }
    console.log(req.body)
    console.log(req.body.password)
    if (req.body.username == undefined || req.body.username == "") {
        err.meta.message = "Username not entered. Please enter a user name."
        res.status(400).send(err)
        return;
    }

    if (req.body.password == undefined || req.body.password == "") {
        err.meta.message = "Password Field is Empty. Please enter a password."
        res.status(400).send(err)
        return;
    }
    var obj = {
        username: req.body.username.trim(),
        password: req.body.password
    }

    db.collection('users').findOne({ username: obj.username, password: obj.password },
        (error, result) => {
            if (error) {
                err.meta.message = error
                res.status(500).send(err)
                return;
            }
            if (!result) {
                err.meta.message = "Invalid Username or Password"
                res.status(401).send(err)
                return
            }
            let uid = uuid()
            db.collection('users').update({ username: obj.username },
                {
                    $set: {
                        sessionToken: uid
                    }
                }, { upsert: true }, (e, r) => {
                    if (e) {
                        err.meta.message = e
                        res.status(500).send(err)
                    }
                    err.meta.status = true
                    err.meta.message = "Succesful Login"
                    err.data = {
                        sessionToken: uid
                    }
                    res.status(200).send(err)
                })
        })
})



app.put('/logout', (req, res) => {
    let err = {
        meta: {
            status: false,
            message: ""
        }
    }
    let st = req.headers.sessiontoken
    if(st == undefined || st == "") {
        err.meta.message = "Please login again"
        res.status(403).send(err)
        return
    }
    db.collection('users').findOneAndUpdate({sessionToken:st},
        {
            $set: {
                sessionToken: ""
            }
        },
        (error, result) => {
            if(error) {
                err.meta.message = error
                res.status(500).send(error)
                return
            }
            if(!result.lastErrorObject.updatedExisting) {
                err.meta.message = "Invalid sessionToken"
                res.status(403).send(err)
                return
            }
            console.log("RESULT:", result)
            err.meta.status = true
            err.meta.message = "Sucessfully Logged Out"
            res.status(200).send(err)
            
        })
})

app.put('/timerinfo', (req, res) => {
    //console.log(req.headers.sessiontoken)
    //console.log(req.headers)
    let err = {
        meta: {
            status: false,
            message: ""
        }
    }
    //req.body is obj. obj two fields: chosenFast and fastStartTime
    if(req.body.chosenFast == undefined || req.body.chosenFast == "") {
        err.meta.message = "No fast chosen. Please choose a fast."
        res.status(400).send(err)
        return
    }

    if(req.body.fastStartTime == undefined || req.body.fastStartTime == "") {
        err.meta.message = "No fastStartTime provided."
        res.status(400).send(err)
        return
    }
    var obj = {
        chosenFast: req.body.chosenFast,
        fastStartTime: req.body.fastStartTime
    }
    let st = req.headers.sessiontoken
    if(st == undefined || st == "") {
        err.meta.message = "Please login again"
        res.status(403).send(err)
        return
    }
    db.collection('users').findOneAndUpdate({sessionToken: st}, 
        {
            $set:{
                timerInfo: obj
            }
        },
        (error, result) => {
            if(error) {
                err.meta.message = error
                res.status(500).send(err)
                return
            }
            if(!result.lastErrorObject.updatedExisting) {
                err.meta.message = "Invalid sessionToken"
                res.status(403).send(err)
                return
            }
            console.log("RESULT:", result)
            err.meta.status = true
            err.meta.message = "TimerInfo updated"
            res.status(200).send(err)
        })
})

MongoClient.connect(url, { useNewUrlParser: true }, (err, client) => {
    // ... do something here
    if (err) return console.log(err);
    db = client.db('fastingdb')
    db.collection('users').update({ username: "admin@mail.com" }, {
        $set:
            { username: "admin@mail.com", password: "test", timerInfo: {} }
    },
        { upsert: true, multi: true }).then(r => {
            console.log(db)
            app.listen(3500, function () {
                console.log('listening on 3500')
            });
        })
})

function validateEmail(email) {
    var re = /\S+@\S+\.\S+/;
    return re.test(email);
}

// MongoClient.connect('mongodb+srv://kameshb:kamkes5961@cluster0-l1p9l.mongodb.net/test?retryWrites=true&w=majority', (err, client) => {
//     // ... do something here
//     if (err) return console.log(err);
//     db = client.db('testdemo');
//     app.listen(3500, function () {
//         console.log('listening on 3500')
//     });
// })