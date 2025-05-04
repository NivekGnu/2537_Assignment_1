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

var {database} = require('./databaseConnection');

const userCollection = database.db(mongodb_database).collection('users');

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
        res.send(`
        <h1>Hello, ${req.session.user.name}!</h1>

        <form action="/members" method="get">
            <button>Go to Members Area</button>
        </form>

        <form action="/logout" method="get">
            <button>Log Out</button>
        </form>
        `);
        
    } else {
        res.send(`
        <form action="/signup" method="get">
            <button>Sign Up</button>
        </form>

        <form action="/login" method="get">
            <button>Log In</button>
        </form>
        `);
    }
});

app.get('/signup', (req,res) => {
    res.send(`
        Create a new user
        <form action='/signupSubmit' method='post'>
            <input name='name' type='text' placeholder='name'>
            <input name='email' type='email' placeholder='Email'>
            <input name='password' type='password' placeholder='Password'>
            <button>Sign Up</button>
        </form>
    `);
});

app.post('/signupSubmit', async (req,res) => {
    const {name, email, password} = req.body;

    if (!name) {
        res.send(`
            <p>Name can not be empty</p>
            <a href="/signup">Try Again</a>
        `);
        return;
    }

    if (!email) {
        res.send(`
            <p>Email can not be empty</p>
            <a href="/signup">Try Again</a>
        `);
        return;
    }

    if (!password) {
        res.send(`
            <p>Password can not be empty</p>
            <a href="/signup">Try Again</a>
        `);
        return;
    }

    const schema = Joi.object(
    {
            name: Joi.string().alphanum().max(30).required(),
            email:  Joi.string().email().required(),
            password: Joi.string().max(30).required()
    });

    const validationResult = schema.validate(req.body);

    if(validationResult.error) {
        res.redirect('/signup');
        return;
    }

    var hashedPassword = await bcrypt.hash(req.body.password, saltRounds);

    await userCollection.insertOne({
        name: name,
        email: email,
        password: hashedPassword
        });

    console.log('User successfully created');

    req.session.user = {
        name: name,
        email: email
    }

    res.redirect('/members');
});

app.get('/login', (req,res) => {
    res.send(`
        <form action='/loginSubmit' method='post'>
            <input name='email' type='email' placeholder='Email'>
            <input name='password' type='password' placeholder='Password'>
            <button>Log In</button>
        </form>
    `);
});

app.post('/loginSubmit', async (req,res) => {
    var email = req.body.email;
    var password = req.body.password;

    const schema = Joi.string().email().required();
    const validateEmail = schema.validate(email);

    if(validateEmail.error != null) {
        res.send(`
            <p>Invalid Email</p>
            <a href='/login>Try Again</a>
        `)
    }

    const result = await userCollection.find({email: email})
                                       .project({name: 1, email: 1, password: 1, _id: 1})
                                       .toArray();

    if (result.length != 1) {
        res.send(`
            <p>User not found</p>
            <a href='/login'>Try Again</a>    
        `)
    }    
    
    if (await bcrypt.compare(password, result[0].password)) {
		console.log("correct password");
		
        req.session.user = {
            name: result[0].name,
            email: result[0].email
        }

		res.redirect('/members');
		return;
	} else {
		console.log("incorrect password");
		res.redirect("/login");
		return;
	}
});

app.get('/members', (req,res) => {
    res.send(`
        <p>Welcome!</p>
        <a href='/logout'>Log Out</a>
    `);
 
});

app.get('/logout', (req,res) => {
    req.session.destroy();
    res.send(`
        <p>You are logged out, have a nice day!</p>
        <a href='/login'>Log in again</a>
        `);
});

app.listen(port, () => {
    console.log('Server running on port ' + port)
});