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

app.get('/', (req, res) => {
    res.send("assignent 12 server is running");
})


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

        app.post('/addproduct', async (req, res) => {
            const body = req.body
            const result = await mobilekitproduct.insertOne(body);
            res.send(result);

        })

        app.get('/allproduct', verifyjwt, async (req, res) => {
            const result = await mobilekitproduct.find().toArray();
            res.send(result);

        })
        app.get('/users', verifyjwt, async (req, res) => {
            const result = await mobilekitusers.find().toArray();
            res.send(result)
        })

        app.delete('/delete/:id', async (req, res) => {
            const id = req.params.id;

            const query = { _id: objectId(id) }
            const result = await mobilekitproduct.deleteOne(query);

            res.send(result);

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


        app.put('/user/admin/:email', verifyjwt, async (req, res) => {
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

        app.put('/user/adminremove/:email', verifyjwt, async (req, res) => {
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
        app.delete('/user/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email }
            const result = await mobilekitusers.deleteOne(query);
            res.send(result)
        })


    } finally {

    }

}

run().catch(console.dir)

app.listen(port, () => {
    console.log(`your server is running on port ${port}`);
})