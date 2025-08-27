const express = require("express");
const app = express();
const session = require("express-session");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcrypt");

app.set("view engine", "pug");
app.set("views", "./views");

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }))
app.use(cookieParser());
app.use(session({
    secret: "sample-secret",
    resave: false,
    saveUninitialized: false
}));
app.use(express.static("public"))

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
    res.render("main-page", { user: req.session.user });
})

app.get("register", function (req, res) {
    res.render("register-page");
})

app.post("/api/register", async function (req, res) {
    const usersDatabase = await readUsersDB();
    if (usersDatabase.find((user) => user.email === req.body.email)) {
        res.json({ message: "This email has been taken." });
    }
    else if (req.body.password !== req.body.passwordAgain) {
        res.json({ message: "Passwords do not match!" });
    }
    else {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        const newUser = {
            id: uuidv4(),
            name: req.body.name,
            surname: req.body.surname,
            email: req.body.email,
            password: hashedPassword,
            authenticationLevel: 0,
            postedNews: [],
            comments: [],
            isLoggedIn: false
        }
        usersDatabase.push(newUser);
        writeUsersDB(usersDatabase);
        return res.render("main-page", { user: req.session.user, message: "Your account has been created successfully." });
    }
})

app.get("/login", function (req, res) {
    res.render("login-page");
})

app.post("/api/login", async function (req, res) {
    const userDatabase = readUsersDB();
    const userIndex = userDatabase.findIndex(function (user) { return user.email === req.body.email });
    if (userIndex !== -1) {
        let user = userDatabase[userIndex];
        const comparePassword = await bcrypt.compare(req.body.password, user.password)
        if (!comparePassword) {
            return res.send("Password is wrong!");
        }
        else {
            user.isLoggedIn = true;
            writeUsersDB(userDatabase);
            req.session.user = {
                id: user.id, email: user.email, name: user.name, surname: user.surname, authenticationLevel: user.authenticationLevel,
                postedNews: user.postedNews, comments: user.comments, isLoggedIn: true
            };
            req.session.save(() => {
                return res.render("main-page", {
                    user: req.session.user
                });
            });
        }
    }
    else {
        return res.send("This account is not available.");
    }
})

app.get("/upload", function (req, res) {
    res.render("new-page", { user: req.session.user });
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
            category: req.body.category,
            comments: [],
            views: 0,
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
    res.render("main-page", { user: null, message: "You have logged out successfully." });
})


app.get("/api/currentUser", function (req, res) {
    if (req.session.user !== undefined) {
        const userDatabase = readUsersDB();
        const user = userDatabase.find((user) => user.id === req.session.user.id);
        if (user) {
            return res.json({
                id: user.id, email: user.email, name: user.name, surname: user.surname, authenticationLevel: user.authenticationLevel,
                comments: user.comments, postedNews: user.postedNews, isLoggedIn: user.isLoggedIn
            });
        }
        return res.json(null);
    }
    return res.json(null);
})

app.get("/api/news/:id", function (req, res) {
    const newsDatabase = readNewsDB();
    const newsData = newsDatabase.find((news) => news.id === req.params.id);
    if (!newsData) {
        return res.status(404).json({ error: "News not found" });
    };
    res.json(newsData);
});

app.listen(3000);