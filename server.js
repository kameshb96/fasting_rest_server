const express = require('express');
const bodyParser = require('body-parser')
const app = express();
var cors = require('cors');
let fetch = require('node-fetch');
const MongoClient = require('mongodb').MongoClient
const url = 'mongodb://127.0.0.1:27017'
app.use(bodyParser.json())
app.use(express.static('public'))
// app.set('view engine', 'ejs')
const uuid = require('uuid/v4')
app.use(bodyParser.urlencoded({ extended: true }))
app.use(cors())
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

app.get('/completedFasts', (req, res) => {
    let err = {
        meta: {
            status: false,
            message: ""
        }
    }
    let st = req.headers.sessiontoken
    if (st == undefined || st == "") {
        err.meta.message = "Please login again"
        res.status(403).send(err)
        return
    }
    db.collection('users').findOne({ sessionToken: st }, (error, result) => {
        if (error) {
            err.meta.message = error
            res.status(500).send(err)
            return
        }
        if (!result) {
            err.meta.message = "Invalid sessionToken"
            res.status(403).send(err)
            return
        }
        let id = result._id
        db.collection('completedFasts').find({ userId: id }).toArray((e, r) => {
            if (e) {
                err.meta.message = e
                res.status(500).send(err)
                return
            }
            err.meta.message = "Success"
            err.meta.status = true
            res.status(200).send(r)
        })
    })

})

app.get('/validateToken', (req, res) => {
    let st = req.headers.sessiontoken
    if (st == undefined || st == "") {
        res.status(403).send({})
        return
    }
    db.collection('users').findOne({ sessionToken: st }, (error, result) => {
        if (error) {
            res.status(500).send(error)
            return
        }
        console.log(result)
        if(!result) {
            res.status(403).send({})
        }
        else {
            res.status(200).send({})
        }
    })
})

app.post('/completedFast', (req, res) => {
    let err = {
        meta: {
            status: false,
            message: ""
        }
    }
    if (req.body.chosenFast == undefined || req.body.chosenFast == "") {
        err.meta.message = "No fast chosen. Please choose a fast."
        res.status(400).send(err)
        return
    }

    if (req.body.fastStartTime == undefined || req.body.fastStartTime == "") {
        err.meta.message = "No fastStartTime provided."
        res.status(400).send(err)
        return
    }
    var obj = {
        chosenFast: req.body.chosenFast,
        fastStartTime: req.body.fastStartTime
    }
    let st = req.headers.sessiontoken
    if (st == undefined || st == "") {
        err.meta.message = "Please login again"
        res.status(403).send(err)
        return
    }
    db.collection('users').findOne({ sessionToken: st }, (error, result) => {
        if (error) {
            err.meta.message = error
            res.status(500).send(err)
            return
        }
        console.log(result)
        if (result) {
            obj.userId = result._id
            db.collection('completedFasts').insertOne(obj, (error2, result2) => {
                if (error2) {
                    err.meta.message = error2
                    res.status(500).send(err)
                    return
                }
                console.log(result2.result)
                if (result2.result.ok) {
                    err.meta.message = "Succesfully entered completedFast"
                    err.meta.status = true
                    res.status(200).send(err)
                }
                else {
                    err.meta.message = "Entry failed"
                    err.meta.status = false
                    res.status(500).send(err)
                }
            })
        }
        else {
            err.meta.message = "Invalid sessionToken"
            res.status(403).send(err)
        }
    })
})

app.post('/fast', (req, res) => {
    let err = {
        meta: {
            status: false,
            message: ""
        }
    }
    if (req.body.title == undefined || req.body.title == "") {
        err.meta.message = "Please specify a title for the fast"
        res.status(400).send(err)
        return
    }

    if (req.body.duration == undefined) {
        err.meta.message = "No duration provided. Please provide a duration for the fast"
        res.status(400).send(err)
        return
    }

    var obj = {
        title: req.body.title,
        duration: req.body.duration,
        description: req.body.description ? req.body.description : "",
        isPredefined: false
    }

    let st = req.headers.sessiontoken
    if (st == undefined || st == "") {
        err.meta.message = "Please login again"
        res.status(403).send(err)
        return
    }

    db.collection('users').findOne({ sessionToken: st }, (error, result) => {
        if (error) {
            err.meta.message = error
            res.status(500).send(err)
            return
        }
        console.log(result)
        if (result) {
            obj.userId = result._id
            db.collection('Fasts').insertOne(obj, (error2, result2) => {
                if (error2) {
                    err.meta.message = error2
                    res.status(500).send(err)
                    return
                }
                console.log(result2.result)
                if (result2.result.ok) {
                    err.meta.message = "Succesfully entered Fast"
                    err.meta.status = true
                    res.status(200).send(err)
                }
                else {
                    err.meta.message = "Entry failed"
                    err.meta.status = false
                    res.status(500).send(err)
                }
            })
        }
        else {
            err.meta.message = "Invalid sessionToken"
            res.status(403).send(err)
        }
    })
})

