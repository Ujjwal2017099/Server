const express = require('express')
const app = express();
require('dotenv').config();
require('./connection/Connection');
const User = require('./models/user')
const Admin = require('./models/admin')
const Product = require('./models/products')
const Seller = require('./models/seller')
const fileUpload = require("express-fileupload");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const cloudinary = require("cloudinary").v2;
const fs = require('fs');
const Razorpay = require("razorpay");

const port = process.env.PORT || 8000;

cloudinary.config({
    secure: true,
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_KEY,
    api_secret: process.env.CLOUDINARY_SECRET,
});

const corsOptions = {
    origin: "*",
    optionsSuccessStatus: 200,
};
app.use(express.json());
app.use(cors(corsOptions));
app.use(fileUpload());

const uploadImage = async (imagePath) => {
    const options = {
        use_filename: true,
        unique_filename: false,
        overwrite: true,
    };

    try {
        const result = await cloudinary.uploader.upload(imagePath, options);
        console.log(result);
        return result.secure_url;
    } catch (error) {
        console.error(error);
    }
};

const getAssetInfo = async (id) => {
    // Return colors in the response
    try {
        const x = await Product.find({_id : id});
        if(!x.length) return "error";
        return x[0];
    } catch (error) {
        console.log(error);
        return "error";
    }
};

app.post("/register", async (req, res) => {
    // console.log(req.body);
    const user = new User({
        Name: req.body.name,
        Email: req.body.email,
        Password: req.body.password,
    });
    user.save()
        .then(() => {
            console.log("user saved");
            res.sendStatus(201);
        })
        .catch((err) => {
            console.log(err);
            res.sendStatus(400);
        });
});

app.get("/login", async (req, res) => {
    let status = 400;
    let token = "";
    try {
        // console.log(req.body);
        const r = await User.find({
            Email: req.query.email,
            Password: req.query.password,
        });
        // console.log(r);
        if (r.length) {
            status = 200;
            token = jwt.sign(
                {
                    Email: req.query.email,
                    Password: req.query.password,
                    Type:0
                },
                process.env.ACCESS_KEY
            );
        }
    } catch (error) {
        console.log(error);
    }
    // console.log(token);
    res.status(status).json(token);
});

app.get('/' , (req,res)=>{
    const token = req.query.token;
    if(!token ) return res.sendStatus(404);
    try {
        jwt.verify(token,process.env.ACCESS_KEY,async (err,user)=>{
            if(err) {return res.sendStatus(501);}
            else{
                if(user.Type===0){
                    const r = await User.find({Email:user.Email,Password:user.Password});
                    if(!r.length) return res.sendStatus(404);

                    const paid = req.query.token;
                    const query = Product.find({});
                    if(paid && parseInt(paid)===1){
                        query.where("ProductType").equals(1);
                    }else if (paid && parseInt(paid) === 0) {
                        query.where("ProductType").equals(0);
                    }
                    return res.status(201).send(await query.exec());
                }else if (user.Type === 1) {
                    const r = await Seller.find({
                        Email: user.Email,
                        Password: user.Password,
                    });
                    if (!r.length) return res.sendStatus(404);

                    const paid = req.query.token;
                    const query = Product.find({});
                    if (paid && parseInt(paid) === 1) {
                        query.where("ProductType").equals(1);
                    } else if (paid && parseInt(paid) === 0) {
                        query.where("ProductType").equals(0);
                    }
                    return res.status(201).send(await query.exec());
                } else if (user.Type === 2) {
                    const r = await Admin.find({
                        Email: user.Email,
                        Password: user.Password,
                    });
                    if (!r.length) return res.sendStatus(404);

                    const query = Product.find({});
                    return res.status(201).send(await query.exec());
                } else {
                    
                    return res.sendStatus(404);
                }
            }
        })
    } catch (error) {
        return res.sendStatus(501);
    }
})

