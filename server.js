require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json());
app.use('/public', express.static(__dirname + '/public'));

// Home page
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Mongoose Schemas
const userSchema = new mongoose.Schema({
  username: String
});

const exerciseSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  description: String,
  duration: Number,
  date: String
});

const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);

// POST /api/users - Create a new user
app.post('/api/users', async (req, res) => {
  const newUser = new User({ username: req.body.username });
  const savedUser = await newUser.save();
  res.json({ username: savedUser.username, _id: savedUser._id });
});

// GET /api/users - List all users
app.get('/api/users', async (req, res) => {
  const users = await User.find({}, '_id username');
  res.json(users);
});

// POST /api/users/:_id/exercises - Add exercise
app.post('/api/users/:_id/exercises', async (req, res) => {
  const { description, duration, date } = req.body;
  const user = await User.findById(req.params._id);

  if (!user) return res.send('Unknown user ID');

  const exerciseDate = date ? new Date(date) : new Date();
  const newExercise = new Exercise({
    userId: user._id,
    description,
    duration: parseInt(duration),
    date: exerciseDate.toDateString()
  });

  const savedExercise = await newExercise.save();

  res.json({
    _id: user._id,
    username: user.username,
    date: savedExercise.date,
    duration: savedExercise.duration,
    description: savedExercise.description
  });
});

// GET /api/users/:_id/logs - Retrieve user log
app.get('/api/users/:_id/logs', async (req, res) => {
  const { from, to, limit } = req.query;
  const user = await User.findById(req.params._id);
  if (!user) return res.send('Unknown user ID');

  let query = { userId: user._id };
  let dateFilter = {};

  if (from) dateFilter.$gte = new Date(from);
  if (to) dateFilter.$lte = new Date(to);
  if (from || to) query.date = dateFilter;

  let exercises = await Exercise.find(query).limit(parseInt(limit) || 500);

  res.json({
    _id: user._id,
    username: user.username,
    count: exercises.length,
    log: exercises.map(e => ({
      description: e.description,
      duration: e.duration,
      date: e.date
    }))
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Exercise Tracker is listening on port ${PORT}`);
});