app.get('/fasts', (req, res) => {
    let err = {
        meta: {
            status: false,
            message: ""
        }
    }
    let st = req.headers.sessiontoken
    if (st == undefined || st == "") {
        err.meta.message = "Please login again"
        res.status(403).send(err)
        return
    }
    db.collection('users').findOne({ sessionToken: st }, (error, result) => {
        if (error) {
            err.meta.message = error
            res.status(500).send(err)
            return
        }
        if (!result) {
            err.meta.message = "Invalid sessionToken"
            res.status(403).send(err)
            return
        }
        let id = result._id
        db.collection('Fasts').find({ userId: id }).toArray((e, r) => {
            if (e) {
                err.meta.message = e
                res.status(500).send(err)
                return
            }
            err.meta.message = "Success"
            err.meta.status = true
            err.data = {
                fasts: r
            }
            res.status(200).send(err)
        })
    })
})

app.delete('/fast', (req,  res) => {
    let err = {
        meta: {
            status: false,
            message: ""
        }
    }
    let st = req.headers.sessiontoken
    if (st == undefined || st == "") {
        err.meta.message = "Please login again"
        res.status(403).send(err)
        return
    }

    if (req.body.title == undefined || req.body.title == "") {
        err.meta.message = "Please specify a title for the fast"
        res.status(400).send(err)
        return
    }

    db.collection('users').findOne({ sessionToken: st }, (error, result) => {
        if (error) {
            err.meta.message = error
            res.status(500).send(err)
            return
        }
        if (!result) {
            err.meta.message = "Invalid sessionToken"
            res.status(403).send(err)
            return
        }
        let id = result._id
        db.collection('Fasts').deleteOne({ userId: id, title: req.body.title }, (e, r) => {
            if (e) {
                err.meta.message = e
                res.status(500).send(err)
                return
            }
            if(r.deletedCount > 0) {
                err.meta.message = "Success"
                err.meta.status = true
                res.status(200).send(err)
            }
            else {
                err.meta.message = "No fast found"
                err.meta.status = false
                res.status(404).send(err)
            }
        })
    })
})

app.post('/log', (req, res) => {
    let err = {
        meta: {
            status: false,
            message: ""
        }
    }
    if (req.body.date == undefined || req.body.date == "") {
        err.meta.message = "Please specify a date."
        res.status(400).send(err)
        return
    }

    if (req.body.time == undefined || req.body.time == "") {
        err.meta.message = "Please specify a time."
        res.status(400).send(err)
        return
    }

    if (req.body.food == undefined || req.body.food == "") {
        err.meta.message = "Please specify a food."
        res.status(400).send(err)
        return
    }

    if (req.body.qty == undefined || req.body.qty == "") {
        err.meta.message = "Please specify qty."
        res.status(400).send(err)
        return
    }

    var obj = {
        date: req.body.date,
        time: req.body.time,
        food: req.body.food,
        qty: req.body.qty
    }

    let st = req.headers.sessiontoken
    if (st == undefined || st == "") {
        err.meta.message = "Please login again"
        res.status(403).send(err)
        return
    }

    db.collection('users').findOne({ sessionToken: st }, (error, result) => {
        if (error) {
            err.meta.message = error
            res.status(500).send(err)
            return
        }
        console.log(result)
        if (result) {
            obj.userId = result._id
            db.collection('logs').insertOne(obj, (error2, result2) => {
                if (error2) {
                    err.meta.message = error2
                    res.status(500).send(err)
                    return
                }
                console.log(result2.result)
                if (result2.result.ok) {
                    err.meta.message = "Succesfully entered Log"
                    err.meta.status = true
                    res.status(200).send(err)
                }
                else {
                    err.meta.message = "Entry failed"
                    err.meta.status = false
                    res.status(500).send(err)
                }
            })
        }
        else {
            err.meta.message = "Invalid sessionToken"
            res.status(403).send(err)
        }
    })
})

