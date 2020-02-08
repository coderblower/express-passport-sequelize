const express = require('express')
const bodyParser = require('body-parser')
const {config, engine} = require('express-edge')
const fs = require('fs')
const path = require('path')
const morgan = require('morgan')
const bcrypt = require('bcrypt')
const passport = require('passport')
const flash = require('express-flash')
const session = require('express-session')
const methodOverride = require('method-override')
const models = require('./models');
const env = require('dotenv').config().parsed
let port = env.port || 3000

const app = express()

// create a write stream (in append mode)
var accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'), { flags: 'a' })
 
// setup the logger
app.use(morgan('combined', { stream: accessLogStream }))

config({cache: process.env.NODE_ENV === "production"})
app.use(engine)
app.set('views', `${__dirname}/views`)
app.use(express.static('public'))

const initializePassport = require('./passport-config')
initializePassport(
  passport,
  models.User
)

let users = []


app.use(bodyParser.urlencoded({extended: true}))
app.use(bodyParser.json())

app.use(flash())
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}))
app.use(passport.initialize())
app.use(passport.session())
app.use(methodOverride('_method'))


app.get('/', checkAuthenticated, (req, res) => {
  res.render('index', { name: req.user.name })
})

app.get('/login', checkNotAuthenticated, (req, res) => {
  res.render('login')
})

app.post('/login', checkNotAuthenticated, passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/login',
  failureFlash: true
}))

app.get('/register', checkNotAuthenticated, (req, res) => {
  res.render('register')
})

app.post('/register', checkNotAuthenticated, async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10)
    await models.User.create({
      name: req.body.name,
      email: req.body.email,
      password: hashedPassword
    })
    res.redirect('/login')
  } catch(e) {
    console.log(e)
  }
})

app.delete('/logout', (req, res) => {
  req.logOut()
  res.redirect('/login')
})

function checkAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next()
  }

  res.redirect('/login')
}

function checkNotAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return res.redirect('/')
  }
  next()
}


models.sequelize
  .sync()
  .then(function() {
    console.log('Database Connected');

    app.listen(3000, function(err) {
      if (!err) console.log('Connected at http://localhost:3000');
      else console.log(err);
    });
  })
  .catch(function(err) {
    console.log(err, 'Error on Database Sync. Please try again!');
  });
