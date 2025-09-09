import express from "express";
import session from "express-session";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcrypt";
import crypto from "crypto";
import dotenv from "dotenv";
dotenv.config();
import User from "./models/User.js";
import News from "./models/News.js";

const app = express();


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
app.use(async (req, res, next) => {
    if (!req.session.user && req.cookies.rememberMe) {
        const usersDatabase = User.find({});
        const user = usersDatabase.find(u => u.rememberToken === req.cookies.rememberMe);
        if (user) {
            req.session.user = {
                id: user.id,
                name: user.name,
                surname: user.surname,
                email: user.email,
                isLoggedIn: true
            }
        }
    }
    next();
});


// ------------------------- Cookie ------------------------- \\
app.get("/set-cookie", (req, res) => {
    res.cookie("rememberMe", "yes", {
        maxAge: 1000 * 60 * 60 * 24, // 24 hour
        httpOnly: true,
        secure: false
    });
    res.send("Cookie has been set");
});

app.get("/get-cookie", (req, res) => {
    const rememberMe = req.cookies.rememberMe;
    res.send("Cookie: " + rememberMe);
});

app.get("/clear-cookie", (req, res) => {
    res.clearCookie("rememberMe");
    res.send("Cookie has been cleared");
});


// ------------------------- Main Page ------------------------- \\

app.get("/", async function (req, res) {
    const lastSixNews = await News.find({}).sort({ id: -1 }).limit(6);
    let isFirst = undefined;
    if (req.session.user && req.session.user.isFirstLogin) {
        isFirst = true
        req.session.user.isFirstLogin = false;
    }
    res.render("main-page", {
        news: lastSixNews,
        user: req.session.user !== undefined ? req.session.user : undefined,
        isFirstLogin: isFirst !== undefined ? isFirst : undefined
    });
})

// ---------------------- Registiration ---------------------- \\
app.get("/register", function (req, res) {
    res.render("register-page");
})

app.post("/api/register", async function (req, res) {
    const user = await User.find({ email: req.body.email });
    if (user) {
        return res.json({ message: "This email has been taken." });
    }

    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const newUser = new User({
        id: uuidv4(),
        name: req.body.name,
        surname: req.body.surname,
        email: req.body.email,
        password: hashedPassword,
        avatar: "/GuestAvatar.png",
        authenticationLevel: 0,
        isLoggedIn: false
    });
    newUser.save();

    // Session
    req.session.user = {
        id: newUser.id,
        name: newUser.name,
        surname: newUser.surname,
        email: newUser.email,
        isLoggedIn: true
    }

    // Token and Cookie
    const token = crypto.randomBytes(64).toString('hex');
    user.rememberToken = token;
    req.session.save()

    res.cookie("rememberMe", token, {
        maxAge: 60 * 60 * 1000 * 24,// 24 hours    
        httpOnly: true,
        secure: false,
        sameSite: 'lax'
    });

    return res.redirect("/");
})

// -------------------------- Login -------------------------- \\
app.get("/login", function (req, res) {
    res.render("login-page");
})

app.post("/api/login", async function (req, res) {
    const user = await User.findOneAndUpdate(
        { email: req.body.email },
        { isLoggedIn: true },
        { isFirstLogin: true },
        { new: true }
    )
    if (!findUser) {
        return res.send("This account is not available.");
    }

    const comparePassword = await bcrypt.compare(req.body.password, user.password)

    if (!comparePassword) {
        return res.send("Password is wrong!");
    }

    req.session.user = {
        id: user.id, email: user.email, name: user.name, surname: user.surname, avatar: user.avatar,
        authenticationLevel: user.authenticationLevel, isLoggedIn: true, isFirstLogin: true
    };
    req.session.save((err) => {
        if (err) {
            return res.send("Session save error.");
        }

        const token = crypto.randomBytes(64).toString('hex');
        user.rememberToken = token;
        req.session.save()

        res.cookie("rememberMe", token, {
            maxAge: 60 * 60 * 1000 * 24, // 24 hours
            httpOnly: true,
            secure: false,
            sameSite: 'lax'
        });

        return res.redirect("/");
    });
})

