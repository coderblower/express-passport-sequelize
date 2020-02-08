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

require('./controllers/routes')(app, passport,  models.User, bcrypt)

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
