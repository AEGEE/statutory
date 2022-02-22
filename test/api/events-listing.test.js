const moment = require('moment');

const { startServer, stopServer } = require('../../lib/server');
const { request } = require('../scripts/helpers');
const mock = require('../scripts/mock-core-registry');
const generator = require('../scripts/generator');

describe('Events listing', () => {
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

    test('should work without authorization', async () => {
        mock.mockAll({
            core: { unauthorized: true },
            mainPermissions: { unauthorized: true },
            approvePermissions: { unauthorized: true },
        });

        const event = await generator.createEvent({ status: 'published' });

        const res = await request({
            uri: '/',
            method: 'GET'
        });

        expect(res.statusCode).toEqual(200);
        expect(res.body.success).toEqual(true);
        expect(res.body).not.toHaveProperty('errors');
        expect(res.body).toHaveProperty('data');

        const ids = res.body.data.map((e) => e.id);
        expect(ids).toContain(event.id);
    });

    test('should display published event', async () => {
        const event = await generator.createEvent({ status: 'published' });

        const res = await request({
            uri: '/',
            method: 'GET',
            headers: { 'X-Auth-Token': 'blablabla' }
        });

        expect(res.statusCode).toEqual(200);
        expect(res.body.success).toEqual(true);
        expect(res.body).not.toHaveProperty('errors');
        expect(res.body).toHaveProperty('data');

        const ids = res.body.data.map((e) => e.id);
        expect(ids).toContain(event.id);
    });

    test('should not display draft event', async () => {
        const event = await generator.createEvent({ status: 'draft' });

        const res = await request({
            uri: '/',
            method: 'GET',
            headers: { 'X-Auth-Token': 'blablabla' }
        });

        expect(res.statusCode).toEqual(200);
        expect(res.body.success).toEqual(true);
        expect(res.body).not.toHaveProperty('errors');
        expect(res.body).toHaveProperty('data');

        const ids = res.body.data.map((e) => e.id);
        expect(ids).not.toContain(event.id);
    });

    test('should sort events descending', async () => {
        const first = await generator.createEvent({
            status: 'published',
            application_period_starts: moment().add(1, 'week').toDate(),
            application_period_ends: moment().add(2, 'week').toDate(),
            board_approve_deadline: moment().add(3, 'week').toDate(),
            participants_list_publish_deadline: moment().add(4, 'week').toDate(),
            memberslist_submission_deadline: moment().add(5, 'week').toDate(),
            draft_proposal_deadline: moment().add(4, 'week').toDate(),
            final_proposal_deadline: moment().add(5, 'week').toDate(),
            candidature_deadline: moment().add(5, 'week').toDate(),
            booklet_publication_deadline: moment().add(4, 'week').toDate(),
            updated_booklet_publication_deadline: moment().add(5, 'week').toDate(),
            starts: moment().add(6, 'week').toDate(),
            ends: moment().add(7, 'week').toDate(),
        });

        const second = await generator.createEvent({
            status: 'published',
            application_period_starts: moment().add(8, 'week').toDate(),
            application_period_ends: moment().add(9, 'week').toDate(),
            board_approve_deadline: moment().add(10, 'week').toDate(),
            participants_list_publish_deadline: moment().add(11, 'week').toDate(),
            memberslist_submission_deadline: moment().add(12, 'week').toDate(),
            draft_proposal_deadline: moment().add(11, 'week').toDate(),
            final_proposal_deadline: moment().add(12, 'week').toDate(),
            candidature_deadline: moment().add(12, 'week').toDate(),
            booklet_publication_deadline: moment().add(11, 'week').toDate(),
            updated_booklet_publication_deadline: moment().add(12, 'week').toDate(),
            starts: moment().add(13, 'week').toDate(),
            ends: moment().add(14, 'week').toDate(),
        });

        const res = await request({
            uri: '/',
            method: 'GET',
            headers: { 'X-Auth-Token': 'blablabla' }
        });

        expect(res.statusCode).toEqual(200);
        expect(res.body.success).toEqual(true);
        expect(res.body).not.toHaveProperty('errors');
        expect(res.body).toHaveProperty('data');

        expect(res.body.data.length).toEqual(2);
        expect(res.body.data[0].id).toEqual(second.id);
        expect(res.body.data[1].id).toEqual(first.id);
    });

    test('should filter events by name or description', async () => {
        const first = await generator.createEvent({ status: 'published', name: 'TEST' });
        const second = await generator.createEvent({ status: 'published', description: 'TEST' });
        await generator.createEvent({ status: 'published', name: 'other', description: 'other' });

        const res = await request({
            uri: '/?search=test',
            method: 'GET',
            headers: { 'X-Auth-Token': 'blablabla' }
        });

        expect(res.statusCode).toEqual(200);
        expect(res.body.success).toEqual(true);
        expect(res.body).not.toHaveProperty('errors');
        expect(res.body).toHaveProperty('data');
        expect(res.body.data.length).toEqual(2);

        const ids = res.body.data.map((e) => e.id);
        expect(ids).toContain(first.id);
        expect(ids).toContain(second.id);
    });

    test('should filter events by start date', async () => {
        const event = await generator.createEvent({
            status: 'published',
            application_period_starts: moment().subtract(7, 'week').toDate(),
            application_period_ends: moment().subtract(6, 'week').toDate(),
            board_approve_deadline: moment().subtract(5, 'week').toDate(),
            participants_list_publish_deadline: moment().subtract(4, 'week').toDate(),
            memberslist_submission_deadline: moment().subtract(3, 'week').toDate(),
            draft_proposal_deadline: moment().subtract(4, 'week').toDate(),
            final_proposal_deadline: moment().subtract(3, 'week').toDate(),
            candidature_deadline: moment().subtract(3, 'week').toDate(),
            booklet_publication_deadline: moment().subtract(4, 'week').toDate(),
            updated_booklet_publication_deadline: moment().subtract(3, 'week').toDate(),
            starts: moment().add(1, 'week').toDate(),
            ends: moment().add(2, 'week').toDate(),
        });

        await generator.createEvent({
            status: 'published',
            application_period_starts: moment().subtract(7, 'week').toDate(),
            application_period_ends: moment().subtract(6, 'week').toDate(),
            board_approve_deadline: moment().subtract(5, 'week').toDate(),
            participants_list_publish_deadline: moment().subtract(4, 'week').toDate(),
            memberslist_submission_deadline: moment().subtract(3, 'week').toDate(),
            draft_proposal_deadline: moment().subtract(4, 'week').toDate(),
            final_proposal_deadline: moment().subtract(3, 'week').toDate(),
            candidature_deadline: moment().subtract(3, 'week').toDate(),
            booklet_publication_deadline: moment().subtract(4, 'week').toDate(),
            updated_booklet_publication_deadline: moment().subtract(3, 'week').toDate(),
            starts: moment().subtract(2, 'week').toDate(),
            ends: moment().add(1, 'week').toDate()
        });

        const res = await request({
            uri: '/?starts=' + moment().format('YYYY-MM-DD'),
            method: 'GET',
            headers: { 'X-Auth-Token': 'blablabla' }
        });

        expect(res.statusCode).toEqual(200);
        expect(res.body.success).toEqual(true);
        expect(res.body).not.toHaveProperty('errors');
        expect(res.body).toHaveProperty('data');
        expect(res.body.data.length).toEqual(1);
        expect(res.body.data[0].id).toEqual(event.id);
    });

    test('should filter events by end date', async () => {
        const event = await generator.createEvent({
            status: 'published',
            application_period_starts: moment().subtract(7, 'week').toDate(),
            application_period_ends: moment().subtract(6, 'week').toDate(),
            board_approve_deadline: moment().subtract(5, 'week').toDate(),
            participants_list_publish_deadline: moment().subtract(4, 'week').toDate(),
            memberslist_submission_deadline: moment().subtract(3, 'week').toDate(),
            draft_proposal_deadline: moment().subtract(4, 'week').toDate(),
            final_proposal_deadline: moment().subtract(3, 'week').toDate(),
            candidature_deadline: moment().subtract(3, 'week').toDate(),
            booklet_publication_deadline: moment().subtract(4, 'week').toDate(),
            updated_booklet_publication_deadline: moment().subtract(3, 'week').toDate(),
            starts: moment().subtract(2, 'week').toDate(),
            ends: moment().subtract(1, 'week').toDate(),
        });

        await generator.createEvent({
            status: 'published',
            application_period_starts: moment().subtract(7, 'week').toDate(),
            application_period_ends: moment().subtract(6, 'week').toDate(),
            board_approve_deadline: moment().subtract(5, 'week').toDate(),
            participants_list_publish_deadline: moment().subtract(4, 'week').toDate(),
            memberslist_submission_deadline: moment().subtract(3, 'week').toDate(),
            draft_proposal_deadline: moment().subtract(4, 'week').toDate(),
            final_proposal_deadline: moment().subtract(3, 'week').toDate(),
            candidature_deadline: moment().subtract(3, 'week').toDate(),
            booklet_publication_deadline: moment().subtract(4, 'week').toDate(),
            updated_booklet_publication_deadline: moment().subtract(3, 'week').toDate(),
            starts: moment().add(1, 'week').toDate(),
            ends: moment().add(2, 'week').toDate()
        });

        const res = await request({
            uri: '/?ends=' + moment().format('YYYY-MM-DD'),
            method: 'GET',
            headers: { 'X-Auth-Token': 'blablabla' }
        });

        expect(res.statusCode).toEqual(200);
        expect(res.body.success).toEqual(true);
        expect(res.body).not.toHaveProperty('errors');
        expect(res.body).toHaveProperty('data');
        expect(res.body.data.length).toEqual(1);
        expect(res.body.data[0].id).toEqual(event.id);
    });

    test('should filter by event type if single', async () => {
        const event = await generator.createEvent({ status: 'published', type: 'agora' });
        await generator.createEvent({ status: 'published', type: 'epm' });
        await generator.createEvent({ status: 'published', type: 'spm' });

        const res = await request({
            uri: '/?type=agora',
            method: 'GET',
            headers: { 'X-Auth-Token': 'blablabla' }
        });

        expect(res.statusCode).toEqual(200);
        expect(res.body.success).toEqual(true);
        expect(res.body).not.toHaveProperty('errors');
        expect(res.body).toHaveProperty('data');
        expect(res.body.data.length).toEqual(1);
        expect(res.body.data[0].id).toEqual(event.id);
    });

    test('should filter by event type if array', async () => {
        const first = await generator.createEvent({ status: 'published', type: 'agora' });
        const second = await generator.createEvent({ status: 'published', type: 'epm' });
        await generator.createEvent({ status: 'published', type: 'spm' });

        const res = await request({
            uri: '/?type[]=agora&type[]=epm',
            method: 'GET',
            headers: { 'X-Auth-Token': 'blablabla' }
        });

        expect(res.statusCode).toEqual(200);
        expect(res.body.success).toEqual(true);
        expect(res.body).not.toHaveProperty('errors');
        expect(res.body).toHaveProperty('data');
        expect(res.body.data.length).toEqual(2);

        const ids = res.body.data.map((e) => e.id);
        expect(ids).toContain(first.id);
        expect(ids).toContain(second.id);
    });

    test('should return 403 if no permission on /?all=true', async () => {
        mock.mockAll({ mainPermissions: { noPermissions: true } });
        const res = await request({
            uri: '/?all=true',
            method: 'GET',
            headers: { 'X-Auth-Token': 'blablabla' }
        });

        expect(res.statusCode).toEqual(403);
        expect(res.body.success).toEqual(false);
        expect(res.body).toHaveProperty('message');
        expect(res.body).not.toHaveProperty('data');
    });

    test('should filter draft events on /?all=true', async () => {
        mock.mockAll({
            core: { authorized: true },
            mainPermissions: { authorized: true },
            approvePermissions: { authorized: true },
        });

        await generator.createEvent({ status: 'draft' });

        const res = await request({
            uri: '/?all=true',
            method: 'GET',
            headers: { 'X-Auth-Token': 'blablabla' }
        });

        expect(res.statusCode).toEqual(200);
        expect(res.body.success).toEqual(true);
        expect(res.body).toHaveProperty('data');
        expect(res.body).not.toHaveProperty('errors');
        expect(res.body.data.length).toEqual(1);
    });
    test('should filter draft events and published on /?all=true', async () => {
        mock.mockAll({
            core: { authorized: true },
            mainPermissions: { authorized: true },
            approvePermissions: { authorized: true },
        });
        await generator.createEvent({ status: 'draft' });
        await generator.createEvent({ status: 'published' });

        const res = await request({
            uri: '/?all=true',
            method: 'GET',
            headers: { 'X-Auth-Token': 'blablabla' }
        });

        expect(res.statusCode).toEqual(200);
        expect(res.body.success).toEqual(true);
        expect(res.body).toHaveProperty('data');
        expect(res.body).not.toHaveProperty('errors');
        expect(res.body.data.length).toEqual(2);
    });
});
