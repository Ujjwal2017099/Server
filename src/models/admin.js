const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    Name: {
        type: String,
        required: true,
    },
    Email: {
        type: String,
        required: true,
    },
    Password: {
        type: String,
        required: true,
    },
    Type: {
        type: Number,
        default: 2,
    },
    Favorite: {
        type: [String],
    },
});

const Admin = new mongoose.model("Admin", userSchema);

module.exports = Admin;
