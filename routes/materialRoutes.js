const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
    createMaterial,
    getMaterials,
    updateMaterialName,
    updateMaterial,
    appendPDF,
    deletePDF,
    deleteMaterial,
    getStudentMaterials,
    reorderMaterials,
    reorderPDFs
} = require('../controllers/materialController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Multer config
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed'), false);
        }
    }
});

// All routes protected
router.use(protect);

// Student access to materials
router.get('/student', authorize('student'), getStudentMaterials);

// Restrict other routes to faculty/admin
router.use(authorize('faculty', 'admin'));

router.patch('/reorder', reorderMaterials);
router.patch('/:id/reorder-pdfs', reorderPDFs);

router.route('/')
    .post(upload.single('pdf'), createMaterial)
    .get(getMaterials);

router.route('/:id')
    .put(updateMaterial)
    .delete(deleteMaterial);

router.put('/:id/name', updateMaterialName);
router.post('/:id/append', upload.array('pdf'), appendPDF);
router.delete('/:id/pdf/:p1/:p2/:p3', (req, res, next) => {
    // Specifically handle workbook/materials/filename
    req.params.public_id = `${req.params.p1}/${req.params.p2}/${req.params.p3}`;
    deletePDF(req, res, next);
});

module.exports = router;
