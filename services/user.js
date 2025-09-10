import User from "../models/user.js/";
import News from "../models/news.js/";

export async function findUserByRememberToken(rememberToken) {
    if (!rememberToken) {
        return null;
    }
    const user = await User.findOne({ rememberToken: rememberToken });
    return user;
}

// ---------------------- Registiration ---------------------- 
function renderRegister(req, res) {
    res.render("register-page");
}

export async function register(req, res) {
    const user = await User.findOne({ email: req.body.email }).lean();
    if (user) {
        return res.json({ message: "This email has been taken." });
    }

    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const token = crypto.randomBytes(64).toString('hex');
    const newUser = new User({
        id: uuidv4(),
        name: req.body.name,
        surname: req.body.surname,
        email: req.body.email,
        password: hashedPassword,
        avatar: "/GuestAvatar.png",
        authenticationLevel: 0,
        isLoggedIn: false,
        rememberToken: token
    });
    await newUser.save();

    // Session
    req.session.user = {
        id: newUser.id,
        name: newUser.name,
        surname: newUser.surname,
        email: newUser.email,
        isLoggedIn: true,
        isFirstLogin: true
    }

    res.cookie("rememberMe", token, {
        maxAge: 60 * 60 * 1000 * 24,// 24 hours    
        httpOnly: true,
        secure: false,
        sameSite: 'lax'
    });

    return res.redirect("/");
}

// -------------------------- Login -------------------------- 
function renderLogin(req, res) {
    res.render("login-page");
}

async function login(req, res) {
    const user = await User.findOne({ email: req.body.email }).lean();
    if (!user) {
        return res.send("This account is not available.");
    }

    const comparePassword = await bcrypt.compare(req.body.password, user.password)

    if (!comparePassword) {
        return res.send("Password is wrong!");
    }

    const token = crypto.randomBytes(64).toString('hex');
    user.isLoggedIn = true;
    user.isFirstLogin = true;
    user.rememberToken = token;
    await user.save();

    req.session.user = {
        id: user.id, email: user.email, name: user.name, surname: user.surname, avatar: user.avatar,
        authenticationLevel: user.authenticationLevel, isLoggedIn: true, isFirstLogin: true
    };

    res.cookie("rememberMe", token, {
        maxAge: 60 * 60 * 1000 * 24, // 24 hours
        httpOnly: true,
        secure: false,
        sameSite: 'lax'
    });

    return res.redirect("/");
}

// ------------------------- Logout ------------------------- 
async function logout(req, res) {
    if (req.session.user) {
        await User.findOneAndUpdate(
            { email: req.session.user.email },
            { isLoggedIn: false }
        ).lean();
        req.session.destroy();
    }
    res.clearCookie("rememberMe");
    res.redirect("/");
}

// ------------------------- User Profile ------------------------- 
export async function renderProfile(req, res) {
    const user = req.session.user;
    const news = await News.find({});
    let allComments = [];
    news.forEach((newsItem) => {
        newsItem.comments.forEach((comment) => {
            if (comment.userId === user.id) {
                allComments.push({
                    newsId: newsItem.newsId,
                    commentText: comment.commentText,
                    createdAt: comment.createdAt
                });
            }
        });
    });
    return res.render("profile-page", { user: user, comments: allComments });
}

