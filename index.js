import express from "express";
import 'dotenv/config'
import { MongoClient } from 'mongodb';
import cors from "cors"


const app = express()
const PORT = process.env.PORT || 5000

app.use(express.json())
app.use(cors())


const client = new MongoClient(process.env.MONGODB_URI);
export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.dir(err);
  }
}

const mongoClient = await connectToMongoDB();
const db = mongoClient.db("togetherly");
const eventsColection = db.collection("events")

app.post("/create-event", async (req, res) => {
    const data = req.body;

    const result = await eventsColection.insertOne(data);
    res.send(result);
})


app.get('/', (req, res) => {
  res.send({msg: "Server is running fine"})
})

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`)
})