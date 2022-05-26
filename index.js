const express = require('express');
const app = express();
const port = process.env.PORT || 5000;
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const objectId = require('mongodb').ObjectId;

app.use(cors());
app.use(express.json());


const stripe = require("stripe")('sk_test_51L0fKtJ9YTsnQW1SuYikyuRI0QFscPAAslgEpj37jMRYTOvQngMxvchpjn9PWtIZYSszuqdsIOoF7Bprj4mVnSmR00nV7H9XHg');


const verifyjwt = (req, res, next) => {
    const autheader = req.headers.authorization;

    if (!autheader) {
        return res.status(401).send({ message: "unauthorized access" })
    }

    const token = autheader.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
        if (err) {

            return res.status(403).send({ message: "forbidden access" })
        }
        req.decoded = decoded;

        next();
    })

}



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.ml4yq.mongodb.net/?retryWrites=true&w=majority`;


const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });



const run = async () => {
    try {
        await client.connect();
        const mobilekitproduct = client.db("mobilekit").collection("products");
        const mobilekitusers = client.db("mobilekit").collection("users");
        const mobilekitorders = client.db("mobilekit").collection("orders");
        const mobilekipayment = client.db("mobilekit").collection("payment");
        const mobilekitreview = client.db("mobilekit").collection("review");

        const verifyadmin = async (req, res, next) => {
            const requester = req.decoded.email;

            const requesteracount = await mobilekitusers.findOne({ email: requester });

            if (requesteracount.role === "admin") {
                next();
            } else {
                res.status(403).send({ message: "forbiden" })
            }

        }


        app.post('/addproduct', verifyjwt, verifyadmin, async (req, res) => {
            const body = req.body
            const result = await mobilekitproduct.insertOne(body);
            res.send(result);

        })

        app.get('/allproduct', async (req, res) => {

            const result = await mobilekitproduct.find({}).toArray();
            res.send(result);

        })


        app.get('/allorder', verifyjwt, verifyadmin, async (req, res) => {

            const result = await mobilekitorders.find({}).toArray();
            res.send(result);

        })
        app.delete('/order/:id', verifyjwt, verifyadmin, async (req, res) => {
            const id = req.params.id;

            const query = { _id: objectId(id) }
            const result = await mobilekitorders.deleteOne(query);
            res.send(result);

        })

        app.delete('/cancelorder/:id', verifyjwt, async (req, res) => {
            const id = req.params.id;
            const query = { _id: objectId(id) }
            const result = await mobilekitorders.deleteOne(query);
            res.send(result);

        })

        app.get('/order/:email', verifyjwt, async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const result = await mobilekitorders.find(query).toArray();
            res.send(result);

        })

        app.get('/allproduct/:id', verifyjwt, async (req, res) => {
            const id = req.params.id;
            const query = { _id: objectId(id) }
            const result = await mobilekitproduct.findOne(query);
            res.send(result);

        })


        app.get('/users', verifyjwt, verifyadmin, async (req, res) => {
            const result = await mobilekitusers.find().toArray();
            res.send(result)
        })

        app.delete('/delete/:id', verifyjwt, verifyadmin, async (req, res) => {
            const id = req.params.id;

            const query = { _id: objectId(id) }
            const result = await mobilekitproduct.deleteOne(query);

            res.send(result);

        })

        app.put('/productqty', verifyjwt, async (req, res) => {
            const data = req.body;

            const query = { _id: objectId(data.id) }
            const updateDoc = {
                $set: { quantity: data.qty },
            };

            const result = await mobilekitproduct.updateOne(query, updateDoc);
            res.send(result)

        })


        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await mobilekitusers.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN, {
                expiresIn: '1h'
            })
            res.send({ result, accesstoken: token });
        })


        app.put('/user/admin/:email', verifyjwt, verifyadmin, async (req, res) => {
            const email = req.params.email;
            const requester = req.decoded.email;
            const requesterAcount = await mobilekitusers.findOne({ email: requester });

            if (requesterAcount.role === "admin") {
                const filter = { email: email };

                const updateDoc = {
                    $set: { role: 'admin' },
                };

                const result = await mobilekitusers.updateOne(filter, updateDoc);

                res.send(result);
            } else {
                res.status(403).send({ message: "forbiden" })
            }


        })

        app.put('/user/adminremove/:email', verifyjwt, verifyadmin, async (req, res) => {
            const email = req.params.email;
            const requester = req.decoded.email;

            const requesterAcount = await mobilekitusers.findOne({ email: requester });

            if (requesterAcount.role === "admin") {
                const filter = { email: email };

                const updateDoc = {
                    $set: { role: 'user' },
                };

                const result = await mobilekitusers.updateOne(filter, updateDoc);

                res.send(result);
            } else {
                res.status(403).send({ message: "forbiden" })
            }


        })

        app.delete('/user/:email', verifyjwt, verifyadmin, async (req, res) => {
            const email = req.params.email;
            const query = { email: email }
            const result = await mobilekitusers.deleteOne(query);
            res.send(result)
        })


        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email;

            const users = await mobilekitusers.findOne({ email: email });

            const isAdmin = users?.role === "admin";

            res.send({ admin: isAdmin })

        })

        app.post('/order', verifyjwt, async (req, res) => {

            const data = req.body;
            const result = await mobilekitorders.insertOne(data);

            res.send(result)

        });



        app.get('/payment', verifyjwt, async (req, res) => {
            const id = req.query.id;
            const query = { _id: ObjectId(id) }
            const result = await mobilekitorders.findOne(query);
            res.send(result);
        })


        app.post("/create-payment-intent", verifyjwt, async (req, res) => {
            const items = req.body;
            const price = parseInt(items.price)
            const amount = price * 100;


            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: "usd",
                payment_method_types: ['card']
            });

            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        });

        app.patch('/order/:id', verifyjwt, async (req, res) => {
            const id = req.params.id;
            const payment = req.body;

            const query = { _id: ObjectId(id) };
            const updateDoc = {
                $set: {
                    transectionid: payment.transectionId,
                    status: "pending",

                }
            }
            const options = { upsert: true };

            const updateorder = await mobilekitorders.updateOne(query, updateDoc, options);
            res.send(updateorder)

        })


        app.put('/approveorder/:id', verifyadmin, async (req, res) => {
            const id = req.params.id;

            const query = { _id: objectId(id) }
            const updateDoc = {
                $set: { status: "shiped", },
            };
            const updateorder = await mobilekitorders.updateOne(query, updateDoc);
            res.send(updateorder)

        })


        app.post('/review', verifyjwt, async (req, res) => {
            const data = req.body;
            const result = await mobilekitreview.insertOne(data);
            res.send(result);


        })

        app.get('/review', async (req, res) => {

            const result = await mobilekitreview.find({}).toArray();
            res.send(result);


        })

        app.get('/users/:email', verifyjwt, async (req, res) => {
            const email = req.params.email;

            const query = { email: email };
            const result = await mobilekitusers.findOne(query);
            res.send(result);


        })

        app.put('/profiledata/:email', verifyjwt, async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const newdata = req.body;
            const updateDoc = {
                $set: {
                    newdata
                }
            }
            const options = { upsert: true };
            const updateorder = await mobilekitusers.updateOne(query, updateDoc, options);
            res.send(updateorder)

        })


    } finally {

    }

}

run().catch(console.dir)
app.get('/', (req, res) => {
    res.send("assignent 12 server is running");
})
app.listen(port, () => {
    console.log(`your server is running on port ${port}`);
})