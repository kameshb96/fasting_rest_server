const express = require('express');
const bodyParser = require('body-parser')
const app = express();
const MongoClient = require('mongodb').MongoClient
const url = 'mongodb://127.0.0.1:27017'
app.use(bodyParser.json())
app.use(express.static('public'))
app.set('view engine', 'ejs')

app.use(bodyParser.urlencoded({ extended: true }))
var quotes;
var db;
app.get("/", function (req, res) {
    // console.log(req);
    // console.log(res);
    console.log("Hello world")
    quotes = db.collection('quotes').find().toArray((err, result) => {
        if (err) return console.log(err)
        res.render('index.ejs', { quotes: result })
    });
    // res.sendFile(__dirname + '/index.html')
})

app.post('/quotes', (req, res) => {
    var obj = {
        name: req.body.name.trim(),
        quote: req.body.quote.trim()
    }
    console.log(req.body)
    db.collection('quotes').insertOne(obj, (err, result) => {
        if (err) return console.log(err)

        console.log('saved to database')
        res.redirect('/')
    })
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
    if(req.body.username == undefined || req.body.username == "") {
        err.meta.message = "Username not entered. Please enter a user name."
        res.status(400).send(err)
        return;
    }

    if(req.body.password == undefined || req.body.password == "") {
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

app.put('/quotes', (req, res) => {
    // Handle put request
    db.collection('quotes')
        .findOneAndUpdate({ name: 'Yoda' }, {
            $set: {
                name: req.body.name,
                quote: req.body.quote
            }
        }, {
            sort: { _id: -1 },
            upsert: true
        }, (err, result) => {
            if (err) return res.send(err)
            res.send(result)
        })
})

app.delete('/quote', (req, res) => {
    db.collection('quotes').findOneAndDelete({ name: req.body.name },
        (err, result) => {
            if (err) return res.send(500, err)
            console.log(result)
            res.send({ message: 'Darth vader quote deleted' })
        })
})

app.delete('/quotes', (req, res) => {
    db.collection('quotes').remove({ name: req.body.name },
        (err, result) => {
            if (err) return res.send(500, err)
            console.log(result)
            res.status(200).send({ message: 'All Vader quotes removed' })
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