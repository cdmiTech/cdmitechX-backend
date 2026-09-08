const cloudinary = require('cloudinary').v2;
const dotenv = require('dotenv');

dotenv.config();

const { PDFDocument } = require('pdf-lib');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadImage = async (fileBuffer, folder = 'workbook', fileName = 'material', metadataName = null, mimetype = null, originalname = null) => {
    try {
        let finalBuffer = fileBuffer;
        const ext = originalname ? originalname.split('.').pop().toLowerCase() : (fileName.includes('.') ? fileName.split('.').pop().toLowerCase() : '');
        const isPdf = mimetype === 'application/pdf' || ext === 'pdf';

        // If it's a PDF and metadataName is provided, modify its internal Title
        if (isPdf && metadataName) {
            try {
                const pdfDoc = await PDFDocument.load(fileBuffer);
                pdfDoc.setTitle(metadataName);
                const modifiedPdfBytes = await pdfDoc.save();
                finalBuffer = Buffer.from(modifiedPdfBytes);
            } catch (pdfError) {
                console.warn('Could not modify PDF metadata, falling back to original buffer:', pdfError.message);
            }
        }

        // Sanitize material name
        const sanitizedName = fileName.replace(/\.[^/.]+$/, "").replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const suffix = Math.round(Math.random() * 1E4);
        
        // For documents/spreadsheets/archives like csv, xlsx, docx, zip, txt, explicitly use 'raw' with extension
        const isRaw = ['csv', 'xlsx', 'xls', 'doc', 'docx', 'txt', 'zip', 'rar', '7z', 'ppt', 'pptx'].includes(ext);
        const public_id = isRaw && ext ? `${sanitizedName}_${suffix}.${ext}` : `${sanitizedName}_${suffix}`;

        const options = {
            folder,
            resource_type: isRaw ? 'raw' : (isPdf ? 'image' : 'auto'),
            type: 'upload',
            access_mode: 'public',
            public_id: public_id,
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

        return new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
                if (error) {
                    console.error('Cloudinary upload_stream error:', error);
                    return reject(error);
                }
                resolve(result);
            });
            stream.end(finalBuffer);
        });
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