app.post('/registerSeller', async (req,res)=>{
    const user = new Seller({
        Name: req.body.name,
        Email: req.body.email,
        Password: req.body.password,
        Address: req.body.address
    });
    user.save()
        .then(() => {
            console.log("user saved");
            res.sendStatus(201);
        })
        .catch((err) => {
            console.log(err);
            res.sendStatus(400);
        });
})

app.get("/loginSeller", async (req, res) => {
    let status = 400;
    let token = "";
    try {
        // console.log(req.body);
        const r = await Seller.find({
            Email: req.query.email,
            Password: req.query.password,
        });
        // console.log(r);
        if (r.length) {
            status = 200;
            token = jwt.sign(
                {
                    Email: req.query.email,
                    Password: req.query.password,
                    Type:1
                },
                process.env.ACCESS_KEY
            );
        }
    } catch (error) {
        console.log(error);
    }
    // console.log(token);
    res.status(status).json(token);
});

app.post("/addProduct",(req,res)=>{
    try {
        const token = req.query.token;
        jwt.verify(token,process.env.ACCESS_KEY,async (err,user)=>{
            if(err) {console.log(err.message); return res.sendStatus(500);}
            else{
                if(user.Type===1){
                    const r = await Seller.find({Email:user.Email,Password:user.Password});
                    if(!r.length) return res.sendStatus(404);
                    const file = req.files.file;
                    // console.log(req.files);
                    const name = Date.now() + file.name;
                    const path = __dirname + "/uploads/" + name;
                    file.mv(path, (err) => {
                        if (err) return res.sendStatus(500);
                        console.log("file uploaded successfully");
                    });
                    const up = await uploadImage(path);
                    fs.unlink(path, (err) => {
                        if (err) return console.log(err);
                        // console.log("file deleted successfully");
                    });
                    const product = new Product({
                        Name: req.query.name,
                        Description: req.query.description,
                        Price: req.query.price,
                        ProductType: req.query.premium,
                        Image: up,
                    });
                    r[0].Products.push(product._id);
                    await product.save();
                    await r[0].save();
                    return res.sendStatus(201);
                }else{
                    return res.sendStatus(404);
                }
            }
        })
    } catch (error) {
        return res.sendStatus(501);
    }
});

app.get('/profile' , (req,res)=>{
    try {
        const token = req.query.token;
        jwt.verify(token,process.env.ACCESS_KEY , async(err,user)=>{
            if(err) {console.log(err.message); return res.sendStatus(404);}
            let myProducts=[];
            let myFavorite = [];
            let Type = 0;
            let Premium = 0;
            if(user.Type===1){
                const r = await Seller.find({Email:user.Email,Password:user.Password});
                if(!r.length) return res.sendStatus(404);
                myProducts = r[0].Products;
                myFavorite = r[0].Favorite;
                Type = 1;
            }
            else if(user.Type===0){
                const r = await User.find({Email:user.Email,Password:user.Password});
                if(!r.length) return res.sendStatus(404);
                myFavorite = r[0].Favorite;
                Premium = r[0].Premium;
            }
            else {
                const r= await Admin.find({Email:user.Email,Password:user.Password});
                if(!r.length) return res.sendStatus(404);

                const Users = await User.find();
                const Sellers = await Seller.find();
                const AllProducts = await Product.find();

                return res.status(201).send({Type : 2 , Users , Sellers , AllProducts , Products : [] , Favorite : []});
            }
            let Products = [],Favorite=[];
            let t=[];
            let k = myProducts.length;
            for(let i=0;i<myFavorite.length + myProducts.length ; i++){
                if(i<k) t.push(await getAssetInfo(myProducts[i]));
                else t.push(await getAssetInfo(myFavorite[i-k]));

                if(t.length === myFavorite.length + myProducts.length){
                    for(let i=0;i<k;i++) Products.push(t[i]);
                    for(let i=k;i<t.length;i++) Favorite.push(t[i]);

                    return res.send({ Products, Favorite, Type, Premium });
                }else{
                    console.log(t.length);
                }
            }
            if(myProducts.length===0 && myFavorite.length===0){
                return res.send({ Products, Favorite, Type , Premium });
            }
        })
    } catch (error) {
        console.log(error.message);
        return res.sendStatus(501);
    }
})

