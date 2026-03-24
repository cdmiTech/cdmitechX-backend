const Topic = require('../models/Topic');

// @desc    Get topics
// @route   GET /api/topics
// @access  Private
const getTopics = async (req, res) => {
    try {
        let query = {};

        if (req.query.languageId) {
            query.languageId = req.query.languageId;
        }

        const topics = await Topic.find(query)
            .populate('languageId', 'name')
            .sort({ order: 1, createdAt: 1 }); // Sort by order, then creation Date
        res.status(200).json(topics);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create topic
// @route   POST /api/topics
// @access  Private (Faculty)
const createTopic = async (req, res) => {
    const { name, languageId } = req.body;

    if (!name || !languageId) {
        return res.status(400).json({ message: 'Please add all fields' });
    }

    try {
        const topicExists = await Topic.findOne({
            name,
            languageId
        });

        if (topicExists) {
            return res.status(400).json({ message: 'Already exist' });
        }

        const topicCount = await Topic.countDocuments({ languageId });

        const topic = await Topic.create({
            name,
            languageId,
            facultyId: req.user.id,
            order: topicCount
        });
        res.status(200).json(topic);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update topic
// @route   PUT /api/topics/:id
// @access  Private (Faculty)
const updateTopic = async (req, res) => {
    try {
        const topic = await Topic.findById(req.params.id);

        if (!topic) {
            return res.status(404).json({ message: 'Topic not found' });
        }

        // Duplicate check on update
        const newName = req.body.name || topic.name;
        const newLanguageId = req.body.languageId || topic.languageId;

        if (newName !== topic.name || newLanguageId.toString() !== topic.languageId.toString()) {
            const topicExists = await Topic.findOne({
                name: newName,
                languageId: newLanguageId
            });
            if (topicExists) {
                return res.status(400).json({ message: 'Already exist' });
            }
        }

        const updatedTopic = await Topic.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
        }).populate('languageId', 'name');

        res.status(200).json(updatedTopic);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete topic
// @route   DELETE /api/topics/:id
// @access  Private (Faculty)
const deleteTopic = async (req, res) => {
    try {
        const topic = await Topic.findById(req.params.id);

        if (!topic) {
            return res.status(404).json({ message: 'Topic not found' });
        }

        if (topic.facultyId.toString() !== req.user.id) {
            // Permission check removed for global faculty access
        }

        await topic.deleteOne();

        res.status(200).json({ id: req.params.id });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Reorder topics
// @route   PATCH /api/topics/reorder
// @access  Private (Faculty)
const reorderTopics = async (req, res) => {
    try {
        const { topics } = req.body;

        if (!Array.isArray(topics)) {
            return res.status(400).json({ message: 'Invalid data format' });
        }

        const bulkOps = topics.map(({ _id, order }) => ({
            updateOne: {
                filter: { _id }, // Removed ownership check
                update: { $set: { order } }
            }
        }));

        if (bulkOps.length > 0) {
            await Topic.bulkWrite(bulkOps);
        }

        res.status(200).json({ message: 'Order updated successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getTopics,
    createTopic,
    updateTopic,
    deleteTopic,
    reorderTopics
};
