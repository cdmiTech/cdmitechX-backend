const express = require('express');
const router = express.Router();
const { getTopics, createTopic, updateTopic, deleteTopic, reorderTopics } = require('../controllers/topicController');
const { protect, facultyOnly } = require('../middleware/authMiddleware');

router.route('/')
    .get(protect, getTopics)
    .post(protect, facultyOnly, createTopic);

router.patch('/reorder', protect, facultyOnly, reorderTopics);

router.route('/:id')
    .put(protect, facultyOnly, updateTopic)
    .delete(protect, facultyOnly, deleteTopic);

module.exports = router;
