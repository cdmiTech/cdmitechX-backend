const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['faculty', 'student', 'admin'],
        default: 'student'
    },
    // Additional fields for Student can be handled here or in a separate profile model if preferred,
    // but for login/auth 'user' is sufficient. 
    // We will keep specific profile data in a Student model that links to this User or is standalone.
    // Given the requirements, 'Student' entity has specific fields like batch, course, etc.
    // So 'User' might just be for Auth, or we can use a single collection with mixed fields.
    // Strategy: 
    // Faculty -> User collection (role: faculty)
    // Student -> User collection (role: student) OR separate Student collection?
    // Requirement says Faculty Login: Username + Password, Student Login: Email + Password.
    // Let's make 'username' field flexible or add 'email'.
    email: {
        type: String,
        unique: true,
        sparse: true // Allow null/undefined to be non-unique if some don't have it
    },
    name: {
        type: String,
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