app.get('/logs', (req, res) => {
    let err = {
        meta: {
            status: false,
            message: ""
        }
    }
    let st = req.headers.sessiontoken
    if (st == undefined || st == "") {
        err.meta.message = "Please login again"
        res.status(403).send(err)
        return
    }
    db.collection('users').findOne({ sessionToken: st }, (error, result) => {
        if (error) {
            err.meta.message = error
            res.status(500).send(err)
            return
        }
        if (!result) {
            err.meta.message = "Invalid sessionToken"
            res.status(403).send(err)
            return
        }
        let id = result._id
        db.collection('logs').find({ userId: id }).toArray((e, r) => {
            if (e) {
                err.meta.message = e
                res.status(500).send(err)
                return
            }
            err.meta.message = "Success"
            err.meta.status = true
            err.data = {
                logs: r
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
    if (st == undefined || st == "") {
        err.meta.message = "Please login again"
        res.status(403).send(err)
        return
    }
    db.collection('users').findOneAndUpdate({ sessionToken: st },
        {
            $set: {
                sessionToken: ""
            }
        },
        (error, result) => {
            if (error) {
                err.meta.message = error
                res.status(500).send(error)
                return
            }
            if (!result.lastErrorObject.updatedExisting) {
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
    if (req.body.chosenFast == undefined || req.body.chosenFast == "") {
        err.meta.message = "No fast chosen. Please choose a fast."
        res.status(400).send(err)
        return
    }

    if (req.body.fastStartTime == undefined || req.body.fastStartTime == "") {
        err.meta.message = "No fastStartTime provided."
        res.status(400).send(err)
        return
    }
    var obj = {
        chosenFast: req.body.chosenFast,
        fastStartTime: req.body.fastStartTime
    }
    let st = req.headers.sessiontoken
    if (st == undefined || st == "") {
        err.meta.message = "Please login again"
        res.status(403).send(err)
        return
    }
    db.collection('users').findOneAndUpdate({ sessionToken: st },
        {
            $set: {
                timerInfo: obj
            }
        },
        (error, result) => {
            if (error) {
                err.meta.message = error
                res.status(500).send(err)
                return
            }
            if (!result.lastErrorObject.updatedExisting) {
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

app.get('/search', (req, res) => {
    console.log(req.query)
    console.log(req.query.q)
    if(!req.query || !req.query.q) {
        res.send([])
        return
    }
    let tmp=`https://trackapi.nutritionix.com/v2/search/instant?query=${encodeURIComponent(req.query.q)}&common=false`
    console.log(tmp)
    fetch(tmp, {
        method: 'GET',
        headers: { 
            'Content-Type': 'application/json',
            'x-app-id': 'f6038e67',
            'x-app-key': '348bcbd07ddc7334af71c1eddefa65f9'
        }
        // body: JSON.stringify(b)
    }).then(response => {
        //console.log(response.json())
        response.json().then((r) => {
            // console.log(JSON.parse(r))
            //console.log(r)
            res.send(r)
        }, (e) => {
            console.log(e)
        })
        // res.send('fofa')
    }).catch(err => { console.log(err); });
})

// app.get('/search', (req, res) => {
//     console.log(req.query)
//     if(!req.query || !req.query.queue) {
//         res.send([])
//         return
//     }
//     let b = {
//         "appId":"f6038e67",
//         "appKey":"348bcbd07ddc7334af71c1eddefa65f9",  
//         "query":req.query.queue,
//         "fields":["item_name","brand_name","nf_calories","nf_serving_size_qty","nf_serving_size_unit","nf_protein"],
//         "sort":{
//           "field":"_score",
//           "order":"desc"
//         },
//         "filters":{
//           "item_type":2,
//           "nf_serving_size_unit": "g"
//         }
//       }
//     fetch('https://api.nutritionix.com/v1_1/search', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(b)
//     }).then(response => {
//         //console.log(response.json())
//         response.json().then((r) => {
//             // console.log(JSON.parse(r))
//             console.log(r)
//             console.log(r.hits[0].fields)
//             res.send(r)
//         }, (e) => {
//             console.log(e)
//         })
//         // res.send('fofa')
//     }).catch(err => { console.log(err); });
// })

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