const cloudinary = require('cloudinary').v2;
const dotenv = require('dotenv');

dotenv.config();

const { PDFDocument } = require('pdf-lib');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadImage = async (fileBuffer, folder = 'workbook', fileName = 'material', metadataName = null) => {
    try {
        let finalBuffer = fileBuffer;

        // If it's a PDF and metadataName is provided, modify its internal Title
        if (metadataName) {
            try {
                const pdfDoc = await PDFDocument.load(fileBuffer);
                pdfDoc.setTitle(metadataName);
                const modifiedPdfBytes = await pdfDoc.save();
                finalBuffer = Buffer.from(modifiedPdfBytes);
            } catch (pdfError) {
                console.warn('Could not modify PDF metadata, falling back to original buffer:', pdfError.message);
            }
        }

        const b64 = finalBuffer.toString('base64');
        const dataURI = `data:application/pdf;base64,${b64}`;

        // Sanitize material name
        const sanitizedName = fileName.replace(/[^a-z0-9]/gi, '_').toLowerCase();

        // Unique suffix to prevent Cloudinary overwriting conflicts
        const suffix = Math.round(Math.random() * 1E4);
        const public_id = `${sanitizedName}_${suffix}`;

        const options = {
            folder,
            resource_type: 'image',
            type: 'upload',
            access_mode: 'public',
            public_id: public_id,
            format: 'pdf', // Ensure it stays a PDF
            tags: ['material'],
            context: {}
        };

        if (metadataName) {
            options.tags.push(metadataName);
            options.context = {
                alt: metadataName,
                caption: metadataName
            };
        }

        const result = await cloudinary.uploader.upload(dataURI, options);
        return result;
    } catch (error) {
        console.error('Cloudinary Upload Error:', error);
        throw error;
    }
};

const uploadPhoto = async (fileBuffer, folder = 'workbook', originalName = 'photo') => {
    try {
        const b64 = fileBuffer.toString('base64');
        // Let Cloudinary handle the format. Using a generic image data URI.
        const dataURI = `data:image/png;base64,${b64}`;

        const sanitizedName = originalName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const suffix = Math.round(Math.random() * 1E4);
        const public_id = `${sanitizedName}_${suffix}`;

        const options = {
            folder,
            resource_type: 'image',
            type: 'upload',
            access_mode: 'public',
            public_id: public_id,
        };

        const result = await cloudinary.uploader.upload(dataURI, options);
        return result;
    } catch (error) {
        console.error('Cloudinary Photo Upload Error:', error);
        throw error;
    }
};

module.exports = { uploadImage, uploadPhoto };
