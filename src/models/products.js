const mongoose = require("mongoose");
 
const productSchema = new mongoose.Schema({
    Name: {
        type: String,
        required: true,
    },
    Description: {
        type: String,
        required: true,
    },
    Price: {
        type: Number,
        required: true,
    },
    ProductType: {
        type: Number,
        default: 0,
    },
    TotalCnt : {
        type : Number,
        default : 0
    },
    Image : {
        type : String,
        required : true
    }
});

const Product = new mongoose.model("Product", productSchema);

module.exports = Product;
