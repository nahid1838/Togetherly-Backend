import express from "express";
import 'dotenv/config'
import { MongoClient, ObjectId } from 'mongodb';
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


            // All events data
app.get("/events", async (req, res) => {
    const result = await eventsColection.find().toArray();
    res.send(result);
})



            // Single data by id
app.get("/events/:id", async (req, res) => {
    const {id} = req.params;

    console.log(id)

    const result = await eventsColection.findOne(
        {_id: new ObjectId(id)},
    );
    res.send(result);
})



                // Single user all data
app.get("/event/:email", async (req, res) => {
    const { email } = req.params;

    console.log(email)

    const result = await eventsColection.find({userEmail: (email)}).toArray();

    res.json(result);
})



  // Update event by id
app.patch("/events/:id", async (req, res) => {
    const { id } = req.params;

    const { title, description, eventType, thumbnail, location, date } = req.body;

    const result = await eventsColection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { title, description, eventType, thumbnail, location, date } }
    );

    if (result.matchedCount === 0) {
        return res.status(404).send({ msg: "Event not found" });
    }

    res.json({ msg: "Event updated", modifiedCount: result.modifiedCount });
})



app.delete("/events/:id", async (req, res) => {
  const {id} = req.params;

  const result = await eventsColection.deleteOne({_id: new ObjectId(id)});
  res.json(result);
})


        // Starter code
app.get('/', (req, res) => {
  res.send({msg: "Server is running fine"})
})

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`)
})