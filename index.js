var express = require("express");
var app = express();
var session = require("express-session");
var bodyParser = require("body-parser");
var cookieParser = require("cookie-parser");
var fs = require("fs");
var { v4: uuidv4 } = require("uuid");
var bcrypt = require('bcrypt');
const { error } = require("console");

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }))
app.use(cookieParser());
app.use(session({
    secret: "sample-secret",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 60 * 60 * 1000 } // 1 hour
}));

app.use(express.static("public"));

function readNewsDB() {
    return JSON.parse(fs.readFileSync(("newsDB.json")));
}
function writeNewsDB(data) {
    fs.writeFileSync("newsDB.json", JSON.stringify(data, null, 4));
}
function readUsersDB() {
    return JSON.parse(fs.readFileSync(("usersDB.json")));
}
function writeUsersDB(data) {
    fs.writeFileSync("usersDB.json", JSON.stringify(data, null, 4));
}


app.get("/", function (req, res) {
    res.sendFile(__dirname + "/public/main-page.html");
})

//
app.get("/api/register", (req, res) => {
    res.send("Register sayfası sadece POST ile çalışır.");
});


app.post("/api/register", async function (req, res) {
    let usersDatabase = await readUsersDB();

    const hashedPassword = await bcrypt.hash(req.body.password, 10);

    if (usersDatabase.find((user) => user.email === req.body.email)) {
        res.json({ message: "This email has been taken." });
    }
    else if (req.body.password !== req.body.passwordAgain) {
        res.json({ message: "Passwords do not match!" });
    }
    else {
        const newUser = {
            id: uuidv4(),
            name: req.body.name,
            surname: req.body.surname,
            email: req.body.email,
            password: hashedPassword,
            authenticationLevel: 0,
            isLoggedIn: false
        }

        usersDatabase.push(newUser);
        writeUsersDB(usersDatabase);
        res.redirect("/");
    }
})

app.post("/api/login", async function (req, res) {
    const userDatabase = readUsersDB();
    const user = userDatabase.find(function (user) { return user.email === req.body.email });

    if (user) {

        const isMatch = await bcrypt.compare(req.body.password, user.password);

        if (isMatch == false) {
            return res.send('Wrong password!');
        }

        else {
            const userIndex = userDatabase.findIndex(u => u.email === req.body.email);
            userDatabase[userIndex].isLoggedIn = true; // Veritabanında güncelle
            writeUsersDB(userDatabase);

            req.session.user = {
                id: user.id, email: user.email, name: user.name, surname: user.surname,
                authenticationLevel: user.authenticationLevel, isLoggedIn: user.isLoggedIn
            };
            req.session.user.isLoggedIn = true;
            req.session.save();

            return res.redirect("/");
        }
    }

    else {
        return res.send("This account is not available.");
    }
})

app.post("/api/upload-new", async function (req, res) {
    if (req.session.user && req.session.user.authenticationLevel >= 1) {
        const url = req.body.image;
        request({
            url: url,
            encoding: null
        })

        const uploadNewData = {
            id: uuidv4(),
            title: req.body.title,
            content: req.body.content,
            image: req.body.image,
            createdAt: new Date().toISOString(),
            author: req.session.user.id
        }

        let newsDatabase = await readNewsDB();
        newsDatabase.push(uploadNewData);
        writeNewsDB(newsDatabase);
        return res.json({ message: "New uploaded succesfully." });
    }
    else
        return res.json({ message: "You need to login before upload any news." });
})

app.post("/api/logout", function (req, res) {
    if (req.session.user) {
        const userDatabase = readUsersDB();
        const userIndex = userDatabase.findIndex(user => user.id === req.session.user.id);
        if (userIndex !== -1) {
            userDatabase[userIndex].isLoggedIn = false;
            writeUsersDB(userDatabase);
        }
        req.session.destroy();
    }
    res.redirect("/");
});

app.get("/api/currentUser", function (req, res) {
    if (req.session.user) {
        const userDatabase = readUsersDB();
        const user = userDatabase.find((user) => user.id === req.session.user.id);

        if (user) {
            return res.json({
                id: user.id, email: user.email, name: user.name, surname: user.surname,
                authenticationLevel: user.authenticationLevel, isLoggedIn: user.isLoggedIn
            });
        }
        return res.json(null);
    }
    return res.json(null);
})

app.listen(3000);