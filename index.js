import express from "express";
import session from "express-session";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";


import { findUserByRememberToken, renderRegister, register, renderLogin, login, logout, renderProfile } from "./services/user.js";
import { renderMain, renderUpload, upload, renderNews, postComment, postReply } from "./services/news.js";

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
        const user = await findUserByRememberToken(req.cookies.rememberMe);
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

app.get("/register", renderRegister());
app.post("/api/register", register());
app.get("/login", renderLogin());
app.post("/api/login", login());
app.get("/api/logout", logout());
app.get("/user/profile", renderProfile());

app.get("/", renderMain());
app.get("/upload", renderUpload());
app.post("/api/upload-news", upload());
app.get("/news/:newsId", renderNews());
app.post("/api/news/:newsId/addComment/", postComment());
app.post("/api/news/:newsId/addCommentReply", postReply());


// ------------------------- Start Server ------------------------- \\
app.listen(process.env.PORT, async () => {
    await mongoose.connect(process.env.MONGO_CONNECT, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    });
    console.log("Successfully connected to MongoDB");
});

