require('dotenv').config();

const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcrypt');
const saltRounds = 12;
const Joi = require('joi');

const port = process.env.PORT || 3000;
const app = express();

const expireTime = 1 * 60 * 60 * 1000;

const mongodb_host = process.env.MONGODB_HOST;
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_database = process.env.MONGODB_DATABASE;
const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET;
const node_session_secret = process.env.NODE_SESSION_SECRET;

var {database} = include('databaseConnection');

app.use(express.urlencoded({extended: false}));

var mongoStore = MongoStore.create({
	mongoUrl: `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/sessions`,
	crypto: {
		secret: mongodb_session_secret
	}
});

app.use(session({ 
    secret: node_session_secret,
	store: mongoStore,
	saveUninitialized: false, 
	resave: true
}
));

app.get('/', (req,res) => {
    if(req.session.user) {
        `
        <h1>Hello, ${req.session.user.name}!</h1>
        <button onclick="/members">Go to Members Area</button>
        <button onclick="/logout">Logout</button>
        `  
    } else {
        `
        <button onclick="/signup">Sign Up</button>
        <button onclick="/login">Log In</button>
        `
    }
});

app.get('/logout', (req,res) => {
    req.session.destroy();
    res.send('You are logged out, have a nice day!')
});

app.listen(PORT, () => {
    console.log('Server running on port ')
});