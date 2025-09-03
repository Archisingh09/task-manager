import mongoose from "mongoose";

const mongoURI = process.env.MONGO_URI;

mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ MongoDB connected to Atlas"))
.catch(err => console.error("❌ MongoDB connection error:", err));