// ------------------------- Upload News ------------------------- \\
app.get("/upload", function (req, res) {
    res.render("upload-news-page", { user: req.session.user });
})

app.post("/api/upload-news", async function (req, res) {
    if (req.session.user && req.session.user.authenticationLevel >= 1) {
        const url = req.body.image;

        const lastNewsItem = News.findOne().sort({ id: -1 });
        const lastNewsId = lastNewsItem ? lastNewsItem.newsId + 1 : 0;
        const uploadNewsData = new News({
            newsId: lastNewsId,
            title: req.body.title.trim(),
            content: req.body.content.trim(),
            image: req.body.image,
            comments: [],
            views: 0,
            createdAt: new Date(),
            authorId: req.session.user.id
        })
        await uploadNewsData.save();
        return res.redirect("/");
    }
    return res.json({ message: "You need to login before upload any news." });
})

// ------------------------- Logout ------------------------- \\
app.post("/api/logout", async function (req, res) {
    if (req.session.user) {
        const user = await findOneAndUpdate(
            { email: req.session.user.email },
            { isLoggedIn: false },
            { new: true }
        )
        if (!user) {
            return res.send("User not found.");
        }
        await user.save();
        req.session.destroy();
    }
    res.clearCookie("rememberMe");
    res.redirect("/");
})

// ------------------------- News & Comments ------------------------- \\
app.get("/news/:newsId", async function (req, res) {
    const news = await News.findOneAndUpdate(
        { newsId: req.params.newsId },
        { $inc: { views: 1 } },
        { new: true }
    )
    if (!news) {
        return res.status(404).json({ error: "News not found" });
    };

    news.comments = news.comments.map(async comment => {
        const commentUser = await User.findOne({ id: comment.userId });

        comment.commentReply.forEach(async reply => {
            const replyUser = await User.findOne({ id: reply.userId });
            reply.replyUser = { avatar: replyUser.avatar, name: replyUser.name, surname: replyUser.surname };
        });

        return { ...comment, commentAvatar: commentUser.avatar, commentName: commentUser.name, commentSurname: commentUser.surname };
    });
    return res.render("news-page", { newsData: news, user: req.session.user || undefined });
});

// Add a comment
app.post("/api/news/:newsId/addComment/", async function (req, res) {
    if (req.session.user === undefined || !req.session.user.isLoggedIn) {
        return res.render("login-page");
    }
    const newsId = parseInt(req.params.newsId);

    const news = await News.findOne({ newsId: newsId });
    if (!news) {
        return res.status(404).json({ error: "News not found" });
    }

    const newComment = {
        commentId: uuidv4(),
        commentText: String(req.body.commentText).trim(),
        commentReply: [],
        createdAt: new Date(),
        userId: req.session.user.id,
    };
    news.comments.push(newComment);
    await news.save();
    return res.redirect("/news/" + newsId);
});

// Reply to a comment
app.post("/api/news/:newsId/addCommentReply", async function (req, res) {
    if (req.session.user === undefined || !req.session.user.isLoggedIn) {
        return res.render("login-page");
    }
    const newsId = parseInt(req.params.newsId);
    const commentId = req.body.commentId;

    const news = await News.findOne(
        { newsId: newsId }
    )
    if (!news) {
        return res.status(404).json({ error: "News does not exist." });
    }

    const comments = news.comments.find((comment) => comment.commentId === commentId);
    if (!comments) {
        return res.status(404).json({ error: "Comment is not exist" });
    }
    const newReply = {
        replyId: uuidv4(),
        replyText: String(req.body.replyText).trim(),
        createdAt: new Date().toISOString(),
        userId: req.session.user.id,
    };
    comments.commentReply.push(newReply);
    await news.save();
    return res.redirect("/news/" + newsId);
});

// ------------------------- User Profile ------------------------- \\
app.get("/user/profile", async function (req, res) {
    const user = req.session.user;
    const news = await News.find({});
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

// ------------------------- Start Server ------------------------- \\
app.listen(process.env.PORT, async () => {
    await mongoose.connect(process.env.MONGO_CONNECT, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    });
    console.log("Successfully connected to MongoDB");
});