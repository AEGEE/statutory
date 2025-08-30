const path = require('path');
const fs = require('fs');
const multer = require('multer');
const readChunk = require('read-chunk');
const FileType = require('file-type');

const errors = require('./errors');
const log = require('./logger');
const config = require('../config');
const { Image } = require('../models');

const uploadFolderName = config.images_dir;
const allowedExtensions = ['.png', '.jpg', '.jpeg'];

const storage = multer.diskStorage({
    // multers disk storage settings
    destination(req, file, cb) {
        cb(null, uploadFolderName);
    },

    // Filename is 4 character random string and the current datetime to avoid collisions
    filename(req, file, cb) {
        const prefix = Math.random()
            .toString(36)
            .replace(/[^a-z]+/g, '')
            .substr(0, 4);
        const date = new Date().getTime();
        const extension = path.extname(file.originalname).toLowerCase();

        cb(null, `${prefix}-${date}${extension}`);
    },
});

const upload = multer({
    storage,
    limits: {
        files: 1,
    },
    fileFilter(req, file, cb) {
        const extension = path.extname(file.originalname).toLowerCase();
        if (!allowedExtensions.includes(extension)) {
            const allowed = allowedExtensions.map((e) => `'${e}'`).join(', ');
            return cb(
                new Error(
                    `Allowed extensions: ${allowed}, but '${extension}' was passed.`
                )
            );
        }

        return cb(null, true);
    },
}).single('image');

exports.uploadImage = async (req, res, next) => {
    // If upload folder doesn't exists, create it.
    if (!fs.existsSync(uploadFolderName)) {
        await fs.promises.mkdir(uploadFolderName, { recursive: true });
    }

    upload(req, res, async (err) => {
        if (err) {
            log.error('Could not store image', err);

            if (!req.file) {
                return errors.makeValidationError(res, 'No head_image is specified.');
            }

            return errors.makeValidationError(res, err);
        }

        // If the head_image field is missing, do nothing.
        if (!req.file) {
            return errors.makeValidationError(res, 'No head_image is specified.');
        }

        try {
            // If the file's content is malformed, don't save it.
            const buffer = readChunk.sync(req.file.path, 0, 4100);
            const type = await FileType.fromBuffer(buffer);

            const originalExtension = path
                .extname(req.file.originalname)
                .toLowerCase();
            const determinedExtension = type && type.ext ? `.${type.ext}` : 'unknown';

            if (
                originalExtension !== determinedExtension
        || !allowedExtensions.includes(determinedExtension)
            ) {
                try {
                    await fs.promises.unlink(req.file.path);
                } catch (unlinkErr) {
                    log.warn('Could not delete invalid file', unlinkErr);
                }
                return errors.makeValidationError(res, 'Malformed file content.');
            }

            const image = await Image.create({
                user_id: req.user.id,
                file_name: req.file.filename,
                file_folder: uploadFolderName,
            });

            req.image = image;
            return next();
        } catch (processingErr) {
            log.error('Error processing uploaded image', processingErr);

            // Clean up the uploaded file if processing fails
            if (req.file && req.file.path) {
                try {
                    await fs.promises.unlink(req.file.path);
                } catch (unlinkErr) {
                    log.warn('Could not delete file after processing error', unlinkErr);
                }
            }

            return errors.makeValidationError(
                res,
                'Error processing uploaded image.'
            );
        }
    });
};
