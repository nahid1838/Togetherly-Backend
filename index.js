import express from "express";
import 'dotenv/config'
import { MongoClient } from 'mongodb';


const app = express()
const PORT = process.env.PORT || 5000


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


app.get('/', (req, res) => {
  res.send({msg: "Server is running fine"})
})

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`)
})