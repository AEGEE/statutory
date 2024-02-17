const { startServer, stopServer } = require('../../lib/server');
const { request } = require('../scripts/helpers');
const mock = require('../scripts/mock-core-registry');
const generator = require('../scripts/generator');
const regularUser = require('../assets/core-valid.json').data;

describe('Positions listing', () => {
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

    test('should fail if not Agora', async () => {
        const event = await generator.createEvent({ type: 'epm', applications: [] });
        await generator.createPosition({}, event);

        const res = await request({
            uri: '/events/' + event.id + '/positions/',
            method: 'GET',
            headers: { 'X-Auth-Token': 'blablabla' }
        });

        expect(res.statusCode).toEqual(400);
        expect(res.body.success).toEqual(false);
        expect(res.body).not.toHaveProperty('data');
        expect(res.body).toHaveProperty('message');
    });

    test('should list all of the positions for this event', async () => {
        const firstEvent = await generator.createEvent({ type: 'agora', applications: [] });
        const firstPosition = await generator.createPosition({}, firstEvent);

        const secondEvent = await generator.createEvent({ type: 'agora', applications: [] });
        await generator.createPosition({}, secondEvent);

        const res = await request({
            uri: '/events/' + firstEvent.id + '/positions/',
            method: 'GET',
            headers: { 'X-Auth-Token': 'blablabla' }
        });

        expect(res.statusCode).toEqual(200);
        expect(res.body.success).toEqual(true);
        expect(res.body).not.toHaveProperty('errors');
        expect(res.body).toHaveProperty('data');

        expect(res.body.data.length).toEqual(1);
        expect(res.body.data[0].id).toEqual(firstPosition.id);
    });

    test('should sort positions on /', async () => {
        const firstEvent = await generator.createEvent({ type: 'agora', applications: [] });
        const firstPosition = await generator.createPosition({}, firstEvent);
        const secondPosition = await generator.createPosition({}, firstEvent);

        const res = await request({
            uri: '/events/' + firstEvent.id + '/positions/',
            method: 'GET',
            headers: { 'X-Auth-Token': 'blablabla' }
        });

        expect(res.statusCode).toEqual(200);
        expect(res.body.success).toEqual(true);
        expect(res.body).not.toHaveProperty('errors');
        expect(res.body).toHaveProperty('data');

        expect(res.body.data.length).toEqual(2);
        expect(res.body.data[0].id).toEqual(firstPosition.id);
        expect(res.body.data[1].id).toEqual(secondPosition.id);
    });

    test('should list all of the approved candidates on /approved', async () => {
        const event = await generator.createEvent({ type: 'agora', applications: [] });
        const position = await generator.createPosition({
            candidates: [generator.generateCandidate({ status: 'approved' })]
        }, event);

        const res = await request({
            uri: '/events/' + event.id + '/positions/approved',
            method: 'GET',
            headers: { 'X-Auth-Token': 'blablabla' }
        });

        expect(res.statusCode).toEqual(200);
        expect(res.body.success).toEqual(true);
        expect(res.body).not.toHaveProperty('errors');
        expect(res.body).toHaveProperty('data');

        expect(res.body.data.length).toEqual(1);
        expect(res.body.data[0].id).toEqual(position.id);
        expect(res.body.data[0].candidates.length).toEqual(1);
        expect(res.body.data[0].candidates[0]).toHaveProperty('first_name');
        expect(res.body.data[0].candidates[0]).not.toHaveProperty('email');
        expect(res.body.data[0].candidates[0]).not.toHaveProperty('notification_email');
    });

    test('should indicate that there is unapproved application on /approved', async () => {
        const event = await generator.createEvent({ type: 'agora', applications: [] });
        const position = await generator.createPosition({
            candidates: [generator.generateCandidate({ status: 'pending' })]
        }, event);

        const res = await request({
            uri: '/events/' + event.id + '/positions/approved',
            method: 'GET',
            headers: { 'X-Auth-Token': 'blablabla' }
        });

        expect(res.statusCode).toEqual(200);
        expect(res.body.success).toEqual(true);
        expect(res.body).not.toHaveProperty('errors');
        expect(res.body).toHaveProperty('data');

        expect(res.body.data.length).toEqual(1);
        expect(res.body.data[0].id).toEqual(position.id);
        expect(res.body.data[0].candidates.length).toEqual(1);
        expect(res.body.data[0].candidates[0]).not.toHaveProperty('european_experience');
    });

    test('should not list rejected applications on /approved', async () => {
        const event = await generator.createEvent({ type: 'agora', applications: [] });
        await generator.createPosition({
            candidates: [generator.generateCandidate({ status: 'rejected' })]
        }, event);

        const res = await request({
            uri: '/events/' + event.id + '/positions/approved',
            method: 'GET',
            headers: { 'X-Auth-Token': 'blablabla' }
        });

        expect(res.statusCode).toEqual(200);
        expect(res.body.success).toEqual(true);
        expect(res.body).not.toHaveProperty('errors');
        expect(res.body).toHaveProperty('data');
        expect(res.body.data.length).toEqual(1);
        expect(res.body.data[0].candidates.length).toEqual(0);
    });

    test('should sort positions on /all', async () => {
        const firstEvent = await generator.createEvent({ type: 'agora', applications: [] });
        const firstPosition = await generator.createPosition({}, firstEvent);
        const secondPosition = await generator.createPosition({}, firstEvent);

        const res = await request({
            uri: '/events/' + firstEvent.id + '/positions/approved',
            method: 'GET',
            headers: { 'X-Auth-Token': 'blablabla' }
        });

        expect(res.statusCode).toEqual(200);
        expect(res.body.success).toEqual(true);
        expect(res.body).not.toHaveProperty('errors');
        expect(res.body).toHaveProperty('data');

        expect(res.body.data.length).toEqual(2);
        expect(res.body.data[0].id).toEqual(firstPosition.id);
        expect(res.body.data[1].id).toEqual(secondPosition.id);
    });

    test('should not list any deleted positions', async () => {
        const event = await generator.createEvent({ type: 'agora', applications: [] });
        await generator.createPosition({
            deleted: true
        }, event);

        const res = await request({
            uri: '/events/' + event.id + '/positions/all',
            method: 'GET',
            headers: { 'X-Auth-Token': 'blablabla' }
        });

        expect(res.statusCode).toEqual(200);
        expect(res.body.success).toEqual(true);
        expect(res.body).not.toHaveProperty('errors');
        expect(res.body).toHaveProperty('data');
        expect(res.body.data.length).toEqual(0);
    });

    test('should list all applications on /all', async () => {
        const event = await generator.createEvent({ type: 'agora', applications: [] });
        await generator.createPosition({
            candidates: [
                generator.generateCandidate({ user_id: 1, status: 'rejected' }),
                generator.generateCandidate({ user_id: 2, status: 'approved' }),
                generator.generateCandidate({ user_id: 3, status: 'pending' })
            ]
        }, event);

        const res = await request({
            uri: '/events/' + event.id + '/positions/all',
            method: 'GET',
            headers: { 'X-Auth-Token': 'blablabla' }
        });

        expect(res.statusCode).toEqual(200);
        expect(res.body.success).toEqual(true);
        expect(res.body).not.toHaveProperty('errors');
        expect(res.body).toHaveProperty('data');
        expect(res.body.data.length).toEqual(1);
        expect(res.body.data[0].candidates.length).toEqual(3);
    });

    test('should return 403 if you don\'t have permissions on /all', async () => {
        mock.mockAll({ mainPermissions: { noPermissions: true } });

        const event = await generator.createEvent({ type: 'agora', applications: [] });
        await generator.createPosition({
            candidates: [
                generator.generateCandidate({ user_id: 1, status: 'rejected' }),
                generator.generateCandidate({ user_id: 2, status: 'approved' }),
                generator.generateCandidate({ user_id: 3, status: 'pending' })
            ]
        }, event);

        const res = await request({
            uri: '/events/' + event.id + '/positions/all',
            method: 'GET',
            headers: { 'X-Auth-Token': 'blablabla' }
        });

        expect(res.statusCode).toEqual(403);
        expect(res.body.success).toEqual(false);
        expect(res.body).not.toHaveProperty('data');
        expect(res.body).toHaveProperty('message');
    });

    test('should sort positions on /all', async () => {
        const firstEvent = await generator.createEvent({ type: 'agora', applications: [] });
        const firstPosition = await generator.createPosition({}, firstEvent);
        const secondPosition = await generator.createPosition({}, firstEvent);

        const res = await request({
            uri: '/events/' + firstEvent.id + '/positions/all',
            method: 'GET',
            headers: { 'X-Auth-Token': 'blablabla' }
        });

        expect(res.statusCode).toEqual(200);
        expect(res.body.success).toEqual(true);
        expect(res.body).not.toHaveProperty('errors');
        expect(res.body).toHaveProperty('data');

        expect(res.body.data.length).toEqual(2);
        expect(res.body.data[0].id).toEqual(firstPosition.id);
        expect(res.body.data[1].id).toEqual(secondPosition.id);
    });

    test('should return my positions on /mine', async () => {
        mock.mockAll({ mainPermissions: { noPermissions: true } });

        const event = await generator.createEvent({ type: 'agora', applications: [] });
        await generator.createPosition({
            candidates: [
                generator.generateCandidate({ status: 'rejected', user_id: regularUser.bodies[0].id }),
            ]
        }, event);

        const res = await request({
            uri: '/events/' + event.id + '/positions/candidates/mine',
            method: 'GET',
            headers: { 'X-Auth-Token': 'blablabla' }
        });

        expect(res.statusCode).toEqual(200);
        expect(res.body.success).toEqual(true);
        expect(res.body).toHaveProperty('data');
        expect(res.body).not.toHaveProperty('errorss');
    });

    test('should sort candidates on /all', async () => {
        const event = await generator.createEvent({ type: 'agora', applications: [] });
        const position = await generator.createPosition({}, event);

        const firstCandidate = await generator.createCandidate({ user_id: 1 }, position);
        const secondCandidate = await generator.createCandidate({ user_id: 2 }, position);
        const thirdCandidate = await generator.createCandidate({ user_id: 3 }, position);

        const res = await request({
            uri: '/events/' + event.id + '/positions/all',
            method: 'GET',
            headers: { 'X-Auth-Token': 'blablabla' }
        });

        expect(res.statusCode).toEqual(200);
        expect(res.body.success).toEqual(true);
        expect(res.body).not.toHaveProperty('errors');
        expect(res.body).toHaveProperty('data');

        expect(res.body.data.length).toEqual(1);
        expect(res.body.data[0].candidates.length).toEqual(3);
        expect(res.body.data[0].candidates[0].id).toEqual(firstCandidate.id);
        expect(res.body.data[0].candidates[1].id).toEqual(secondCandidate.id);
        expect(res.body.data[0].candidates[2].id).toEqual(thirdCandidate.id);
    });

    test('should sort candidates on /approved', async () => {
        const event = await generator.createEvent({ type: 'agora', applications: [] });
        const position = await generator.createPosition({}, event);

        const firstCandidate = await generator.createCandidate({ user_id: 1, status: 'approved' }, position);
        const secondCandidate = await generator.createCandidate({ user_id: 2, status: 'approved' }, position);
        const thirdCandidate = await generator.createCandidate({ user_id: 3, status: 'approved' }, position);

        const res = await request({
            uri: '/events/' + event.id + '/positions/approved',
            method: 'GET',
            headers: { 'X-Auth-Token': 'blablabla' }
        });

        expect(res.statusCode).toEqual(200);
        expect(res.body.success).toEqual(true);
        expect(res.body).not.toHaveProperty('errors');
        expect(res.body).toHaveProperty('data');

        expect(res.body.data.length).toEqual(1);
        expect(res.body.data[0].candidates.length).toEqual(3);
        expect(res.body.data[0].candidates[0].id).toEqual(firstCandidate.id);
        expect(res.body.data[0].candidates[1].id).toEqual(secondCandidate.id);
        expect(res.body.data[0].candidates[2].id).toEqual(thirdCandidate.id);
    });
});
