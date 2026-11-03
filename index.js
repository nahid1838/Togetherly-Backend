import express from "express";
import 'dotenv/config'
import { MongoClient, ObjectId } from 'mongodb';
import cors from "cors"
import { createRemoteJWKSet, jwtVerify } from "jose";


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
const joinedEventsCollection = db.collection("joinedEvents")

                // Secure Api
const verifyToken = async (req, res, next) => {
    const authHeader = req.headers.authorization

    if(!authHeader) {
        return res.status(401).send({msg: "Unauthorized!"})
    }

    const token = authHeader.split(" ")[1];
    
    if(!token) {
        return res.status(401).send({msg: "Unauthorized!"})
    }

    const JWKS = createRemoteJWKSet(new URL('http://localhost:3000/api/auth/jwks'));

    try {
        const {payload} = await jwtVerify(token, JWKS)
        next();
    } catch (error) {
        return res.status(500).send({msg: "Server Error!"});
    }

}



app.post("/create-event", verifyToken, async (req, res) => {
    const data = req.body;

    const result = await eventsColection.insertOne(data);
    res.send(result);
})


            // All events data — ?upcoming=true → only today's & future events
// app.get("/events", async (req, res) => {
//     try {
//         const query = {};

//         if (req.query.upcoming === "true") {
//             const now = new Date();
//             const pad = (n) => String(n).padStart(2, "0");
//             const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

//             query.date = { $gte: today };
//         }

//         const events = await eventsColection
//             .find(query)
//             .sort({ date: 1 })
//             .toArray();

//         res.json(events);
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ message: "Failed to fetch events" });
//     }
// })

        // All events
app.get("/events", async(req, res) => {
  const result = await eventsColection.find().toArray();
  res.send(result);
})


app.get("/upcoming-events", async (req, res) => {
    try {
        const now = new Date();
        const pad = (n) => String(n).padStart(2, "0");
        const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

        const events = await eventsColection
            .find({ date: { $gte: today } })
            .sort({ date: 1 })
            .toArray();

        res.json(events);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to fetch upcoming events" });
    }
});

// 3. Latest 6 upcoming events (home page er jonno)
app.get("/featured-events", async (req, res) => {
    try {
        const now = new Date();
        const pad = (n) => String(n).padStart(2, "0");
        const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

        const events = await eventsColection
            .find({ date: { $gte: today } })
            .sort({ date: 1 })
            .limit(6)
            .toArray();

        res.json(events);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to fetch featured events" });
    }
});



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
app.patch("/events/:id", verifyToken, async (req, res) => {
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


          // Delete event
app.delete("/events/:id", verifyToken, async (req, res) => {
  const {id} = req.params;

  const result = await eventsColection.deleteOne({_id: new ObjectId(id)});
  res.json(result);
})







            // Join an event — store user + event data
app.post("/joined-events", async (req, res) => {
    const { userEmail, userName, userImageUrl, event } = req.body;

    if (!userEmail || !event) {
        return res.status(400).send({ msg: "Missing user or event data" });
    }

    // One user can join the same event only once
    const alreadyJoined = await joinedEventsCollection.findOne({
        userEmail,
        eventId: event._id,
    });

    if (alreadyJoined) {
        return res.status(400).send({ msg: "Already joined this event" });
    }

    const result = await joinedEventsCollection.insertOne({
        userEmail,
        userName,
        userImageUrl,
        eventId: event._id,   // string — matches what the frontend sends back
        event,                // full event snapshot, so the joined page needs no joins
        joinedAt: new Date(),
    });

    res.send(result);
})


            // Leave an event — remove that user's join
app.delete("/joined-events/:eventId/:email", async (req, res) => {
    const { eventId, email } = req.params;

    const result = await joinedEventsCollection.deleteOne({
        userEmail: email,
        eventId,
    });

    res.json(result);
})


            // All events a user has joined
app.get("/joined-events/:email", verifyToken, async (req, res) => {
    
    const { email } = req.params;

    const result = await joinedEventsCollection
        .find({ userEmail: email })
        .toArray();

    res.json(result);
})

// All joins for one event (count + avatars on the details page)
app.get("/joined-events/event/:eventId", async (req, res) => {
    const { eventId } = req.params;

    const result = await joinedEventsCollection
        .find({ eventId })
        .project({ userEmail: 1, userName: 1, userImageUrl: 1, joinedAt: 1 })
        .toArray();

    res.json(result);
});




        // Starter code
app.get('/', (req, res) => {
  res.send({msg: "Server is running fine"})
})

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`)
})