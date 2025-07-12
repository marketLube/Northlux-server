const AWS = require('aws-sdk');
const { Readable } = require('stream');
require('dotenv').config();

// AWS S3 Configuration
const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME;

// Convert Buffer to Stream
const bufferToStream = (buffer) => {
    return Readable.from(buffer);
};

// Generate a unique filename with timestamp
const generateUniqueFilename = (originalName = '') => {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const cleanName = originalName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    return `${cleanName}_${timestamp}_${randomString}`;
};

// Upload to S3 (formerly uploadToCloudinary)
const uploadToCloudinary = async (buffer, options = {}) => {
    
    try {
        const {
            folder = 'Northlux/uploads',
            filename = generateUniqueFilename('image')
        } = options;

        // Ensure the key has proper path structure
        const key = `${folder}/${filename}.jpg`;

        const params = {
            Bucket: BUCKET_NAME,
            Key: key,
            Body: buffer,
            ContentType: 'image/jpeg', // You might want to make this dynamic based on actual file type
        };

        const result = await s3.upload(params).promise();
        return result.Location;

    } catch (error) {
        console.error('Error uploading to S3:', error);
        throw new Error(`Failed to upload image: ${error.message}`);
    }
};

// Upload multiple files to S3
const uploadMultipleToS3 = async (files, options = {} ) => {
    try {
        const uploadPromises = files.map(file => uploadToCloudinary(file.buffer, options));
        return await Promise.all(uploadPromises);
    } catch (error) {
        console.error('Error uploading multiple files to S3:', error);
        throw new Error(`Failed to upload multiple images: ${error.message}`);
    }
};

const deleteFromS3 = async (key) => {
    try {
        let extractedKey;
        if (key.includes('amazonaws.com')) {
            // Extract everything after the bucket name
            extractedKey = key.split('.com/')[1];
        } else {
            extractedKey = key;
        }
        
        const params = {
            Bucket: BUCKET_NAME,
            Key: extractedKey
        };
        await s3.deleteObject(params).promise();
    } catch (error) {
        console.error('Error deleting from S3:', error);
        throw new Error(`Failed to delete image: ${error.message}`);
    }
};

module.exports = {
    uploadToCloudinary,
    uploadMultipleToS3,
    generateUniqueFilename,
    deleteFromS3
};
