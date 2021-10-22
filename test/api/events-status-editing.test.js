const { startServer, stopServer } = require('../../lib/server');
const { request } = require('../scripts/helpers');
const mock = require('../scripts/mock-core-registry');
const generator = require('../scripts/generator');
const Event = require('../../models/Event');

describe('Events status editing', () => {
    beforeAll(async () => {
        await startServer();
    });

    afterAll(async () => {
        await stopServer();
    });

    beforeEach(async () => {
        mock.mockAll();
    });

    afterEach(async () => {
        mock.cleanAll();
        await generator.clearAll();
    });

    test('should disallow changing event status if user has no rights', async () => {
        mock.mockAll({ mainPermissions: { noPermissions: true } });

        const event = await generator.createEvent();

        const res = await request({
            uri: '/events/' + event.id + '/status',
            method: 'PUT',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: {
                status: 'published'
            }
        });

        expect(res.statusCode).toEqual(403);
        expect(res.body.success).toEqual(false);
        expect(res.body).toHaveProperty('message');

        const eventFromDb = await Event.findOne({ where: { id: event.id } });
        expect(eventFromDb.status).not.toEqual('published');
    });

    test('should return 404 if event is not found', async () => {
        mock.mockAll({ mainPermissions: { noPermissions: true } });

        const res = await request({
            uri: '/events/nonexistant/status',
            method: 'PUT',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: {
                status: 'published'
            }
        });

        expect(res.statusCode).toEqual(404);
        expect(res.body.success).toEqual(false);
        expect(res.body).toHaveProperty('message');
    });

    test('should disallow changing event status if status is undefined', async () => {
        const event = await generator.createEvent();

        const res = await request({
            uri: '/events/' + event.id + '/status',
            method: 'PUT',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: {}
        });

        expect(res.statusCode).toEqual(400);
        expect(res.body.success).toEqual(false);
        expect(res.body).toHaveProperty('message');
    });

    test('should disallow changing event status if status is invalid', async () => {
        const event = await generator.createEvent();

        const res = await request({
            uri: '/events/' + event.id + '/status',
            method: 'PUT',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: { status: 'not-existant' }
        });

        expect(res.statusCode).toEqual(422);
        expect(res.body.success).toEqual(false);
        expect(res.body).toHaveProperty('errors');
        expect(res.body.errors).toHaveProperty('status');

        const eventFromDb = await Event.findOne({ where: { id: event.id } });
        expect(eventFromDb.status).not.toEqual('not-existant');
    });

    test('should allow changing event status if everything is okay', async () => {
        const event = await generator.createEvent();

        const res = await request({
            uri: '/events/' + event.id + '/status',
            method: 'PUT',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: { status: 'published' }
        });

        expect(res.statusCode).toEqual(200);
        expect(res.body.success).toEqual(true);
        expect(res.body).toHaveProperty('message');

        const eventFromDb = await Event.findOne({ where: { id: event.id } });
        expect(eventFromDb.status).toEqual('published');
    });

    test('should set publication_date if changed to published', async () => {
        const event = await generator.createEvent();

        const res = await request({
            uri: '/events/' + event.id + '/status',
            method: 'PUT',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: { status: 'published' }
        });

        expect(res.statusCode).toEqual(200);
        expect(res.body.success).toEqual(true);
        expect(res.body).toHaveProperty('message');

        const eventFromDb = await Event.findOne({ where: { id: event.id } });
        expect(eventFromDb.publication_date).not.toBeNull();
    });

    test('should not set publication_date if changed to draft', async () => {
        const event = await generator.createEvent();

        const res = await request({
            uri: '/events/' + event.id + '/status',
            method: 'PUT',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: { status: 'draft' }
        });

        expect(res.statusCode).toEqual(200);
        expect(res.body.success).toEqual(true);
        expect(res.body).toHaveProperty('message');

        const eventFromDb = await Event.findOne({ where: { id: event.id } });
        expect(eventFromDb.publication_date).toBeNull();
    });
});
