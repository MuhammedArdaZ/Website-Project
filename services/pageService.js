import User from "../models/userModel.js";
import News from "../models/newsModel.js";
import { v4 as uuidv4 } from "uuid";

// ------------------------- Main Page ------------------------- 
export async function renderMain(req, res) {
    const lastSixNews = (await News.find({}).sort({ id: -1 }).limit(6)).reverse();
    let isFirst = undefined;
    if (req.session.user && req.session.user.isFirstLogin) {
        isFirst = true
        req.session.user.isFirstLogin = false;
    }
    await res.render("main-page", {
        news: lastSixNews,
        user: req.session.user !== undefined ? req.session.user : undefined,
        isFirstLogin: isFirst !== undefined ? isFirst : undefined
    });
}

// ------------------------- Upload News ------------------------- 
export function renderUpload(req, res) {
    res.render("upload-news-page", { user: req.session.user });
}

export async function upload(req, res) {
    if (req.session.user && req.session.user.authenticationLevel >= 1) {
        const url = req.body.image;

        const lastNewsItem = await News.findOne().sort({ newsId: -1 }).lean();
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
}

// ------------------------- News & Comments ------------------------- 
export async function renderNews(req, res) {
    const news = await News.findOneAndUpdate(
        { newsId: req.params.newsId },
        { $inc: { views: 1 } },
        { new: true }
    ).lean();
    if (!news) {
        return res.status(404).json({ error: "News not found" });
    };

    news.comments = await Promise.all(news.comments.map(async (comment) => {
        const commentUser = await User.findOne({ id: comment.userId }).lean();

        const processedReplies = await Promise.all(comment.commentReply.map(async (reply) => {
            const replyUser = await User.findOne({ id: reply.userId }).lean();
            return { ...reply, replyUser: { avatar: replyUser.avatar, name: replyUser.name, surname: replyUser.surname } };
        }));

        return { ...comment, commentAvatar: commentUser.avatar, commentName: commentUser.name, commentSurname: commentUser.surname, commentReply: processedReplies };
    }));

    return res.render("news-page", { newsData: news, user: req.session.user || undefined });
};

// Add a comment
export async function postComment(req, res) {
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
};

// Reply to a comment
export async function postReply(req, res) {
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
};