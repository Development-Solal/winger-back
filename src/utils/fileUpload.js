const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const O2SWITCH_UPLOAD_URL = process.env.O2SWITCH_UPLOAD_URL || 'https://preprod-upload-service.winger.fr/upload';
const O2SWITCH_BASE_URL = process.env.O2SWITCH_BASE_URL || 'https://preprod-upload-service.winger.fr/upload';

/**
 * Generate filename based on type
 * @param {string} originalname - Original filename
 * @param {string} type - File type
 * @param {string} customId - Custom ID (for invoices)
 * @returns {string} Generated filename
 */
const generateFilename = (originalname, type = 'file', customId = null) => {
    const extension = path.extname(originalname);
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);

    switch(type) {
        case 'aidant-profile-pic':
            return `aidant-profile-pic-${uniqueSuffix}${extension}`;

        case 'aide-profile-pic':
            return `aide-profile-pic-${uniqueSuffix}${extension}`;

        case 'invoice':
            // Format: paymentId.pdf
            return customId ? `${customId}.pdf` : `invoice-${uniqueSuffix}.pdf`;

        default:
            return `file-${uniqueSuffix}${extension}`;
    }
};

/**
 * Determine path based on type
 * @param {string} type - File type
 * @returns {string} Relative path
 */
const getRelativePath = (type) => {
    switch(type) {
        case 'aidant-profile-pic':
        case 'aidant-pro-profile-pic':
            return 'aidant/profile_pics';

        case 'aide-profile-pic':
            return 'aide/profile_pics';

        case 'invoice':
            return 'invoice';

        default:
            return 'uploads';
    }
};

/**
 * Upload file to o2switch
 * @param {string} localFilePath - Local temporary path
 * @param {string} type - File type
 * @param {string} customId - Custom ID (optional)
 * @returns {Promise<Object>} { url, path, filename }
 */
const uploadToO2Switch = async (localFilePath, type, customId = null) => {
    try {
        const originalname = path.basename(localFilePath);
        const filename = generateFilename(originalname, type, customId);
        const relativePath = getRelativePath(type);

        const form = new FormData();
        form.append('path', relativePath);
        form.append('filename', filename);
        form.append('file', fs.createReadStream(localFilePath));

        const response = await axios.post(O2SWITCH_UPLOAD_URL, form, {
            headers: {
                ...form.getHeaders(),
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            timeout: 60000
        });

        return {
            url: response.data.url,
            path: `${relativePath}/${filename}`,
            filename: filename
        };

    } catch (error) {
        console.error('o2switch upload error:', error.message);
        throw new Error(`Failed to upload to o2switch: ${error.message}`);
    }
};

/**
 * Delete temporary file
 */
const cleanupTempFile = async (filePath) => {
    try {
        await fs.promises.unlink(filePath);
    } catch (error) {
        console.error('Cleanup error:', error.message);
    }
};

/**
 * Get full URL from DB stored path
 * @param {string} filePath - Relative path (e.g., "aidant/profile_pics/aidant-profile-pic-123.jpg")
 * @returns {string} Full URL
 */
const getPublicUrl = (filePath) => {
    if (!filePath) return null;
    return `${O2SWITCH_BASE_URL}/uploads/${filePath}`;
};

module.exports = {
    generateFilename,
    getRelativePath,
    uploadToO2Switch,
    cleanupTempFile,
    getPublicUrl
};