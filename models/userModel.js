import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    surname: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    avatar: { type: String, default: "/GuestAvatar.png" },
    authenticationLevel: { type: Number, default: 0 },
    isLoggedIn: { type: Boolean, default: false },
    rememberToken: { type: String }
});

const User = mongoose.model("User", userSchema);
export default User;