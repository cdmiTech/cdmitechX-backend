const Material = require('../models/Material');
const Student = require('../models/Student');
const { uploadImage } = require('../utils/cloudinary');
const cloudinary = require('cloudinary').v2;

// @desc    Create new material
// @route   POST /api/materials
// @access  Private (Faculty/Admin)
exports.createMaterial = async (req, res) => {
    try {
        const { name, courseIds } = req.body;
        const file = req.file;

        if (!name || !courseIds) {
            return res.status(400).json({ message: 'Please provide name and courses' });
        }

        let pdfs = [];
        if (file) {
            // Upload to Cloudinary with descriptive name
            // Upload to Cloudinary with descriptive name and metadata
            const result = await uploadImage(file.buffer, 'workbook/materials', name, name);
            pdfs.push({
                name: name,
                url: result.secure_url,
                public_id: result.public_id,
                resource_type: result.resource_type
            });
        }


        const materialCount = await Material.countDocuments({ facultyId: req.user.id });

        const material = await Material.create({
            name,
            courseIds: typeof courseIds === 'string' ? JSON.parse(courseIds) : courseIds,
            pdfs,
            order: materialCount,
            facultyId: req.user.id
        });

        res.status(201).json(material);
    } catch (error) {
        console.error('Error creating material:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get all materials for faculty
// @route   GET /api/materials
// @access  Private (Faculty/Admin)
exports.getMaterials = async (req, res) => {
    try {
        const query = {}; // Return all materials for faculty/admin


        const materials = await Material.find(query).populate('courseIds', 'name').sort({ order: 1, createdAt: 1 });
        res.status(200).json(materials);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Update material name
// @route   PUT /api/materials/:id/name
// @access  Private (Faculty/Admin)
exports.updateMaterialName = async (req, res) => {
    try {
        const { name } = req.body;
        const material = await Material.findById(req.params.id);

        if (!material) {
            return res.status(404).json({ message: 'Material not found' });
        }

        material.name = name;
        await material.save();

        res.status(200).json(material);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Append PDF to existing material
// @route   POST /api/materials/:id/append
// @access  Private (Faculty/Admin)
exports.appendPDF = async (req, res) => {
    try {
        const { name } = req.body;
        const files = req.files;
        if (!files || files.length === 0) {
            return res.status(400).json({ message: 'Please provide at least one PDF file' });
        }

        const material = await Material.findById(req.params.id);
        if (!material) {
            return res.status(404).json({ message: 'Material not found' });
        }

        // Check for duplicate sub-material name
        if (name && material.pdfs.some(pdf => pdf.name === name)) {
            return res.status(400).json({ message: 'already have that sub material' });
        }

        let index = 0;
        for (const file of files) {
            let finalName = name || file.originalname;
            if (name && index > 0) {
                finalName = `${name}-${index}`;
            }

            // Upload to Cloudinary with descriptive name and metadata
            const result = await uploadImage(file.buffer, 'workbook/materials', finalName, finalName);

            const pdfCount = material.pdfs.length;

            console.log('Append Final Result:', {
                url: result.secure_url,
                resource_type: result.resource_type,
                public_id: result.public_id
            });

            material.pdfs.push({
                name: finalName,
                url: result.secure_url,
                public_id: result.public_id,
                resource_type: result.resource_type,
                order: pdfCount
            });
            index++;
        }

        await material.save();
        res.status(200).json(material);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Update material name and courses
// @route   PUT /api/materials/:id
// @access  Private (Faculty/Admin)
exports.updateMaterial = async (req, res) => {
    try {
        const { name, courseIds } = req.body;
        const material = await Material.findById(req.params.id);

        if (!material) {
            return res.status(404).json({ message: 'Material not found' });
        }

        if (name) material.name = name;
        if (courseIds) material.courseIds = typeof courseIds === 'string' ? JSON.parse(courseIds) : courseIds;

        await material.save();
        const updatedMaterial = await material.populate('courseIds', 'name');

        res.status(200).json(updatedMaterial);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Delete single PDF from material
// @route   DELETE /api/materials/:id/pdf/:public_id
// @access  Private (Faculty/Admin)
exports.deletePDF = async (req, res) => {
    try {
        const material = await Material.findById(req.params.id);
        if (!material) {
            return res.status(404).json({ message: 'Material not found' });
        }

        const public_id = req.params.public_id;

        // Remove from Cloudinary
        await cloudinary.uploader.destroy(public_id);

        // Remove from array
        material.pdfs = material.pdfs.filter(pdf => pdf.public_id !== public_id);

        await material.save();
        res.status(200).json(material);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Delete entire material
// @route   DELETE /api/materials/:id
// @access  Private (Faculty/Admin)
exports.deleteMaterial = async (req, res) => {
    try {
        const material = await Material.findById(req.params.id);
        if (!material) {
            return res.status(404).json({ message: 'Material not found' });
        }

        // Delete all PDFs from Cloudinary
        for (const pdf of material.pdfs) {
            await cloudinary.uploader.destroy(pdf.public_id);
        }

        await material.deleteOne();
        res.status(200).json({ message: 'Material deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
// @desc    Get materials for student (filtered by student's course)
// @route   GET /api/materials/student
// @access  Private (Student)
exports.getStudentMaterials = async (req, res) => {
    try {
        // Find the student profile based on the authenticated user's email
        const student = await Student.findOne({ email: req.user.email });
        if (!student) {
            return res.status(404).json({ message: 'Student profile not found' });
        }

        // Fetch materials that include the student's courseId in their courseIds array
        const materials = await Material.find({
            courseIds: student.courseId
        }).populate('courseIds', 'name').sort({ order: 1, createdAt: 1 });

        res.status(200).json(materials);
    } catch (error) {
        console.error('Error fetching student materials:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Reorder materials
// @route   PATCH /api/materials/reorder
// @access  Private (Faculty/Admin)
exports.reorderMaterials = async (req, res) => {
    try {
        const { materials } = req.body;

        if (!Array.isArray(materials)) {
            return res.status(400).json({ message: 'Invalid data format' });
        }

        const bulkOps = materials.map(({ _id, order }) => ({
            updateOne: {
                filter: { _id }, // Removed ownership check
                update: { $set: { order } }
            }
        }));

        if (bulkOps.length > 0) {
            await Material.bulkWrite(bulkOps);
        }

        res.status(200).json({ message: 'Materials order updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Reorder PDFs within a material
// @route   PATCH /api/materials/:id/reorder-pdfs
// @access  Private (Faculty/Admin)
exports.reorderPDFs = async (req, res) => {
    try {
        const { pdfs } = req.body;
        const material = await Material.findById(req.params.id);

        if (!material) {
            return res.status(404).json({ message: 'Material not found' });
        }

        if (!Array.isArray(pdfs)) {
            return res.status(400).json({ message: 'Invalid data format' });
        }

        // Reorder the pdfs array based on the provided order of public_ids or full objects
        // Assuming pdfs is an array of objects with public_id and order
        const newPdfs = [...material.pdfs];
        
        // Map current pdfs for quick lookup
        const pdfMap = {};
        newPdfs.forEach(p => { pdfMap[p.public_id] = p; });

        // Create new array in correct order
        const reorderedPdfs = pdfs.map(p => {
            const originalPdf = pdfMap[p.public_id];
            if (originalPdf) {
                originalPdf.order = p.order;
                return originalPdf;
            }
            return null;
        }).filter(p => p !== null);

        // Sort by order
        reorderedPdfs.sort((a, b) => a.order - b.order);

        material.pdfs = reorderedPdfs;
        await material.save();

        res.status(200).json(material);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
