import mongoose from "mongoose";

const commentReplySchema = new mongoose.Schema({
    replyId: { type: String, required: true },
    replyText: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    userId: { type: String, required: true }
});

const CommentReply = mongoose.model("CommentReply", commentReplySchema);
export default commentReplySchema;