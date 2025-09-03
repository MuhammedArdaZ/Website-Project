const express = require("express");
const app = express();
const session = require("express-session");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcrypt");
const fetch = require("node-fetch").default;

app.set("view engine", "pug");
app.set("views", "./views");

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }))
app.use(cookieParser());
app.use(session({
    secret: "sample-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        maxAge: 60 * 60 * 1000 // 1 hour
    }
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
    let lastSixNews = readNewsDB().slice(-6).reverse();
    let isFirst = undefined;
    if(req.session.user && req.session.user.isFirstLogin){
        isFirst = true
        req.session.user.isFirstLogin = false;
    }
    res.render("main-page", {
        news: lastSixNews,
        user: req.session.user !== undefined ? req.session.user : undefined,
        isFirstLogin: isFirst !== undefined ? isFirst : undefined
    });
})

app.get("/register", function (req, res) {
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
            avatar: "/GuestAvatar.png",
            authenticationLevel: 0,
            isLoggedIn: false
        }
        usersDatabase.push(newUser);
        writeUsersDB(usersDatabase);
        return res.redirect("/");
    }
})

app.get("/login", function (req, res) {
    res.render("login-page");
})

app.post("/api/login", async function (req, res) {
    const userDatabase = readUsersDB();
    const userIndex = userDatabase.findIndex(function (user) { return user.email === req.body.email });
    if (userIndex === -1) {
        return res.send("This account is not available.");
    }

    let user = userDatabase[userIndex];
    const comparePassword = await bcrypt.compare(req.body.password, user.password)

    if (!comparePassword) {
        return res.send("Password is wrong!");
    }

    user.isLoggedIn = true;
    writeUsersDB(userDatabase);
    req.session.user = {
        id: user.id, email: user.email, name: user.name, surname: user.surname, avatar: user.avatar, authenticationLevel: user.authenticationLevel,
        postedNews: user.postedNews, comments: user.comments, isLoggedIn: true, isFirstLogin: true
    };
    req.session.save((err) => {
        if (err) {
            return res.send("Session save error.");
        }
        return res.redirect("/");
    });
})

app.get("/upload", function (req, res) {
    res.render("upload-new-page", { user: req.session.user });
})

app.post("/api/upload-news", async function (req, res) {
    if (req.session.user && req.session.user.authenticationLevel >= 1) {
        const url = req.body.image;

        let newsDatabase = await readNewsDB();
        const uploadNewData = {
            newsId: newsDatabase[newsDatabase.length - 1].newsId + 1,
            title: req.body.title.trim(),
            content: req.body.content.trim(),
            image: req.body.image,
            comments: [],
            views: 0,
            createdAt: new Date().toISOString(),
            authorId: req.session.user.id
        }
        newsDatabase.push(uploadNewData);
        writeNewsDB(newsDatabase);
        return res.redirect("/");
    }
    return res.json({ message: "You need to login before upload any news." });
})


app.post("/api/logout", function (req, res) {
    if (req.session.user) {
        const userDatabase = readUsersDB();
        const userIndex = userDatabase.findIndex(user => user.id === req.session.user.id);
        if (userIndex === -1) {
            return res.send("User not found.");
        }
        userDatabase[userIndex].isLoggedIn = false;
        writeUsersDB(userDatabase);
        req.session.destroy();
    }
    res.redirect("/");
})


app.get("/news", async function (req, res) {
    const newsDatabase = await readNewsDB();
    res.json(newsDatabase);
});

app.get("/news/:newsId", function (req, res) {
    const newsDatabase = readNewsDB();
    const newsIndex = newsDatabase.findIndex((news) => news.newsId == req.params.newsId);
    if (newsIndex === -1) {
        return res.status(404).json({ error: "News not found" });
    };
    newsDatabase[newsIndex].views += 1;
    writeNewsDB(newsDatabase);

    const newsData = newsDatabase[newsIndex];
    const userDatabase = readUsersDB();
    newsData.comments = newsData.comments.map(comment => {
        const commentUser = userDatabase.find(commentU => commentU.id === comment.userId);

        comment.commentReply.forEach(reply => {
            const replyUser = userDatabase.find(replyU => replyU.id === reply.userId);
            reply.replyUser = { avatar: replyUser.avatar, name: replyUser.name, surname: replyUser.surname };
        });

        return { ...comment, commentAvatar: commentUser.avatar, commentName: commentUser.name, commentSurname: commentUser.surname };
    });
    return res.render("new-page", { newsData: newsData, user: req.session.user || undefined });
});

app.post("/api/news/:newsId/addComment/", function (req, res) {
    const newsID = parseInt(req.params.newsId);
    if (req.session.user === undefined || !req.session.user.isLoggedIn) {
        return res.render("login-page");
    }

    const newsDatabase = readNewsDB();
    const usersDatabase = readUsersDB();
    const newsIndex = newsDatabase.findIndex((news) => news.newsId === newsID);
    const userIndex = usersDatabase.findIndex((user) => user.id === req.session.user.id);
    if (newsIndex === -1) {
        return res.status(404).json({ error: "News not found" });
    }
    if (userIndex === -1) {
        return res.status(404).json({ error: "User not found" });
    }
    const newComment = {
        commentId: uuidv4(),
        commentText: String(req.body.commentText).trim(),
        commentReply: [],
        createdAt: new Date().toISOString(),
        userId: req.session.user.id,
    };
    newsDatabase[newsIndex].comments.push(newComment);
    writeNewsDB(newsDatabase);
    writeUsersDB(usersDatabase);
    return res.redirect("/news/" + newsID);
});

app.post("/api/news/:newsId/addCommentReply", function (req, res) {
    if (req.session.user === undefined || !req.session.user.isLoggedIn) {
        return res.render("login-page");
    }
    const newsID = parseInt(req.params.newsId);
    const commentId = req.body.commentId;

    const newsDatabase = readNewsDB();
    const newsIndex = newsDatabase.findIndex((news) => news.newsId === newsID);
    if (newsIndex === -1) {
        return res.status(404).json({ error: "News not found" });
    }
    let newsData = newsDatabase[newsIndex]

    const commentIndex = newsData.comments.findIndex((comment) => comment.commentId === commentId);
    if (commentIndex === -1) {
        return res.status(404).json({ error: "Comment not found" });
    }
    const newReply = {
        replyId: uuidv4(),
        replyText: String(req.body.replyText).trim(),
        createdAt: new Date().toISOString(),
        userId: req.session.user.id,
    };
    newsData.comments[commentIndex].commentReply.push(newReply);
    writeNewsDB(newsDatabase);
    return res.redirect("/news/" + newsID);
});


app.get("/user/profile", function (req, res) {
    const user = req.session.user;
    const newsDatabase = readNewsDB();
    let allComments = [];
    newsDatabase.forEach((news) => {
        news.comments.forEach((comment) => {
            if (comment.userId === user.id) {
                allComments.push({
                    newsId: news.newsId,
                    commentText: comment.commentText,
                    createdAt: comment.createdAt
                });
            }
        });
    });
    return res.render("profile-page", { user: user, comments: allComments });
});

app.listen(3000);