const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const bcrypt = require("bcrypt");
const path = require("path");

const app = express();
require("dotenv").config();

mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 30000,  // wait up to 30s
  ssl: true,
})
.then(() => console.log("✅ MongoDB Atlas connected"))
.catch(err => console.error("❌ Connection error:", err));

// Session middleware (MUST be before routes)
app.use(session({
  secret: "supersecretkey", 
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
  }),
  cookie: { maxAge: 1000 * 60 * 60 } 
}));
// Middleware
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// User model
const User = mongoose.model("User", new mongoose.Schema({
  username: { type: String, unique: true },
  password: String
}));

// Task model
const Task = mongoose.model("Task", new mongoose.Schema({
  title: String,
  userId: String
}));

// Middleware to check login
function requireLogin(req, res, next) {
  if (!req.session.userId) return res.redirect("/login");
  next();
}

// Routes
app.get("/", (req, res) => {
  res.render("index", { user: req.session.username || null });
});

// Add task
app.post("/add", requireLogin, async (req, res) => {
  await Task.create({ title: req.body.title, userId: req.session.userId });
  res.redirect("/home");
});

// Delete task
app.get("/delete/:id", requireLogin, async (req, res) => {
  await Task.deleteOne({ _id: req.params.id, userId: req.session.userId });
  res.redirect("/home");
});

// Edit task
app.get("/edit/:id", requireLogin, async (req, res) => {
  const task = await Task.findById(req.params.id);
  res.render("edit", { task });
});

// Update task
app.post("/update/:id", requireLogin, async (req, res) => {
  await Task.updateOne(
    { _id: req.params.id, userId: req.session.userId },
    { title: req.body.title }
  );
  res.redirect("/home");
});

// Auth Routes
app.get("/signup", (req, res) => res.render("signup"));

app.post("/signup", async (req, res) => {
  try {
    const existing = await User.findOne({ username: req.body.username });
    if (existing) {
      return res.send("Username already taken, please choose another one.");
    }

    const hashed = await bcrypt.hash(req.body.password, 10);
    await User.create({ username: req.body.username, password: hashed });
    res.redirect("/login");
  } catch (err) {
    console.error(err);
    res.send("Error creating user.");
  }
});

// Login
app.get("/login", (req, res) => res.render("login"));

app.post("/login", async (req, res) => {
  const user = await User.findOne({ username: req.body.username });
  if (!user) return res.send("User not found");

  const match = await bcrypt.compare(req.body.password, user.password);
  if (!match) return res.send("Wrong password");

  req.session.userId = user._id;
  req.session.username = user.username; // save username
  res.redirect("/home");
});

// Home page (requires login)
app.get("/home", requireLogin, async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.session.userId });
    res.render("home", { tasks, user: req.session.username || "Guest" });
  } catch (err) {
    console.error(err);
    res.send("Error loading home page.");
  }
});

// Logout
app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/login"));
});

// Start server (Render uses process.env.PORT)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
