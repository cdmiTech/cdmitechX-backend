const Language = require('../models/Language');

// @desc    Get all languages
// @route   GET /api/languages
// @access  Private (Faculty)
const getLanguages = async (req, res) => {
    try {
        const languages = await Language.find({});
        res.status(200).json(languages);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create new language
// @route   POST /api/languages
// @access  Private (Faculty)
const createLanguage = async (req, res) => {
    if (!req.body.name) {
        return res.status(400).json({ message: 'Please add a language name' });
    }

    try {
        const languageExists = await Language.findOne({ name: req.body.name });
        if (languageExists) {
            return res.status(400).json({ message: 'Already exist' });
        }

        const language = await Language.create({
            name: req.body.name,
            facultyId: req.user.id
        });
        res.status(200).json(language);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update language
// @route   PUT /api/languages/:id
// @access  Private (Faculty)
const updateLanguage = async (req, res) => {
    try {
        const language = await Language.findById(req.params.id);

        if (!language) {
            return res.status(404).json({ message: 'Language not found' });
        }

        // Duplicate check on update
        if (req.body.name && req.body.name !== language.name) {
            const languageExists = await Language.findOne({ name: req.body.name });
            if (languageExists) {
                return res.status(400).json({ message: 'Already exist' });
            }
        }

        const updatedLanguage = await Language.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
        });

        res.status(200).json(updatedLanguage);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete language
// @route   DELETE /api/languages/:id
// @access  Private (Faculty)
const deleteLanguage = async (req, res) => {
    try {
        const language = await Language.findById(req.params.id);

        if (!language) {
            return res.status(404).json({ message: 'Language not found' });
        }

        await language.deleteOne();

        res.status(200).json({ id: req.params.id });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getLanguages,
    createLanguage,
    updateLanguage,
    deleteLanguage
};
