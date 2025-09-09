import mongoose from "mongoose";
import commentSchema from "./models/Comment.js";

const newsSchema = new mongoose.Schema({
    newsId: { type: Number, required: true, unique: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    image: { type: String, required: true },
    comments: [commentSchema],
    views: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    authorId: { type: String, required: true }
});

const News = mongoose.model("News", newsSchema);
export default News;