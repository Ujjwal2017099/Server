const mongoose = require("mongoose");

const sellerSchema = new mongoose.Schema({
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
    Address: {
        type: String,
        required: true,
    },
    Type: {
        type: Number,
        default: 1,
    },
    Products: {
        type: [String],
    },
    Favorite: {
        type: [String],
    },
});

const Seller = new mongoose.model("Seller", sellerSchema);

module.exports = Seller;
