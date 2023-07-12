const path = require('path');
const fs = require('fs');

const { Sequelize, sequelize } = require('../lib/sequelize');
const logger = require('../lib/logger');

const Image = sequelize.define('image', {
    user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: '',
        validate: {
            notEmpty: { msg: 'User ID should be set.' },
        }
    },
    file_name: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: '',
        validate: {
            notEmpty: { msg: 'File name should be set.' },
        }
    },
    file_folder: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: '',
        validate: {
            notEmpty: { msg: 'Folder should be set.' },
        }
    },
    file_path_absolute: {
        type: Sequelize.VIRTUAL,
        get() {
            return path.join(this.file_folder, this.file_name);
        }
    },
    frontend_path: {
        type: Sequelize.VIRTUAL,
        get() {
            return '/' + this.file_name;
        }
    },
}, {
    underscored: true,
    tableName: 'images',
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

Image.afterDestroy(async (image) => {
    // fs-extra just swallows the error if the file couldn't be deleted.
    const fileName = path.join(image.file_folder, image.file_name);
    try {
        await fs.promises.unlink(fileName);
    } catch (err) {
        logger.warn({ err }, `Could not remove file ${fileName} when deleting image`);
    }
});

module.exports = Image;
