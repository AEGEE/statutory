const moment = require('moment');

const { startServer, stopServer } = require('../../lib/server');
const { request } = require('../scripts/helpers');
const mock = require('../scripts/mock-core-registry');
const generator = require('../scripts/generator');
const { Event } = require('../../models');

describe('Events creation', () => {
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

    test('should fail if user does not have rights to create events', async () => {
        mock.mockAll({ core: { regularUser: true } });
        const res = await request({
            uri: '/',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: { }
        });

        expect(res.statusCode).toEqual(403);
        expect(res.body.success).toEqual(false);
    });

    test('should succeed if everything is okay', async () => {
        const event = generator.generateEvent();

        const res = await request({
            uri: '/',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: event
        });

        expect(res.statusCode).toEqual(200);
        expect(res.body.success).toEqual(true);
        expect(res.body).not.toHaveProperty('errors');
        expect(res.body).toHaveProperty('data');

        expect(res.body.data).toHaveProperty('id');
        expect(res.body.data.name).toEqual(event.name);
        expect(res.body.data.description).toEqual(event.description);
        expect(res.body.data.fee).toEqual(event.fee);
        expect(res.body.data.type).toEqual(event.type);

        const eventFromDb = await Event.findOne({ where: { id: res.body.data.id } });

        expect(eventFromDb.name).toEqual(res.body.data.name);
        expect(eventFromDb.description).toEqual(res.body.data.description);
        expect(eventFromDb.fee).toEqual(res.body.data.fee);
        expect(eventFromDb.type).toEqual(res.body.data.type);

        for (const question of event.questions) {
            expect(eventFromDb.questions.find((q) => question.name === q.name)).toBeTruthy();
        }
    });

    test('should fail if the event is invalid', async () => {
        const res = await request({
            uri: '/',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: generator.generateEvent({
                url: 'not a valid url with spaces'
            })
        });

        expect(res.statusCode).toEqual(422);
        expect(res.body.success).toEqual(false);
        expect(Object.keys(res.body.errors).length).toEqual(1);
        expect(res.body.errors).toHaveProperty('url');
    });

    test('should fail if the event is numbers only', async () => {
        const res = await request({
            uri: '/',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: generator.generateEvent({
                url: '12345'
            })
        });

        expect(res.statusCode).toEqual(422);
        expect(res.body.success).toEqual(false);
        expect(Object.keys(res.body.errors).length).toEqual(1);
        expect(res.body.errors).toHaveProperty('url');
    });

    it('should return 422 if URL is not unique', async () => {
        await generator.createEvent({ url: 'non-unique-url' });

        const event = generator.generateEvent({
            url: 'non-unique-URL'
        });

        const res = await request({
            uri: '/',
            headers: { 'X-Auth-Token': 'foobar' },
            method: 'POST',
            body: event
        });

        expect(res.statusCode).toEqual(422);
        expect(res.body.success).toEqual(false);
        expect(res.body).toHaveProperty('errors');
        expect(res.body.errors).toHaveProperty('url');
    });

    test('should fail if event ends before it starts', async () => {
        const res = await request({
            uri: '/',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: generator.generateEvent({
                application_period_starts: moment().add(1, 'months').toDate(),
                application_period_ends: moment().add(2, 'months').toDate(),
                board_approve_deadline: moment().add(3, 'months').toDate(),
                participants_list_publish_deadline: moment().add(4, 'months').toDate(),
                memberslist_submission_deadline: moment().add(5, 'months').toDate(),
                draft_proposal_deadline: moment().add(4, 'months').toDate(),
                final_proposal_deadline: moment().add(5, 'months').toDate(),
                candidature_deadline: moment().add(5, 'months').toDate(),
                booklet_publication_deadline: moment().add(4, 'months').toDate(),
                updated_booklet_publication_deadline: moment().add(5, 'months').toDate(),
                starts: moment().add(7, 'months').toDate(),
                ends: moment().add(6, 'months').toDate()
            })
        });

        expect(res.statusCode).toEqual(422);
        expect(res.body.success).toEqual(false);
        expect(Object.keys(res.body.errors).length).toEqual(1);
        expect(res.body.errors).toHaveProperty('ends');
    });

    test('should fail if event application period ends before it starts', async () => {
        const res = await request({
            uri: '/',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: generator.generateEvent({
                application_period_starts: moment().add(2, 'months').toDate(),
                application_period_ends: moment().add(1, 'months').toDate(),
                board_approve_deadline: moment().add(3, 'months').toDate(),
                participants_list_publish_deadline: moment().add(4, 'months').toDate(),
                memberslist_submission_deadline: moment().add(5, 'months').toDate(),
                draft_proposal_deadline: moment().add(4, 'months').toDate(),
                final_proposal_deadline: moment().add(5, 'months').toDate(),
                candidature_deadline: moment().add(5, 'months').toDate(),
                booklet_publication_deadline: moment().add(4, 'months').toDate(),
                updated_booklet_publication_deadline: moment().add(5, 'months').toDate(),
                starts: moment().add(6, 'months').toDate(),
                ends: moment().add(7, 'months').toDate()
            })
        });

        expect(res.statusCode).toEqual(422);
        expect(res.body.success).toEqual(false);
        expect(Object.keys(res.body.errors).length).toEqual(1);
        expect(res.body.errors).toHaveProperty('application_period_ends');
    });

    test('should fail if event starts before application period ends', async () => {
        const res = await request({
            uri: '/',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: generator.generateEvent({
                application_period_starts: moment().add(1, 'months').toDate(),
                application_period_ends: moment().add(3, 'months').toDate(),
                starts: moment().add(2, 'months').toDate(),
                board_approve_deadline: moment().add(4, 'months').toDate(),
                memberslist_submission_deadline: moment().add(5, 'months').toDate(),
                participants_list_publish_deadline: moment().add(6, 'months').toDate(),
                ends: moment().add(7, 'months').toDate()
            })
        });

        expect(res.statusCode).toEqual(422);
        expect(res.body.success).toEqual(false);
        expect(res.body.errors).toHaveProperty('application_period_ends');
    });

    test('should fail if board approve_deadline is before application period ends', async () => {
        const res = await request({
            uri: '/',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: generator.generateEvent({
                application_period_starts: moment().add(1, 'months').toDate(),
                application_period_ends: moment().add(3, 'months').toDate(),
                board_approve_deadline: moment().add(2, 'months').toDate(),
                participants_list_publish_deadline: moment().add(4, 'months').toDate(),
                memberslist_submission_deadline: moment().add(5, 'months').toDate(),
                starts: moment().add(6, 'months').toDate(),
                ends: moment().add(7, 'months').toDate()
            })
        });

        expect(res.statusCode).toEqual(422);
        expect(res.body.success).toEqual(false);
        expect(res.body.errors).toHaveProperty('board_approve_deadline');
    });

    test('should fail if pax list publish deadline is after board approve deadline', async () => {
        const res = await request({
            uri: '/',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: generator.generateEvent({
                application_period_starts: moment().add(1, 'months').toDate(),
                application_period_ends: moment().add(2, 'months').toDate(),
                board_approve_deadline: moment().add(4, 'months').toDate(),
                participants_list_publish_deadline: moment().add(3, 'months').toDate(),
                memberslist_submission_deadline: moment().add(5, 'months').toDate(),
                starts: moment().add(6, 'months').toDate(),
                ends: moment().add(7, 'months').toDate()
            })
        });

        expect(res.statusCode).toEqual(422);
        expect(res.body.success).toEqual(false);
        expect(res.body.errors).toHaveProperty('participants_list_publish_deadline');
    });

    test('should fail if pax list publish deadline is before event starts', async () => {
        const res = await request({
            uri: '/',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: generator.generateEvent({
                application_period_starts: moment().add(1, 'months').toDate(),
                application_period_ends: moment().add(2, 'months').toDate(),
                board_approve_deadline: moment().add(3, 'months').toDate(),
                participants_list_publish_deadline: moment().add(5, 'months').toDate(),
                memberslist_submission_deadline: moment().add(6, 'months').toDate(),
                starts: moment().add(4, 'months').toDate(),
                ends: moment().add(7, 'months').toDate()
            })
        });

        expect(res.statusCode).toEqual(422);
        expect(res.body.success).toEqual(false);
        expect(res.body.errors).toHaveProperty('participants_list_publish_deadline');
    });

    test('should fail if memberslist_submission_deadline is after event starts', async () => {
        const res = await request({
            uri: '/',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: generator.generateEvent({
                application_period_starts: moment().add(1, 'months').toDate(),
                application_period_ends: moment().add(2, 'months').toDate(),
                board_approve_deadline: moment().add(3, 'months').toDate(),
                participants_list_publish_deadline: moment().add(4, 'months').toDate(),
                memberslist_submission_deadline: moment().add(7, 'months').toDate(),
                draft_proposal_deadline: moment().add(3, 'months').toDate(),
                final_proposal_deadline: moment().add(4, 'months').toDate(),
                candidature_deadline: moment().add(4, 'months').toDate(),
                booklet_publication_deadline: moment().add(3, 'months').toDate(),
                updated_booklet_publication_deadline: moment().add(4, 'months').toDate(),
                starts: moment().add(5, 'months').toDate(),
                ends: moment().add(6, 'months').toDate()
            })
        });

        expect(res.statusCode).toEqual(422);
        expect(res.body.success).toEqual(false);
        expect(Object.keys(res.body.errors).length).toEqual(1);
        expect(res.body.errors).toHaveProperty('memberslist_submission_deadline');
    });

    test('should fail if memberslist_submission_deadline is not set for Agora', async () => {
        const res = await request({
            uri: '/',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: generator.generateEvent({
                type: 'agora',
                application_period_starts: moment().add(1, 'months').toDate(),
                application_period_ends: moment().add(2, 'months').toDate(),
                board_approve_deadline: moment().add(3, 'months').toDate(),
                participants_list_publish_deadline: moment().add(4, 'months').toDate(),
                memberslist_submission_deadline: null,
                draft_proposal_deadline: moment().add(4, 'months').toDate(),
                final_proposal_deadline: moment().add(5, 'months').toDate(),
                candidature_deadline: moment().add(5, 'months').toDate(),
                booklet_publication_deadline: moment().add(4, 'months').toDate(),
                updated_booklet_publication_deadline: moment().add(5, 'months').toDate(),
                starts: moment().add(6, 'months').toDate(),
                ends: moment().add(7, 'months').toDate()
            })
        });

        expect(res.statusCode).toEqual(422);
        expect(res.body.success).toEqual(false);
        expect(Object.keys(res.body.errors).length).toEqual(1);
        expect(res.body.errors).toHaveProperty('memberslist_submission_deadline');
    });

    test('should not fail if memberslist_submission_deadline is not set for EPM', async () => {
        const res = await request({
            uri: '/',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: generator.generateEvent({
                type: 'epm',
                application_period_starts: moment().add(1, 'months').toDate(),
                application_period_ends: moment().add(2, 'months').toDate(),
                board_approve_deadline: moment().add(3, 'months').toDate(),
                participants_list_publish_deadline: moment().add(4, 'months').toDate(),
                memberslist_submission_deadline: null,
                draft_proposal_deadline: moment().add(4, 'months').toDate(),
                final_proposal_deadline: moment().add(5, 'months').toDate(),
                candidature_deadline: moment().add(5, 'months').toDate(),
                booklet_publication_deadline: moment().add(4, 'months').toDate(),
                updated_booklet_publication_deadline: moment().add(5, 'months').toDate(),
                starts: moment().add(6, 'months').toDate(),
                ends: moment().add(7, 'months').toDate()
            })
        });

        expect(res.statusCode).toEqual(200);
        expect(res.body.success).toEqual(true);
    });

    test('should fail if memberslist_submission_deadline is invalid for Agora', async () => {
        const res = await request({
            uri: '/',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: generator.generateEvent({
                type: 'agora',
                application_period_starts: moment().add(1, 'months').toDate(),
                application_period_ends: moment().add(2, 'months').toDate(),
                board_approve_deadline: moment().add(3, 'months').toDate(),
                participants_list_publish_deadline: moment().add(4, 'months').toDate(),
                memberslist_submission_deadline: 'test',
                draft_proposal_deadline: moment().add(4, 'months').toDate(),
                final_proposal_deadline: moment().add(5, 'months').toDate(),
                candidature_deadline: moment().add(5, 'months').toDate(),
                booklet_publication_deadline: moment().add(4, 'months').toDate(),
                updated_booklet_publication_deadline: moment().add(5, 'months').toDate(),
                starts: moment().add(6, 'months').toDate(),
                ends: moment().add(7, 'months').toDate()
            })
        });

        expect(res.statusCode).toEqual(422);
        expect(res.body.success).toEqual(false);
        expect(Object.keys(res.body.errors).length).toEqual(1);
        expect(res.body.errors).toHaveProperty('memberslist_submission_deadline');
    });

    test('should fail if draft_proposal_deadline is after event starts', async () => {
        const res = await request({
            uri: '/',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: generator.generateEvent({
                application_period_starts: moment().add(1, 'months').toDate(),
                application_period_ends: moment().add(2, 'months').toDate(),
                board_approve_deadline: moment().add(3, 'months').toDate(),
                participants_list_publish_deadline: moment().add(4, 'months').toDate(),
                memberslist_submission_deadline: moment().add(4, 'months').toDate(),
                draft_proposal_deadline: moment().add(7, 'months').toDate(),
                final_proposal_deadline: moment().add(4, 'months').toDate(),
                candidature_deadline: moment().add(4, 'months').toDate(),
                booklet_publication_deadline: moment().add(3, 'months').toDate(),
                updated_booklet_publication_deadline: moment().add(4, 'months').toDate(),
                starts: moment().add(5, 'months').toDate(),
                ends: moment().add(6, 'months').toDate()
            })
        });

        expect(res.statusCode).toEqual(422);
        expect(res.body.success).toEqual(false);
        expect(Object.keys(res.body.errors).length).toEqual(2);
        expect(res.body.errors).toHaveProperty('draft_proposal_deadline');
        expect(res.body.errors).toHaveProperty('final_proposal_deadline');
    });

    test('should fail if draft_proposal_deadline is not set for Agora', async () => {
        const res = await request({
            uri: '/',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: generator.generateEvent({
                type: 'agora',
                application_period_starts: moment().add(1, 'months').toDate(),
                application_period_ends: moment().add(2, 'months').toDate(),
                board_approve_deadline: moment().add(3, 'months').toDate(),
                participants_list_publish_deadline: moment().add(4, 'months').toDate(),
                memberslist_submission_deadline: moment().add(5, 'months').toDate(),
                draft_proposal_deadline: null,
                final_proposal_deadline: moment().add(5, 'months').toDate(),
                candidature_deadline: moment().add(5, 'months').toDate(),
                booklet_publication_deadline: moment().add(4, 'months').toDate(),
                updated_booklet_publication_deadline: moment().add(5, 'months').toDate(),
                starts: moment().add(6, 'months').toDate(),
                ends: moment().add(7, 'months').toDate()
            })
        });

        expect(res.statusCode).toEqual(422);
        expect(res.body.success).toEqual(false);
        expect(Object.keys(res.body.errors).length).toEqual(1);
        expect(res.body.errors).toHaveProperty('draft_proposal_deadline');
    });

    test('should not fail if draft_proposal_deadline is not set for EPM', async () => {
        const res = await request({
            uri: '/',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: generator.generateEvent({
                type: 'epm',
                application_period_starts: moment().add(1, 'months').toDate(),
                application_period_ends: moment().add(2, 'months').toDate(),
                board_approve_deadline: moment().add(3, 'months').toDate(),
                participants_list_publish_deadline: moment().add(4, 'months').toDate(),
                memberslist_submission_deadline: moment().add(5, 'months').toDate(),
                draft_proposal_deadline: null,
                final_proposal_deadline: moment().add(5, 'months').toDate(),
                candidature_deadline: moment().add(5, 'months').toDate(),
                booklet_publication_deadline: moment().add(4, 'months').toDate(),
                updated_booklet_publication_deadline: moment().add(5, 'months').toDate(),
                starts: moment().add(6, 'months').toDate(),
                ends: moment().add(7, 'months').toDate()
            })
        });

        expect(res.statusCode).toEqual(200);
        expect(res.body.success).toEqual(true);
    });

    test('should fail if draft_proposal_deadline is invalid for Agora', async () => {
        const res = await request({
            uri: '/',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: generator.generateEvent({
                type: 'agora',
                application_period_starts: moment().add(1, 'months').toDate(),
                application_period_ends: moment().add(2, 'months').toDate(),
                board_approve_deadline: moment().add(3, 'months').toDate(),
                participants_list_publish_deadline: moment().add(4, 'months').toDate(),
                memberslist_submission_deadline: moment().add(5, 'months').toDate(),
                draft_proposal_deadline: 'test',
                final_proposal_deadline: moment().add(5, 'months').toDate(),
                candidature_deadline: moment().add(5, 'months').toDate(),
                booklet_publication_deadline: moment().add(4, 'months').toDate(),
                updated_booklet_publication_deadline: moment().add(5, 'months').toDate(),
                starts: moment().add(6, 'months').toDate(),
                ends: moment().add(7, 'months').toDate()
            })
        });

        expect(res.statusCode).toEqual(422);
        expect(res.body.success).toEqual(false);
        expect(Object.keys(res.body.errors).length).toEqual(1);
        expect(res.body.errors).toHaveProperty('draft_proposal_deadline');
    });

    test('should fail if final_proposal_deadline is after event starts', async () => {
        const res = await request({
            uri: '/',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: generator.generateEvent({
                application_period_starts: moment().add(1, 'months').toDate(),
                application_period_ends: moment().add(2, 'months').toDate(),
                board_approve_deadline: moment().add(3, 'months').toDate(),
                participants_list_publish_deadline: moment().add(4, 'months').toDate(),
                memberslist_submission_deadline: moment().add(4, 'months').toDate(),
                draft_proposal_deadline: moment().add(3, 'months').toDate(),
                final_proposal_deadline: moment().add(7, 'months').toDate(),
                candidature_deadline: moment().add(4, 'months').toDate(),
                booklet_publication_deadline: moment().add(3, 'months').toDate(),
                updated_booklet_publication_deadline: moment().add(4, 'months').toDate(),
                starts: moment().add(5, 'months').toDate(),
                ends: moment().add(6, 'months').toDate()
            })
        });

        expect(res.statusCode).toEqual(422);
        expect(res.body.success).toEqual(false);
        expect(Object.keys(res.body.errors).length).toEqual(1);
        expect(res.body.errors).toHaveProperty('final_proposal_deadline');
    });

    test('should fail if final_proposal_deadline is not set for Agora', async () => {
        const res = await request({
            uri: '/',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: generator.generateEvent({
                type: 'agora',
                application_period_starts: moment().add(1, 'months').toDate(),
                application_period_ends: moment().add(2, 'months').toDate(),
                board_approve_deadline: moment().add(3, 'months').toDate(),
                participants_list_publish_deadline: moment().add(4, 'months').toDate(),
                memberslist_submission_deadline: moment().add(5, 'months').toDate(),
                draft_proposal_deadline: moment().add(4, 'months').toDate(),
                final_proposal_deadline: null,
                candidature_deadline: moment().add(5, 'months').toDate(),
                booklet_publication_deadline: moment().add(4, 'months').toDate(),
                updated_booklet_publication_deadline: moment().add(5, 'months').toDate(),
                starts: moment().add(6, 'months').toDate(),
                ends: moment().add(7, 'months').toDate()
            })
        });

        expect(res.statusCode).toEqual(422);
        expect(res.body.success).toEqual(false);
        expect(Object.keys(res.body.errors).length).toEqual(1);
        expect(res.body.errors).toHaveProperty('final_proposal_deadline');
    });

    test('should not fail if final_proposal_deadline is not set for EPM', async () => {
        const res = await request({
            uri: '/',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: generator.generateEvent({
                type: 'epm',
                application_period_starts: moment().add(1, 'months').toDate(),
                application_period_ends: moment().add(2, 'months').toDate(),
                board_approve_deadline: moment().add(3, 'months').toDate(),
                participants_list_publish_deadline: moment().add(4, 'months').toDate(),
                memberslist_submission_deadline: moment().add(5, 'months').toDate(),
                draft_proposal_deadline: moment().add(4, 'months').toDate(),
                final_proposal_deadline: null,
                candidature_deadline: moment().add(5, 'months').toDate(),
                booklet_publication_deadline: moment().add(4, 'months').toDate(),
                updated_booklet_publication_deadline: moment().add(5, 'months').toDate(),
                starts: moment().add(6, 'months').toDate(),
                ends: moment().add(7, 'months').toDate()
            })
        });

        expect(res.statusCode).toEqual(200);
        expect(res.body.success).toEqual(true);
    });

    test('should fail if final_proposal_deadline is invalid for Agora', async () => {
        const res = await request({
            uri: '/',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: generator.generateEvent({
                type: 'agora',
                application_period_starts: moment().add(1, 'months').toDate(),
                application_period_ends: moment().add(2, 'months').toDate(),
                board_approve_deadline: moment().add(3, 'months').toDate(),
                participants_list_publish_deadline: moment().add(4, 'months').toDate(),
                memberslist_submission_deadline: moment().add(5, 'months').toDate(),
                draft_proposal_deadline: moment().add(4, 'months').toDate(),
                final_proposal_deadline: 'test',
                candidature_deadline: moment().add(5, 'months').toDate(),
                booklet_publication_deadline: moment().add(4, 'months').toDate(),
                updated_booklet_publication_deadline: moment().add(5, 'months').toDate(),
                starts: moment().add(6, 'months').toDate(),
                ends: moment().add(7, 'months').toDate()
            })
        });

        expect(res.statusCode).toEqual(422);
        expect(res.body.success).toEqual(false);
        expect(Object.keys(res.body.errors).length).toEqual(1);
        expect(res.body.errors).toHaveProperty('final_proposal_deadline');
    });

    test('should fail if final_proposal_deadline is before draft_proposal_deadline', async () => {
        const res = await request({
            uri: '/',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: generator.generateEvent({
                application_period_starts: moment().add(1, 'months').toDate(),
                application_period_ends: moment().add(2, 'months').toDate(),
                board_approve_deadline: moment().add(3, 'months').toDate(),
                participants_list_publish_deadline: moment().add(4, 'months').toDate(),
                memberslist_submission_deadline: moment().add(4, 'months').toDate(),
                draft_proposal_deadline: moment().add(4, 'months').toDate(),
                final_proposal_deadline: moment().add(3, 'months').toDate(),
                candidature_deadline: moment().add(4, 'months').toDate(),
                booklet_publication_deadline: moment().add(3, 'months').toDate(),
                updated_booklet_publication_deadline: moment().add(4, 'months').toDate(),
                starts: moment().add(5, 'months').toDate(),
                ends: moment().add(6, 'months').toDate()
            })
        });

        expect(res.statusCode).toEqual(422);
        expect(res.body.success).toEqual(false);
        expect(Object.keys(res.body.errors).length).toEqual(1);
        expect(res.body.errors).toHaveProperty('final_proposal_deadline');
    });

    test('should fail if candidature_deadline is after event starts', async () => {
        const res = await request({
            uri: '/',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: generator.generateEvent({
                application_period_starts: moment().add(1, 'months').toDate(),
                application_period_ends: moment().add(2, 'months').toDate(),
                board_approve_deadline: moment().add(3, 'months').toDate(),
                participants_list_publish_deadline: moment().add(4, 'months').toDate(),
                memberslist_submission_deadline: moment().add(4, 'months').toDate(),
                draft_proposal_deadline: moment().add(3, 'months').toDate(),
                final_proposal_deadline: moment().add(4, 'months').toDate(),
                candidature_deadline: moment().add(7, 'months').toDate(),
                booklet_publication_deadline: moment().add(3, 'months').toDate(),
                updated_booklet_publication_deadline: moment().add(4, 'months').toDate(),
                starts: moment().add(5, 'months').toDate(),
                ends: moment().add(6, 'months').toDate()
            })
        });

        expect(res.statusCode).toEqual(422);
        expect(res.body.success).toEqual(false);
        expect(Object.keys(res.body.errors).length).toEqual(1);
        expect(res.body.errors).toHaveProperty('candidature_deadline');
    });

    test('should fail if candidature_deadline is not set for Agora', async () => {
        const res = await request({
            uri: '/',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: generator.generateEvent({
                type: 'agora',
                application_period_starts: moment().add(1, 'months').toDate(),
                application_period_ends: moment().add(2, 'months').toDate(),
                board_approve_deadline: moment().add(3, 'months').toDate(),
                participants_list_publish_deadline: moment().add(4, 'months').toDate(),
                memberslist_submission_deadline: moment().add(5, 'months').toDate(),
                draft_proposal_deadline: moment().add(4, 'months').toDate(),
                final_proposal_deadline: moment().add(5, 'months').toDate(),
                candidature_deadline: null,
                booklet_publication_deadline: moment().add(4, 'months').toDate(),
                updated_booklet_publication_deadline: moment().add(5, 'months').toDate(),
                starts: moment().add(6, 'months').toDate(),
                ends: moment().add(7, 'months').toDate()
            })
        });

        expect(res.statusCode).toEqual(422);
        expect(res.body.success).toEqual(false);
        expect(Object.keys(res.body.errors).length).toEqual(1);
        expect(res.body.errors).toHaveProperty('candidature_deadline');
    });

    test('should not fail if candidature_deadline is not set for EPM', async () => {
        const res = await request({
            uri: '/',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: generator.generateEvent({
                type: 'epm',
                application_period_starts: moment().add(1, 'months').toDate(),
                application_period_ends: moment().add(2, 'months').toDate(),
                board_approve_deadline: moment().add(3, 'months').toDate(),
                participants_list_publish_deadline: moment().add(4, 'months').toDate(),
                memberslist_submission_deadline: moment().add(5, 'months').toDate(),
                draft_proposal_deadline: moment().add(4, 'months').toDate(),
                final_proposal_deadline: moment().add(5, 'months').toDate(),
                candidature_deadline: null,
                booklet_publication_deadline: moment().add(4, 'months').toDate(),
                updated_booklet_publication_deadline: moment().add(5, 'months').toDate(),
                starts: moment().add(6, 'months').toDate(),
                ends: moment().add(7, 'months').toDate()
            })
        });

        expect(res.statusCode).toEqual(200);
        expect(res.body.success).toEqual(true);
    });

    test('should fail if candidature_deadline is invalid for Agora', async () => {
        const res = await request({
            uri: '/',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: generator.generateEvent({
                type: 'agora',
                application_period_starts: moment().add(1, 'months').toDate(),
                application_period_ends: moment().add(2, 'months').toDate(),
                board_approve_deadline: moment().add(3, 'months').toDate(),
                participants_list_publish_deadline: moment().add(4, 'months').toDate(),
                memberslist_submission_deadline: moment().add(5, 'months').toDate(),
                draft_proposal_deadline: moment().add(4, 'months').toDate(),
                final_proposal_deadline: moment().add(5, 'months').toDate(),
                candidature_deadline: 'test',
                booklet_publication_deadline: moment().add(4, 'months').toDate(),
                updated_booklet_publication_deadline: moment().add(5, 'months').toDate(),
                starts: moment().add(6, 'months').toDate(),
                ends: moment().add(7, 'months').toDate()
            })
        });

        expect(res.statusCode).toEqual(422);
        expect(res.body.success).toEqual(false);
        expect(Object.keys(res.body.errors).length).toEqual(1);
        expect(res.body.errors).toHaveProperty('candidature_deadline');
    });

    test('should fail if booklet_publication_deadline is after event starts', async () => {
        const res = await request({
            uri: '/',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: generator.generateEvent({
                application_period_starts: moment().add(1, 'months').toDate(),
                application_period_ends: moment().add(2, 'months').toDate(),
                board_approve_deadline: moment().add(3, 'months').toDate(),
                participants_list_publish_deadline: moment().add(4, 'months').toDate(),
                memberslist_submission_deadline: moment().add(4, 'months').toDate(),
                draft_proposal_deadline: moment().add(3, 'months').toDate(),
                final_proposal_deadline: moment().add(4, 'months').toDate(),
                candidature_deadline: moment().add(4, 'months').toDate(),
                booklet_publication_deadline: moment().add(7, 'months').toDate(),
                updated_booklet_publication_deadline: moment().add(4, 'months').toDate(),
                starts: moment().add(5, 'months').toDate(),
                ends: moment().add(6, 'months').toDate()
            })
        });

        expect(res.statusCode).toEqual(422);
        expect(res.body.success).toEqual(false);
        expect(Object.keys(res.body.errors).length).toEqual(2);
        expect(res.body.errors).toHaveProperty('booklet_publication_deadline');
        expect(res.body.errors).toHaveProperty('updated_booklet_publication_deadline');
    });

    test('should fail if booklet_publication_deadline is not set for Agora', async () => {
        const res = await request({
            uri: '/',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: generator.generateEvent({
                type: 'agora',
                application_period_starts: moment().add(1, 'months').toDate(),
                application_period_ends: moment().add(2, 'months').toDate(),
                board_approve_deadline: moment().add(3, 'months').toDate(),
                participants_list_publish_deadline: moment().add(4, 'months').toDate(),
                memberslist_submission_deadline: moment().add(5, 'months').toDate(),
                draft_proposal_deadline: moment().add(4, 'months').toDate(),
                final_proposal_deadline: moment().add(5, 'months').toDate(),
                candidature_deadline: moment().add(5, 'months').toDate(),
                booklet_publication_deadline: null,
                updated_booklet_publication_deadline: moment().add(5, 'months').toDate(),
                starts: moment().add(6, 'months').toDate(),
                ends: moment().add(7, 'months').toDate()
            })
        });

        expect(res.statusCode).toEqual(422);
        expect(res.body.success).toEqual(false);
        expect(Object.keys(res.body.errors).length).toEqual(1);
        expect(res.body.errors).toHaveProperty('booklet_publication_deadline');
    });

    test('should not fail if booklet_publication_deadline is not set for EPM', async () => {
        const res = await request({
            uri: '/',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: generator.generateEvent({
                type: 'epm',
                application_period_starts: moment().add(1, 'months').toDate(),
                application_period_ends: moment().add(2, 'months').toDate(),
                board_approve_deadline: moment().add(3, 'months').toDate(),
                participants_list_publish_deadline: moment().add(4, 'months').toDate(),
                memberslist_submission_deadline: moment().add(5, 'months').toDate(),
                draft_proposal_deadline: moment().add(4, 'months').toDate(),
                final_proposal_deadline: moment().add(5, 'months').toDate(),
                candidature_deadline: moment().add(5, 'months').toDate(),
                booklet_publication_deadline: null,
                updated_booklet_publication_deadline: moment().add(5, 'months').toDate(),
                starts: moment().add(6, 'months').toDate(),
                ends: moment().add(7, 'months').toDate()
            })
        });

        expect(res.statusCode).toEqual(200);
        expect(res.body.success).toEqual(true);
    });

    test('should fail if booklet_publication_deadline is invalid for Agora', async () => {
        const res = await request({
            uri: '/',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: generator.generateEvent({
                type: 'agora',
                application_period_starts: moment().add(1, 'months').toDate(),
                application_period_ends: moment().add(2, 'months').toDate(),
                board_approve_deadline: moment().add(3, 'months').toDate(),
                participants_list_publish_deadline: moment().add(4, 'months').toDate(),
                memberslist_submission_deadline: moment().add(5, 'months').toDate(),
                draft_proposal_deadline: moment().add(4, 'months').toDate(),
                final_proposal_deadline: moment().add(5, 'months').toDate(),
                candidature_deadline: moment().add(5, 'months').toDate(),
                booklet_publication_deadline: 'test',
                updated_booklet_publication_deadline: moment().add(5, 'months').toDate(),
                starts: moment().add(6, 'months').toDate(),
                ends: moment().add(7, 'months').toDate()
            })
        });

        expect(res.statusCode).toEqual(422);
        expect(res.body.success).toEqual(false);
        expect(Object.keys(res.body.errors).length).toEqual(1);
        expect(res.body.errors).toHaveProperty('booklet_publication_deadline');
    });

    test('should fail if updated_booklet_publication_deadline is after event starts', async () => {
        const res = await request({
            uri: '/',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: generator.generateEvent({
                application_period_starts: moment().add(1, 'months').toDate(),
                application_period_ends: moment().add(2, 'months').toDate(),
                board_approve_deadline: moment().add(3, 'months').toDate(),
                participants_list_publish_deadline: moment().add(4, 'months').toDate(),
                memberslist_submission_deadline: moment().add(4, 'months').toDate(),
                draft_proposal_deadline: moment().add(3, 'months').toDate(),
                final_proposal_deadline: moment().add(4, 'months').toDate(),
                candidature_deadline: moment().add(4, 'months').toDate(),
                booklet_publication_deadline: moment().add(3, 'months').toDate(),
                updated_booklet_publication_deadline: moment().add(7, 'months').toDate(),
                starts: moment().add(5, 'months').toDate(),
                ends: moment().add(6, 'months').toDate()
            })
        });

        expect(res.statusCode).toEqual(422);
        expect(res.body.success).toEqual(false);
        expect(Object.keys(res.body.errors).length).toEqual(1);
        expect(res.body.errors).toHaveProperty('updated_booklet_publication_deadline');
    });

    test('should fail if updated_booklet_publication_deadline is not set for Agora', async () => {
        const res = await request({
            uri: '/',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: generator.generateEvent({
                type: 'agora',
                application_period_starts: moment().add(1, 'months').toDate(),
                application_period_ends: moment().add(2, 'months').toDate(),
                board_approve_deadline: moment().add(3, 'months').toDate(),
                participants_list_publish_deadline: moment().add(4, 'months').toDate(),
                memberslist_submission_deadline: moment().add(5, 'months').toDate(),
                draft_proposal_deadline: moment().add(4, 'months').toDate(),
                final_proposal_deadline: moment().add(5, 'months').toDate(),
                candidature_deadline: moment().add(5, 'months').toDate(),
                booklet_publication_deadline: moment().add(4, 'months').toDate(),
                updated_booklet_publication_deadline: null,
                starts: moment().add(6, 'months').toDate(),
                ends: moment().add(7, 'months').toDate()
            })
        });

        expect(res.statusCode).toEqual(422);
        expect(res.body.success).toEqual(false);
        expect(Object.keys(res.body.errors).length).toEqual(1);
        expect(res.body.errors).toHaveProperty('updated_booklet_publication_deadline');
    });

    test('should not fail if updated_booklet_publication_deadline is not set for EPM', async () => {
        const res = await request({
            uri: '/',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: generator.generateEvent({
                type: 'epm',
                application_period_starts: moment().add(1, 'months').toDate(),
                application_period_ends: moment().add(2, 'months').toDate(),
                board_approve_deadline: moment().add(3, 'months').toDate(),
                participants_list_publish_deadline: moment().add(4, 'months').toDate(),
                memberslist_submission_deadline: moment().add(5, 'months').toDate(),
                draft_proposal_deadline: moment().add(4, 'months').toDate(),
                final_proposal_deadline: moment().add(5, 'months').toDate(),
                candidature_deadline: moment().add(5, 'months').toDate(),
                booklet_publication_deadline: moment().add(4, 'months').toDate(),
                updated_booklet_publication_deadline: null,
                starts: moment().add(6, 'months').toDate(),
                ends: moment().add(7, 'months').toDate()
            })
        });

        expect(res.statusCode).toEqual(200);
        expect(res.body.success).toEqual(true);
    });

    test('should fail if updated_booklet_publication_deadline is invalid for Agora', async () => {
        const res = await request({
            uri: '/',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: generator.generateEvent({
                type: 'agora',
                application_period_starts: moment().add(1, 'months').toDate(),
                application_period_ends: moment().add(2, 'months').toDate(),
                board_approve_deadline: moment().add(3, 'months').toDate(),
                participants_list_publish_deadline: moment().add(4, 'months').toDate(),
                memberslist_submission_deadline: moment().add(5, 'months').toDate(),
                draft_proposal_deadline: moment().add(4, 'months').toDate(),
                final_proposal_deadline: moment().add(5, 'months').toDate(),
                candidature_deadline: moment().add(5, 'months').toDate(),
                booklet_publication_deadline: moment().add(4, 'months').toDate(),
                updated_booklet_publication_deadline: 'test',
                starts: moment().add(6, 'months').toDate(),
                ends: moment().add(7, 'months').toDate()
            })
        });

        expect(res.statusCode).toEqual(422);
        expect(res.body.success).toEqual(false);
        expect(Object.keys(res.body.errors).length).toEqual(1);
        expect(res.body.errors).toHaveProperty('updated_booklet_publication_deadline');
    });

    test('should fail if updated_booklet_publication_deadline is before booklet_publication_deadline', async () => {
        const res = await request({
            uri: '/',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: generator.generateEvent({
                application_period_starts: moment().add(1, 'months').toDate(),
                application_period_ends: moment().add(2, 'months').toDate(),
                board_approve_deadline: moment().add(3, 'months').toDate(),
                participants_list_publish_deadline: moment().add(4, 'months').toDate(),
                memberslist_submission_deadline: moment().add(4, 'months').toDate(),
                draft_proposal_deadline: moment().add(3, 'months').toDate(),
                final_proposal_deadline: moment().add(4, 'months').toDate(),
                candidature_deadline: moment().add(4, 'months').toDate(),
                booklet_publication_deadline: moment().add(4, 'months').toDate(),
                updated_booklet_publication_deadline: moment().add(3, 'months').toDate(),
                starts: moment().add(5, 'months').toDate(),
                ends: moment().add(6, 'months').toDate()
            })
        });

        expect(res.statusCode).toEqual(422);
        expect(res.body.success).toEqual(false);
        expect(Object.keys(res.body.errors).length).toEqual(1);
        expect(res.body.errors).toHaveProperty('updated_booklet_publication_deadline');
    });

    test('should fail if questions is empty array', async () => {
        const res = await request({
            uri: '/',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: generator.generateEvent({
                questions: []
            })
        });

        expect(res.statusCode).toEqual(422);
        expect(res.body.success).toEqual(false);
    });

    test('should fail if questions is not an array', async () => {
        const res = await request({
            uri: '/',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: generator.generateEvent({
                questions: {},
                applications: []
            })
        });

        expect(res.statusCode).toEqual(422);
        expect(res.body.success).toEqual(false);
    });

    test('should fail if questions are malformed', async () => {
        const res = await request({
            uri: '/',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: generator.generateEvent({
                questions: ['']
            })
        });

        expect(res.statusCode).toEqual(422);
        expect(res.body.success).toEqual(false);
    });

    test('should fail if question.description is not set', async () => {
        const res = await request({
            uri: '/',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: generator.generateEvent({
                questions: [generator.generateQuestionForEvent({ description: null })]
            })
        });

        expect(res.statusCode).toEqual(422);
        expect(res.body.success).toEqual(false);
    });

    test('should fail if question.description is not string', async () => {
        const res = await request({
            uri: '/',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: generator.generateEvent({
                questions: [generator.generateQuestionForEvent({ description: { test: 'test' } })]
            })
        });

        expect(res.statusCode).toEqual(422);
        expect(res.body.success).toEqual(false);
    });

    test('should fail if question.required is not set', async () => {
        const res = await request({
            uri: '/',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: generator.generateEvent({
                questions: [generator.generateQuestionForEvent({ required: null })]
            })
        });

        expect(res.statusCode).toEqual(422);
        expect(res.body.success).toEqual(false);
    });

    test('should fail if question.required is not string', async () => {
        const res = await request({
            uri: '/',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: generator.generateEvent({
                questions: [generator.generateQuestionForEvent({ required: { test: 'test' } })]
            })
        });

        expect(res.statusCode).toEqual(422);
        expect(res.body.success).toEqual(false);
    });

    test('should fail if question.values is not an array when type is select', async () => {
        const res = await request({
            uri: '/',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: generator.generateEvent({
                questions: [generator.generateQuestionForEvent({ values: null, type: 'select' })]
            })
        });

        expect(res.statusCode).toEqual(422);
        expect(res.body.success).toEqual(false);
    });

    test('should fail if question.values.* is invalid when type is select', async () => {
        const res = await request({
            uri: '/',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: generator.generateEvent({
                questions: [generator.generateQuestionForEvent({ values: [{ test: 'test' }], type: 'select' })]
            })
        });

        expect(res.statusCode).toEqual(422);
        expect(res.body.success).toEqual(false);
    });

    test('should fail if question type is not set or invalid', async () => {
        const res = await request({
            uri: '/',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: generator.generateEvent({
                questions: [generator.generateQuestionForEvent({ type: null })]
            })
        });

        expect(res.statusCode).toEqual(422);
        expect(res.body.success).toEqual(false);
    });

    test('should fail if question type is unknown', async () => {
        const res = await request({
            uri: '/',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: generator.generateEvent({
                questions: [generator.generateQuestionForEvent({ type: 'test' })]
            })
        });

        expect(res.statusCode).toEqual(422);
        expect(res.body.success).toEqual(false);
    });

    test('should fail if question value is empty', async () => {
        const res = await request({
            uri: '/',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: generator.generateEvent({
                questions: [generator.generateQuestionForEvent({ values: [''], type: 'select' })]
            })
        });

        expect(res.statusCode).toEqual(422);
        expect(res.body.success).toEqual(false);
    });

    test('should succeed if type is select and everything is valid', async () => {
        const res = await request({
            uri: '/',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: generator.generateEvent({
                questions: [generator.generateQuestionForEvent({ values: ['test'], type: 'select' })]
            })
        });

        expect(res.statusCode).toEqual(200);
        expect(res.body.success).toEqual(true);
    });

    it('should return 422 if the locations is not an array', async () => {
        const event = generator.generateEvent({ locations: false });

        const res = await request({
            uri: '/',
            headers: { 'X-Auth-Token': 'foobar' },
            method: 'POST',
            body: event
        });

        expect(res.statusCode).toEqual(422);
        expect(res.body.success).toEqual(false);
        expect(res.body).toHaveProperty('errors');
        expect(res.body.errors).toHaveProperty('locations');
    });

    it('should return 422 if the locations is not an array', async () => {
        const event = generator.generateEvent({ locations: false });

        const res = await request({
            uri: '/',
            headers: { 'X-Auth-Token': 'foobar' },
            method: 'POST',
            body: event
        });

        expect(res.statusCode).toEqual(422);
        expect(res.body.success).toEqual(false);
        expect(res.body).toHaveProperty('errors');
        expect(res.body.errors).toHaveProperty('locations');
    });

    it('should return 422 if the locations.position is not an object', async () => {
        const event = generator.generateEvent({ locations: [false] });

        const res = await request({
            uri: '/',
            headers: { 'X-Auth-Token': 'foobar' },
            method: 'POST',
            body: event
        });

        expect(res.statusCode).toEqual(422);
        expect(res.body.success).toEqual(false);
        expect(res.body).toHaveProperty('errors');
        expect(res.body.errors).toHaveProperty('locations');
    });

    it('should return 422 if the locations.position[].name is not a string', async () => {
        const event = generator.generateEvent({ locations: [{ name: false }] });

        const res = await request({
            uri: '/',
            headers: { 'X-Auth-Token': 'foobar' },
            method: 'POST',
            body: event
        });

        expect(res.statusCode).toEqual(422);
        expect(res.body.success).toEqual(false);
        expect(res.body).toHaveProperty('errors');
        expect(res.body.errors).toHaveProperty('locations');
    });

    it('should return 422 if the locations.position[].name is empty', async () => {
        const event = generator.generateEvent({ locations: [{ name: '       ' }] });

        const res = await request({
            uri: '/',
            headers: { 'X-Auth-Token': 'foobar' },
            method: 'POST',
            body: event
        });

        expect(res.statusCode).toEqual(422);
        expect(res.body.success).toEqual(false);
        expect(res.body).toHaveProperty('errors');
        expect(res.body.errors).toHaveProperty('locations');
    });

    it('should return 422 if the locations.position[].position is invalid', async () => {
        const event = generator.generateEvent({ locations: [{ name: 'test', position: false }] });

        const res = await request({
            uri: '/',
            headers: { 'X-Auth-Token': 'foobar' },
            method: 'POST',
            body: event
        });

        expect(res.statusCode).toEqual(422);
        expect(res.body.success).toEqual(false);
        expect(res.body).toHaveProperty('errors');
        expect(res.body.errors).toHaveProperty('locations');
    });

    it('should return 422 if the locations.position[].position.lat is invalid', async () => {
        const event = generator.generateEvent({ locations: [{ name: 'test', position: { lat: false, lng: 1 } }] });

        const res = await request({
            uri: '/',
            headers: { 'X-Auth-Token': 'foobar' },
            method: 'POST',
            body: event
        });

        expect(res.statusCode).toEqual(422);
        expect(res.body.success).toEqual(false);
        expect(res.body).toHaveProperty('errors');
        expect(res.body.errors).toHaveProperty('locations');
    });

    it('should return 422 if the locations.position[].position.lat is invalid', async () => {
        const event = generator.generateEvent({ locations: [{ name: 'test', position: { lat: 1, lng: false } }] });

        const res = await request({
            uri: '/',
            headers: { 'X-Auth-Token': 'foobar' },
            method: 'POST',
            body: event
        });

        expect(res.statusCode).toEqual(422);
        expect(res.body.success).toEqual(false);
        expect(res.body).toHaveProperty('errors');
        expect(res.body.errors).toHaveProperty('locations');
    });

    it('should return 200 if locations is valid', async () => {
        const event = generator.generateEvent({ locations: [{ name: 'test', position: { lat: 1, lng: 1 } }] });

        const res = await request({
            uri: '/',
            headers: { 'X-Auth-Token': 'foobar' },
            method: 'POST',
            body: event
        });

        expect(res.statusCode).toEqual(200);
        expect(res.body.success).toEqual(true);
        expect(res.body).toHaveProperty('data');
    });
});
