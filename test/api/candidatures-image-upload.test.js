const fs = require('fs');
const path = require('path');
const { rimraf } = require('rimraf');

const { startServer, stopServer } = require('../../lib/server');
const { request } = require('../scripts/helpers');
const mock = require('../scripts/mock-core-registry');
const generator = require('../scripts/generator');
const { Image } = require('../../models');
const config = require('../../config');

describe('Candidates image upload', () => {
    let event;
    let position;
    let candidate;

    beforeAll(async () => {
        await startServer();
    });

    afterAll(async () => {
        await stopServer();
    });

    beforeEach(async () => {
        event = await generator.createEvent({ type: 'agora' });
        position = await generator.createPosition({}, event);
        candidate = await generator.createCandidate({}, position);

        mock.mockAll();
    });

    afterEach(async () => {
        mock.cleanAll();

        await generator.clearAll();
        await rimraf(config.images_dir);
    });

    it('should create an upload folder if it doesn\'t exist', async () => {
        await rimraf(config.images_dir);

        await request({
            uri: '/events/' + event.id + '/positions/' + position.id + '/candidates/' + candidate.id + '/image',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            formData: {
                image: fs.createReadStream('./test/assets/valid_image.png')
            }
        });

        expect(fs.existsSync(config.images_dir)).toEqual(true);
    });

    it('should fail if the uploaded file is not an image (by extension)', async () => {
        const res = await request({
            uri: '/events/' + event.id + '/positions/' + position.id + '/candidates/' + candidate.id + '/image',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            formData: {
                image: fs.createReadStream('./test/assets/invalid_image.txt')
            }
        });

        expect(res.statusCode).toEqual(422);

        expect(res.body.success).toEqual(false);
        expect(res.body).toHaveProperty('message');
    });

    it('should fail if the uploaded file is not an image (by content)', async () => {
        const res = await request({
            uri: '/events/' + event.id + '/positions/' + position.id + '/candidates/' + candidate.id + '/image',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            formData: {
                image: {
                    value: fs.createReadStream('./test/assets/invalid_image.txt'),
                    options: {
                        filename: 'image.jpg'
                    }
                }
            }
        });

        expect(res.statusCode).toEqual(422);

        expect(res.body.success).toEqual(false);
        expect(res.body).toHaveProperty('message');
    });

    it('should fail the \'image\' field is not specified', async () => {
        const res = await request({
            uri: '/events/' + event.id + '/positions/' + position.id + '/candidates/' + candidate.id + '/image',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            formData: {}
        });

        expect(res.statusCode).toEqual(422);

        expect(res.body.success).toEqual(false);
        expect(res.body.message).toEqual('No head_image is specified.');
    });

    it('should upload a file if it\'s valid', async () => {
        const res = await request({
            uri: '/events/' + event.id + '/positions/' + position.id + '/candidates/' + candidate.id + '/image',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            formData: {
                image: fs.createReadStream('./test/assets/valid_image.png')
            }
        });

        expect(res.statusCode).toEqual(200);
        expect(res.body.success).toEqual(true);
        expect(res.body).toHaveProperty('data');
        expect(res.body.data).toHaveProperty('image');
        expect(res.body.data.image).toHaveProperty('file_path_absolute');

        const imgPath = path.join(
            __dirname,
            '..',
            '..',
            res.body.data.image.file_path_absolute
        );
        expect(fs.existsSync(imgPath)).toEqual(true);
    });

    it('should remove the old file', async () => {
        // Uploading
        const firstRequest = await request({
            uri: '/events/' + event.id + '/positions/' + position.id + '/candidates/' + candidate.id + '/image',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            formData: {
                image: fs.createReadStream('./test/assets/valid_image.png')
            }
        });

        expect(firstRequest.statusCode).toEqual(200);

        const oldImgPath = path.join(
            __dirname,
            '..',
            '..',
            firstRequest.body.data.image.file_path_absolute
        );
        const oldImgId = firstRequest.body.data.image.id;

        const res = await request({
            uri: '/events/' + event.id + '/positions/' + position.id + '/candidates/' + candidate.id + '/image',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            formData: {
                image: fs.createReadStream('./test/assets/valid_image.png')
            }
        });

        expect(res.statusCode).toEqual(200);
        expect(res.body.success).toEqual(true);
        expect(res.body).toHaveProperty('data');
        expect(res.body.data).toHaveProperty('image');
        expect(res.body.data.image).toHaveProperty('file_path_absolute');

        expect(fs.existsSync(oldImgPath)).toEqual(false);

        const imagesCount = await Image.findByPk(oldImgId);
        expect(imagesCount).toBeFalsy();
    });

    it('should fail if no permissions', async () => {
        mock.mockAll({ mainPermissions: { noPermissions: true } });
        const res = await request({
            uri: '/events/' + event.id + '/positions/' + position.id + '/candidates/' + candidate.id + '/image',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            formData: {
                image: fs.createReadStream('./test/assets/valid_image.png')
            }
        });

        expect(res.statusCode).toEqual(403);
        expect(res.body.success).toEqual(false);
        expect(res.body).not.toHaveProperty('data');
        expect(res.body).toHaveProperty('message');
    });

    it('should not crash when the file deletion cannot be done', async () => {
        // Uploading
        const firstRequest = await request({
            uri: '/events/' + event.id + '/positions/' + position.id + '/candidates/' + candidate.id + '/image',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            formData: {
                image: fs.createReadStream('./test/assets/valid_image.png')
            }
        });

        expect(firstRequest.statusCode).toEqual(200);

        const oldImgPath = path.join(
            __dirname,
            '..',
            '..',
            firstRequest.body.data.image.file_path_absolute
        );
        await fs.promises.unlink(oldImgPath);

        const res = await request({
            uri: '/events/' + event.id + '/positions/' + position.id + '/candidates/' + candidate.id + '/image',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            formData: {
                image: fs.createReadStream('./test/assets/valid_image.png')
            }
        });

        expect(res.statusCode).toEqual(200);
        expect(res.body.success).toEqual(true);
        expect(res.body).toHaveProperty('data');
    });
});