app.post("/addToFav" , (req,res)=>{
    try {
        const token = req.query.token;
        jwt.verify(token,process.env.ACCESS_KEY,async (err,user)=>{
            if(err) {console.log(err.message); return res.sendStatus(404);}
            if(user.Type===1){
                const r = await Seller.find({Email:user.Email,Password:user.Password});
                if(!r.length) return res.sendStatus(404);

                r[0].Favorite.push(req.query.id);
                await r[0].save()
                return res.sendStatus(201);
            }
            else if(user.Type===0){
                const r = await User.find({Email:user.Email,Password:user.Password});
                if(!r.length) return res.sendStatus(404);

                r[0].Favorite.push(req.query.id);
                await r[0].save()
                return res.sendStatus(201);
            }
        })
    } catch (error) {
        console.log(error.message);
        return res.sendStatus(501);
    }
});

app.post("/votes" , async(req,res)=>{
    try {
        const f = parseInt(req.body.f);
        const _id = req.body._id;

        const r = await Product.find({_id});

        if(!r.length) return res.sendStatus(404);

        r[0].TotalCnt += f;
        await r[0].save();

        return res.sendStatus(201);
    } catch (error) {
        return res.sendStatus(501);
    }
});

app.get('/adminLogin', async (req,res)=>{
    let status = 400;
    let token = "";
    try {
        // console.log(req.body);
        const r = await Admin.find({
            Email: req.query.email,
            Password: req.query.password,
        });
        // console.log(r);
        if (r.length) {
            status = 200;
            token = jwt.sign(
                {
                    Email: req.query.email,
                    Password: req.query.password,
                    Type: 2,
                },
                process.env.ACCESS_KEY
            );
        }
    } catch (error) {
        console.log(error);
    }
    // console.log(token);
    res.status(status).json(token);
})

app.delete("/deleteUser", (req, res) => {
    try {
        const token = req.query.token;
        jwt.verify(token, process.env.ACCESS_KEY, async (err, user) => {
            if (err) {
                console.log(err);
                return res.sendStatus(404);
            }

            const r = await Admin.find({
                Email: user.Email,
                Password: user.Password,
            });
            if (!r.length) return res.sendStatus(404);

            await User.deleteOne({ _id: req.body._id });

            return res.sendStatus(200);
        });
    } catch (error) {
        console.log(error.message);
        return res.sendStatus(501);
    }
});

app.delete("/deleteSeller", (req, res) => {
    try {
        const token = req.query.token;
        jwt.verify(token, process.env.ACCESS_KEY, async (err, user) => {
            if (err) {
                console.log(err);
                return res.sendStatus(404);
            }

            const r = await Admin.find({
                Email: user.Email,
                Password: user.Password,
            });
            if (!r.length) return res.sendStatus(404);

            await Seller.deleteOne({ _id: req.body._id });

            return res.sendStatus(200);
        });
    } catch (error) {
        console.log(error.message);
        return res.sendStatus(501);
    }
});

app.get('/razorpay' , async(req,res)=>{
    try {
        var instance = new Razorpay({
            key_id: process.env.RAZOR_PAY_ID,
            key_secret: process.env.RAZOR_PAY_SECRET,
        });
        const payment_capture = 1;
        const amount = 100
        const currency = 'INR'
        const response = await instance.orders.create({
            amount,
            currency,
            receipt : 'Recipt',
            payment_capture
        })

        console.log(response);
        res.send({
            id : response.id,
        });
    } catch (error) {
        console.log(error);
        res.sendStatus(501);
    }
})

app.listen(port,()=>{
    console.log(`server started at ${port}`);
})