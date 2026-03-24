require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const { seedAdmin, seedDefaultFaculty } = require('./controllers/authController');


connectDB().then(() => {
    seedAdmin();
    seedDefaultFaculty();
});

const app = express();

app.use(express.json());
app.use(cors());

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/courses', require('./routes/courseRoutes'));
app.use('/api/faculty', require('./routes/facultyRoutes')); // New Route
app.use('/api/students', require('./routes/studentRoutes'));
app.use('/api/languages', require('./routes/languageRoutes'));
app.use('/api/topics', require('./routes/topicRoutes'));
app.use('/api/questions', require('./routes/questionRoutes'));
app.use('/api/workbooks', require('./routes/workbookRoutes'));
app.use('/api/submissions', require('./routes/submissionRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/materials', require('./routes/materialRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));