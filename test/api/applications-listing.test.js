const moment = require('moment');
const tk = require('timekeeper');

const { startServer, stopServer } = require('../../lib/server.js');
const constants = require('../../lib/constants');

const { request } = require('../scripts/helpers');
const mock = require('../scripts/mock-core-registry');
const generator = require('../scripts/generator');

describe('Applications listing', () => {
    beforeEach(async () => {
        mock.mockAll();
        await startServer();
    });

    afterEach(async () => {
        await stopServer();
        await generator.clearAll();
        mock.cleanAll();
    });

    test('should display everything if the user has permissions on /all', async () => {
        const event = await generator.createEvent();

        const res = await request({
            uri: '/events/' + event.id + '/applications/all',
            method: 'GET',
            headers: { 'X-Auth-Token': 'blablabla' }
        });

        expect(res.statusCode).toEqual(200);
        expect(res.body.success).toEqual(true);
        expect(res.body).not.toHaveProperty('errors');
        expect(res.body).toHaveProperty('data');

        const applicationIds = event.applications.map(a => a.id);
        expect(res.body.data.length).toEqual(applicationIds.length);

        for (const application of res.body.data) {
            expect(applicationIds).toContain(application.id);
        }
    });

    test('should result in an error if user does not have permission on /all', async () => {
        mock.mockAll({ mainPermissions: { noPermissions: true } });
        const event = await generator.createEvent();

        const res = await request({
            uri: '/events/' + event.id + '/applications/all',
            method: 'GET',
            headers: { 'X-Auth-Token': 'blablabla' }
        });

        expect(res.statusCode).toEqual(403);
        expect(res.body.success).toEqual(false);
        expect(res.body).toHaveProperty('message');
        expect(res.body).not.toHaveProperty('data');
    });

    test('should return 403 if no rights and before the deadline on /accepted', async () => {
        mock.mockAll({ mainPermissions: { noPermissions: true } });
        const event = await generator.createEvent();
        await generator.createApplication({ status: 'pending' }, event);

        const res = await request({
            uri: '/events/' + event.id + '/applications/accepted',
            method: 'GET',
            headers: { 'X-Auth-Token': 'blablabla' }
        });

        expect(res.statusCode).toEqual(403);
        expect(res.body.success).toEqual(false);
        expect(res.body).not.toHaveProperty('data');
        expect(res.body).toHaveProperty('message');
    });

    test('should display accepted application on /accepted', async () => {
        mock.mockAll({ mainPermissions: { noPermissions: true } });
        const event = await generator.createEvent();
        const application = await generator.createApplication({ status: 'accepted' }, event);

        tk.travel(moment(event.participants_list_publish_deadline).add(5, 'minutes').toDate());

        const res = await request({
            uri: '/events/' + event.id + '/applications/accepted',
            method: 'GET',
            headers: { 'X-Auth-Token': 'blablabla' }
        });

        tk.reset();

        expect(res.statusCode).toEqual(200);
        expect(res.body.success).toEqual(true);
        expect(res.body).not.toHaveProperty('errors');
        expect(res.body).toHaveProperty('data');
        expect(res.body.data.length).toEqual(1);
        expect(res.body.data[0].id).toEqual(application.id);

        expect(Object.keys(res.body.data[0]).length).toEqual(constants.ALLOWED_PARTICIPANTS_LIST_FIELDS.length);
        for (const field of constants.ALLOWED_PARTICIPANTS_LIST_FIELDS) {
            expect(res.body.data[0]).toHaveProperty(field);
        }
    });

    test('should not display not accepted application on /accepted', async () => {
        mock.mockAll({ mainPermissions: { noPermissions: true } });
        const event = await generator.createEvent();
        await generator.createApplication({ status: 'pending' }, event);

        tk.travel(moment(event.participants_list_publish_deadline).add(5, 'minutes').toDate());

        const res = await request({
            uri: '/events/' + event.id + '/applications/accepted',
            method: 'GET',
            headers: { 'X-Auth-Token': 'blablabla' }
        });

        tk.reset();

        expect(res.statusCode).toEqual(200);
        expect(res.body.success).toEqual(true);
        expect(res.body).not.toHaveProperty('errors');
        expect(res.body).toHaveProperty('data');
        expect(res.body.data.length).toEqual(0);
    });

    test('should result in an error if user does not have permission on /juridical', async () => {
        mock.mockAll({ mainPermissions: { noPermissions: true } });
        const event = await generator.createEvent();

        const res = await request({
            uri: '/events/' + event.id + '/applications/juridical',
            method: 'GET',
            headers: { 'X-Auth-Token': 'blablabla' }
        });

        expect(res.statusCode).toEqual(403);
        expect(res.body.success).toEqual(false);
        expect(res.body).toHaveProperty('message');
        expect(res.body).not.toHaveProperty('data');
    });

    test('should return only required data on /juridical', async () => {
        const event = await generator.createEvent();

        await generator.createApplication({ status: 'accepted', paid_fee: true, user_id: 1 }, event);
        await generator.createApplication({ user_id: 2 }, event);

        const res = await request({
            uri: '/events/' + event.id + '/applications/juridical',
            method: 'GET',
            headers: { 'X-Auth-Token': 'blablabla' }
        });

        expect(res.statusCode).toEqual(200);
        expect(res.body.success).toEqual(true);
        expect(res.body).not.toHaveProperty('errors');
        expect(res.body).toHaveProperty('data');
        expect(res.body.data.length).toEqual(1);

        expect(Object.keys(res.body.data[0]).length).toEqual(constants.ALLOWED_JURIDICAL_LIST_FIELDS.length);
        for (const field of constants.ALLOWED_JURIDICAL_LIST_FIELDS) {
            expect(res.body.data[0]).toHaveProperty(field);
        }
    });
});
