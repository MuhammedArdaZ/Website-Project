import mongoose, { mongo } from "mongoose";
import commentReplySchema from "./commentReply.js/";

const commentSchema = new mongoose.Schema({
    commentId: { type: String, required: true },
    commentText: { type: String, required: true },
    commentReply: [commentReplySchema],
    createdAt: { type: Date, default: Date.now },
    userId: { type: String, required: true }
});

export default commentSchema;