const { startServer, stopServer } = require('../../lib/server');
const { request } = require('../scripts/helpers');
const mock = require('../scripts/mock-core-registry');
const generator = require('../scripts/generator');
const regularUser = require('../assets/core-valid.json').data;

describe('Applications registration', () => {
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
        await generator.clearAll();
        mock.cleanAll();
    });

    test('should not succeed for current user', async () => {
        mock.mockAll({ mainPermissions: { noPermissions: true } });

        const event = await generator.createEvent();
        await generator.createApplication({ user_id: regularUser.id }, event);

        const res = await request({
            uri: '/events/' + event.id + '/applications/me/registered',
            method: 'PUT',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: { registered: true }
        });

        expect(res.statusCode).toEqual(403);
        expect(res.body.success).toEqual(false);
        expect(res.body).toHaveProperty('message');
        expect(res.body).not.toHaveProperty('data');
    });

    test('should succeed for other user when the permissions are okay', async () => {
        const event = await generator.createEvent();
        const application = await generator.createApplication({ confirmed: true }, event);

        const res = await request({
            uri: '/events/' + event.id + '/applications/' + application.id + '/registered',
            method: 'PUT',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: { registered: true }
        });

        expect(res.statusCode).toEqual(200);
        expect(res.body.success).toEqual(true);
        expect(res.body).not.toHaveProperty('errors');
        expect(res.body).toHaveProperty('data');
        expect(res.body.data.id).toEqual(application.id);
        expect(res.body.data.confirmed).toEqual(true);
    });

    test('should fail if application is marked as departed', async () => {
        const event = await generator.createEvent();
        const application = await generator.createApplication({ confirmed: true, registered: true, departed: true }, event);

        const res = await request({
            uri: '/events/' + event.id + '/applications/' + application.id + '/registered',
            method: 'PUT',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: { registered: false }
        });

        expect(res.statusCode).toEqual(422);
        expect(res.body.success).toEqual(false);
        expect(res.body).toHaveProperty('errors');
        expect(res.body.errors).toHaveProperty('registered');
        expect(res.body).not.toHaveProperty('data');
    });

    test('should return 403 when user does not have permissions', async () => {
        mock.mockAll({ mainPermissions: { noPermissions: true } });

        const event = await generator.createEvent();
        const application = await generator.createApplication({ confirmed: true, incoming: true, attended: true }, event);

        const res = await request({
            uri: '/events/' + event.id + '/applications/' + application.id + '/registered',
            method: 'PUT',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: { registered: true }
        });

        expect(res.statusCode).toEqual(403);
        expect(res.body.success).toEqual(false);
        expect(res.body).not.toHaveProperty('data');
        expect(res.body).toHaveProperty('message');
    });

    test('should return 404 if the application is not found', async () => {
        const event = await generator.createEvent({ applications: [] });

        const res = await request({
            uri: '/events/' + event.id + '/applications/333/registered',
            method: 'PUT',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: { registered: true }
        });

        expect(res.statusCode).toEqual(404);
        expect(res.body.success).toEqual(false);
        expect(res.body).toHaveProperty('message');
        expect(res.body).not.toHaveProperty('data');
    });

    test('should return 422 if registered is invalid', async () => {
        const event = await generator.createEvent();
        const application = await generator.createApplication({ confirmed: true, incoming: true, attended: true }, event);

        const res = await request({
            uri: '/events/' + event.id + '/applications/' + application.id + '/registered',
            method: 'PUT',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: { registered: 'lalala' }
        });

        expect(res.statusCode).toEqual(422);
        expect(res.body.success).toEqual(false);
        expect(res.body).toHaveProperty('errors');
        expect(res.body).not.toHaveProperty('data');
    });

    test('should fail if the application is not marked as confirmed', async () => {
        const event = await generator.createEvent();
        const application = await generator.createApplication({ confirmed: false }, event);

        const res = await request({
            uri: '/events/' + event.id + '/applications/' + application.id + '/registered',
            method: 'PUT',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: { registered: true }
        });

        expect(res.statusCode).toEqual(422);
        expect(res.body.success).toEqual(false);
        expect(res.body).not.toHaveProperty('data');
        expect(res.body).toHaveProperty('errors');
        expect(res.body.errors).toHaveProperty('registered');
    });
});
