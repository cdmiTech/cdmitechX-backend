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
    limits: { fileSize: 25 * 1024 * 1024 } // 25MB limit, accepts any file format
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
    .post(upload.fields([{ name: 'pdf', maxCount: 1 }, { name: 'file', maxCount: 1 }]), (req, res, next) => {
        if (req.files) {
            req.file = req.files['pdf']?.[0] || req.files['file']?.[0];
        }
        next();
    }, createMaterial)
    .get(getMaterials);

router.route('/:id')
    .put(updateMaterial)
    .delete(deleteMaterial);

router.put('/:id/name', updateMaterialName);
router.post('/:id/append', upload.fields([{ name: 'pdf' }, { name: 'file' }, { name: 'files' }]), (req, res, next) => {
    if (req.files) {
        req.files = [
            ...(req.files['pdf'] || []),
            ...(req.files['file'] || []),
            ...(req.files['files'] || [])
        ];
    }
    next();
}, appendPDF);

router.delete('/:id/pdf/:p1/:p2/:p3', (req, res, next) => {
    // Specifically handle workbook/materials/filename
    req.params.public_id = `${req.params.p1}/${req.params.p2}/${req.params.p3}`;
    deletePDF(req, res, next);
});
router.delete('/:id/pdf/:p1/:p2', (req, res, next) => {
    req.params.public_id = `${req.params.p1}/${req.params.p2}`;
    deletePDF(req, res, next);
});
router.delete('/:id/pdf/:public_id', (req, res, next) => {
    deletePDF(req, res, next);
});

module.exports = router;
