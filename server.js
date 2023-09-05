const express = require("express");
const multer = require("multer");
const axios = require("axios");
require("dotenv").config();
const { MongoClient } = require("mongodb");

const app = express();

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const mongoUrl = "mongodb://localhost:27017";
const dbName = "carDatabase";

const customVisionEndpoint = process.env.PREDICTION_ENDPOINT;
const customVisionKey = process.env.PREDICTION_KEY;

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST");
  next();
});

app.post("/upload", upload.single("carImage"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const customVisionResponse = await axios.post(customVisionEndpoint, req.file.buffer, {
      headers: {
        "Prediction-Key": customVisionKey,
        "Content-Type": "application/octet-stream",
      },
    });

    const carType = customVisionResponse.data.predictions[0].tagName;

    const client = new MongoClient(mongoUrl, { useUnifiedTopology: true });

    await client.connect();
    const db = client.db(dbName);

    const collectionName = carType.toLowerCase();
    const cars = await db.collection(collectionName).find({}).toArray();

    client.close();

    res.json({ carType, cars });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

const port = process.env.PORT;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
