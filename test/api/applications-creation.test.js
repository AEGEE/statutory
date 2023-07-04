const moment = require('moment');
const tk = require('timekeeper');

const { startServer, stopServer } = require('../../lib/server');
const { request } = require('../scripts/helpers');
const { Application } = require('../../models');
const mock = require('../scripts/mock-core-registry');
const generator = require('../scripts/generator');
const regularUser = require('../assets/core-valid.json').data;

describe('Applications creation', () => {
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

    test('should succeed if user can apply within deadline but without permissions', async () => {
        mock.mockAll({ mainPermissions: { noPermissions: true } });
        const event = await generator.createEvent({ applications: [] });

        tk.travel(moment(event.application_period_starts).add(5, 'minutes').toDate());

        const res = await request({
            uri: '/events/' + event.id + '/applications/',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: generator.generateApplication({
                body_id: regularUser.bodies[0].id
            }, event)
        });

        tk.reset();

        expect(res.statusCode).toEqual(200);
        expect(res.body.success).toEqual(true);
        expect(res.body).not.toHaveProperty('errors');
        expect(res.body).toHaveProperty('data');
        expect(res.body.data.user_id).toEqual(regularUser.id);
    });

    test('should succeed for a user with permissions but not within deadline', async () => {
        const event = await generator.createEvent({ applications: [] });
        const application = generator.generateApplication({
            body_id: regularUser.bodies[0].id
        }, event);

        tk.travel(moment(event.application_period_starts).subtract(5, 'minutes').toDate());

        const res = await request({
            uri: '/events/' + event.id + '/applications/',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: application
        });

        tk.reset();

        expect(res.statusCode).toEqual(200);
        expect(res.body.success).toEqual(true);
        expect(res.body).not.toHaveProperty('errors');
        expect(res.body).toHaveProperty('data');
        expect(res.body.data.user_id).toEqual(regularUser.id);
    });

    test('should return 403 when user does not have permissions and not within deadline', async () => {
        mock.mockAll({ mainPermissions: { noPermissions: true } });

        const event = await generator.createEvent({ applications: [] });
        const application = generator.generateApplication({
            body_id: regularUser.bodies[0].id
        }, event);

        tk.travel(moment(event.application_period_starts).subtract(5, 'minutes').toDate());

        const res = await request({
            uri: '/events/' + event.id + '/applications/',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: application
        });

        tk.reset();

        expect(res.statusCode).toEqual(403);
        expect(res.body.success).toEqual(false);
        expect(res.body).not.toHaveProperty('data');
        expect(res.body).toHaveProperty('message');
    });

    test('should return 422 when user has already applied', async () => {
        mock.mockAll({ mainPermissions: { noPermissions: true } });

        const application = generator.generateApplication({
            user_id: regularUser.id,
            body_id: regularUser.bodies[0].id,
            answers: ['Test']
        });
        const event = await generator.createEvent({
            applications: [application],
            questions: [generator.generateQuestionForEvent({ type: 'string' })]
        });

        tk.travel(moment(event.application_period_starts).add(5, 'minutes').toDate());

        const res = await request({
            uri: '/events/' + event.id + '/applications/',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: application
        });

        tk.reset();

        expect(res.statusCode).toEqual(422);
        expect(res.body.success).toEqual(false);
        expect(res.body).not.toHaveProperty('data');
        expect(res.body).toHaveProperty('errors');
    });

    test('should return 422 if questions amount is not the same as answers amount', async () => {
        mock.mockAll({ mainPermissions: { noPermissions: true } });

        const event = await generator.createEvent({ questions: [generator.generateQuestionForEvent()] });
        const application = generator.generateApplication({
            answers: [],
            body_id: regularUser.bodies[0].id,
            user_id: null
        });

        tk.travel(moment(event.application_period_starts).add(5, 'minutes').toDate());

        const res = await request({
            uri: '/events/' + event.id + '/applications/',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: application
        });

        tk.reset();

        expect(res.statusCode).toEqual(422);
        expect(res.body.success).toEqual(false);
        expect(res.body).toHaveProperty('errors');
        expect(res.body).not.toHaveProperty('data');
        expect(res.body.errors).toHaveProperty('answers');
    });

    test('should return 422 if questions amount if the answers are not set', async () => {
        mock.mockAll({ mainPermissions: { noPermissions: true } });

        const event = await generator.createEvent({ questions: [generator.generateQuestionForEvent()], applications: [] });
        const application = generator.generateApplication({
            body_id: regularUser.bodies[0].id
        });
        delete application.user_id;
        delete application.answers;

        tk.travel(moment(event.application_period_starts).add(5, 'minutes').toDate());

        const res = await request({
            uri: '/events/' + event.id + '/applications/',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: application
        });

        tk.reset();

        expect(res.statusCode).toEqual(422);
        expect(res.body.success).toEqual(false);
        expect(res.body).toHaveProperty('errors');
        expect(res.body).not.toHaveProperty('data');
        expect(res.body.errors).toHaveProperty('answers');
    });

    test('should return 422 if some of answers are empty', async () => {
        mock.mockAll({ mainPermissions: { noPermissions: true } });

        const event = await generator.createEvent({ questions: [generator.generateQuestionForEvent()], applications: [] });
        const application = generator.generateApplication({
            user_id: regularUser.id,
            body_id: regularUser.bodies[0].id,
            answers: ['']
        });

        tk.travel(moment(event.application_period_starts).add(5, 'minutes').toDate());

        const res = await request({
            uri: '/events/' + event.id + '/applications/',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: application
        });

        tk.reset();

        expect(res.statusCode).toEqual(422);
        expect(res.body.success).toEqual(false);
        expect(res.body).toHaveProperty('errors');
        expect(res.body).not.toHaveProperty('data');
        expect(res.body.errors).toHaveProperty('answers');
    });

    test('should return 422 if answers is not an array', async () => {
        mock.mockAll({ mainPermissions: { noPermissions: true } });

        const event = await generator.createEvent({ questions: [generator.generateQuestionForEvent()], applications: [] });
        const application = generator.generateApplication({
            user_id: regularUser.id,
            body_id: regularUser.bodies[0].id,
            answers: 'Totally not an array.'
        });

        tk.travel(moment(event.application_period_starts).add(5, 'minutes').toDate());

        const res = await request({
            uri: '/events/' + event.id + '/applications/',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: application
        });

        tk.reset();

        expect(res.statusCode).toEqual(422);
        expect(res.body.success).toEqual(false);
        expect(res.body).toHaveProperty('errors');
        expect(res.body).not.toHaveProperty('data');
        expect(res.body.errors).toHaveProperty('answers');
    });

    test('should remove any additional fields', async () => {
        mock.mockAll({ mainPermissions: { noPermissions: true } });

        const event = await generator.createEvent({ applications: [] });
        const application = generator.generateApplication({
            body_id: regularUser.bodies[0].id
        }, event);

        application.status = 'accepted';
        application.participant_type = 'envoy';
        application.board_comment = 'Awesome guy, accept!';
        application.attended = true;
        application.confirmed = true;
        application.cancelled = true;
        application.arbitrary_field = 'some garbage';

        tk.travel(moment(event.application_period_starts).add(5, 'minutes').toDate());

        const res = await request({
            uri: '/events/' + event.id + '/applications/',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: application
        });

        tk.reset();

        expect(res.statusCode).toEqual(200);
        expect(res.body.success).toEqual(true);
        expect(res.body).not.toHaveProperty('errors');
        expect(res.body).toHaveProperty('data');
        expect(res.body.data.user_id).toEqual(regularUser.id);

        expect(res.body.data.status).not.toEqual(application.status);
        expect(res.body.data.participant_type).not.toEqual(application.participant_type);
        expect(res.body.data.board_comment).not.toEqual(application.board_comment);
        expect(res.body.data.attended).not.toEqual(application.attended);
        expect(res.body.data.confirmed).not.toEqual(application.confirmed);
        expect(res.body.data.cancelled).not.toEqual(application.cancelled);

        expect(res.body.data).not.toHaveProperty('arbitrary_field');
    });

    test('should return 403 if user is not a member of a body', async () => {
        const event = await generator.createEvent({ applications: [] });

        tk.travel(moment(event.application_period_starts).add(5, 'minutes').toDate());

        const res = await request({
            uri: '/events/' + event.id + '/applications/',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: generator.generateApplication({
                body_id: 1337
            }, event)
        });

        tk.reset();

        expect(res.statusCode).toEqual(403);
        expect(res.body.success).toEqual(false);
        expect(res.body).not.toHaveProperty('data');
        expect(res.body).toHaveProperty('message');
    });

    test('should return 200 if the text answer is not a text', async () => {
        mock.mockAll({ mainPermissions: { noPermissions: true } });

        const event = await generator.createEvent({
            questions: [generator.generateQuestionForEvent({ type: 'text' })],
            applications: []
        });
        const application = generator.generateApplication({
            body_id: regularUser.bodies[0].id,
            answers: [true]
        });

        tk.travel(moment(event.application_period_starts).add(5, 'minutes').toDate());

        const res = await request({
            uri: '/events/' + event.id + '/applications/',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: application
        });

        tk.reset();

        expect(res.statusCode).toEqual(422);
        expect(res.body.success).toEqual(false);
        expect(res.body).toHaveProperty('errors');
        expect(res.body).not.toHaveProperty('data');
        expect(res.body.errors).toHaveProperty('answers');
    });

    test('should return 422 if the text answer is empty, although required', async () => {
        mock.mockAll({ mainPermissions: { noPermissions: true } });

        const event = await generator.createEvent({
            questions: [generator.generateQuestionForEvent({ type: 'text' })],
            applications: []
        });
        const application = generator.generateApplication({
            body_id: regularUser.bodies[0].id,
            answers: ['']
        });

        tk.travel(moment(event.application_period_starts).add(5, 'minutes').toDate());

        const res = await request({
            uri: '/events/' + event.id + '/applications/',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: application
        });

        tk.reset();

        expect(res.statusCode).toEqual(422);
        expect(res.body.success).toEqual(false);
        expect(res.body).toHaveProperty('errors');
        expect(res.body).not.toHaveProperty('data');
        expect(res.body.errors).toHaveProperty('answers');
    });

    test('should return 422 if the number answer is not a number', async () => {
        mock.mockAll({ mainPermissions: { noPermissions: true } });

        const event = await generator.createEvent({
            questions: [generator.generateQuestionForEvent({ type: 'number' })],
            applications: []
        });
        const application = generator.generateApplication({
            body_id: regularUser.bodies[0].id,
            answers: ['NaN']
        });

        tk.travel(moment(event.application_period_starts).add(5, 'minutes').toDate());

        const res = await request({
            uri: '/events/' + event.id + '/applications/',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: application
        });

        tk.reset();

        expect(res.statusCode).toEqual(422);
        expect(res.body.success).toEqual(false);
        expect(res.body).toHaveProperty('errors');
        expect(res.body).not.toHaveProperty('data');
        expect(res.body.errors).toHaveProperty('answers');
    });

    test('should return 422 if the select answer is not in values', async () => {
        mock.mockAll({ mainPermissions: { noPermissions: true } });

        const event = await generator.createEvent({
            questions: [generator.generateQuestionForEvent({ type: 'select', values: ['valid'] })],
            applications: []
        });
        const application = generator.generateApplication({
            body_id: regularUser.bodies[0].id,
            answers: ['invalid']
        });

        tk.travel(moment(event.application_period_starts).add(5, 'minutes').toDate());

        const res = await request({
            uri: '/events/' + event.id + '/applications/',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: application
        });

        tk.reset();

        expect(res.statusCode).toEqual(422);
        expect(res.body.success).toEqual(false);
        expect(res.body).toHaveProperty('errors');
        expect(res.body).not.toHaveProperty('data');
        expect(res.body.errors).toHaveProperty('answers');
    });

    test('should return 422 if the select answer is not in values', async () => {
        mock.mockAll({ mainPermissions: { noPermissions: true } });

        const event = await generator.createEvent({
            questions: [generator.generateQuestionForEvent({ type: 'checkbox' })],
            applications: []
        });
        const application = generator.generateApplication({
            body_id: regularUser.bodies[0].id,
            answers: ['invalid']
        });

        tk.travel(moment(event.application_period_starts).add(5, 'minutes').toDate());

        const res = await request({
            uri: '/events/' + event.id + '/applications/',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: application
        });

        tk.reset();

        expect(res.statusCode).toEqual(422);
        expect(res.body.success).toEqual(false);
        expect(res.body).toHaveProperty('errors');
        expect(res.body).not.toHaveProperty('data');
        expect(res.body.errors).toHaveProperty('answers');
    });

    test('should return 200 if the text answer is not empty and required', async () => {
        mock.mockAll({ mainPermissions: { noPermissions: true } });

        const event = await generator.createEvent({
            questions: [generator.generateQuestionForEvent({ type: 'text' })],
            applications: []
        });
        const application = generator.generateApplication({
            body_id: regularUser.bodies[0].id,
            answers: ['test']
        });

        tk.travel(moment(event.application_period_starts).add(5, 'minutes').toDate());

        const res = await request({
            uri: '/events/' + event.id + '/applications/',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: application
        });

        tk.reset();

        expect(res.statusCode).toEqual(200);
        expect(res.body.success).toEqual(true);
        expect(res.body).not.toHaveProperty('errors');
        expect(res.body).toHaveProperty('data');
    });

    test('should return 200 if the number answer is a number', async () => {
        mock.mockAll({ mainPermissions: { noPermissions: true } });

        const event = await generator.createEvent({
            questions: [generator.generateQuestionForEvent({ type: 'number' })],
            applications: []
        });
        const application = generator.generateApplication({
            body_id: regularUser.bodies[0].id,
            answers: [3]
        });

        tk.travel(moment(event.application_period_starts).add(5, 'minutes').toDate());

        const res = await request({
            uri: '/events/' + event.id + '/applications/',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: application
        });

        tk.reset();

        expect(res.statusCode).toEqual(200);
        expect(res.body.success).toEqual(true);
        expect(res.body).not.toHaveProperty('errors');
        expect(res.body).toHaveProperty('data');
    });

    test('should return 200 if the select answer is in values', async () => {
        mock.mockAll({ mainPermissions: { noPermissions: true } });

        const event = await generator.createEvent({
            questions: [generator.generateQuestionForEvent({ type: 'select', values: ['valid'] })],
            applications: []
        });
        const application = generator.generateApplication({
            body_id: regularUser.bodies[0].id,
            answers: ['valid']
        });

        tk.travel(moment(event.application_period_starts).add(5, 'minutes').toDate());

        const res = await request({
            uri: '/events/' + event.id + '/applications/',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: application
        });

        tk.reset();

        expect(res.statusCode).toEqual(200);
        expect(res.body.success).toEqual(true);
        expect(res.body).not.toHaveProperty('errors');
        expect(res.body).toHaveProperty('data');
    });

    test('should return 422 if the checkbox answer is false', async () => {
        mock.mockAll({ mainPermissions: { noPermissions: true } });

        const event = await generator.createEvent({
            questions: [generator.generateQuestionForEvent({ type: 'checkbox', required: true })],
            applications: []
        });
        const application = generator.generateApplication({
            body_id: regularUser.bodies[0].id,
            answers: [false]
        });

        tk.travel(moment(event.application_period_starts).add(5, 'minutes').toDate());

        const res = await request({
            uri: '/events/' + event.id + '/applications/',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: application
        });

        tk.reset();

        expect(res.statusCode).toEqual(422);
        expect(res.body.success).toEqual(false);
        expect(res.body).toHaveProperty('errors');
        expect(res.body).not.toHaveProperty('data');
        expect(res.body.errors).toHaveProperty('answers');
    });

    test('should return 200 if the answer is valid boolean', async () => {
        mock.mockAll({ mainPermissions: { noPermissions: true } });

        const event = await generator.createEvent({
            questions: [generator.generateQuestionForEvent({ type: 'checkbox', required: false })],
            applications: []
        });
        const application = generator.generateApplication({
            body_id: regularUser.bodies[0].id,
            answers: [true]
        });

        tk.travel(moment(event.application_period_starts).add(5, 'minutes').toDate());

        const res = await request({
            uri: '/events/' + event.id + '/applications/',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: application
        });

        tk.reset();

        expect(res.statusCode).toEqual(200);
        expect(res.body.success).toEqual(true);
        expect(res.body).not.toHaveProperty('errors');
        expect(res.body).toHaveProperty('data');
    });

    test('should fail if user_id is not a number', async () => {
        const event = await generator.createEvent({
            questions: [generator.generateQuestionForEvent({ type: 'checkbox' })],
            applications: []
        });
        const applicationPromise = generator.createApplication({
            body_id: regularUser.bodies[0].id,
            answers: [true],
            user_id: 'invalid'
        }, event);

        expect.assertions(1);
        try {
            await applicationPromise;
        } catch (err) {
            expect(1).toEqual(1);
        }
    });

    const requiredFields = [
        'nationality',
        'number_of_events_visited',
        'meals'
    ];

    for (const field of requiredFields) {
        test(`should return 422 if ${field} is not set`, async () => {
            mock.mockAll({ mainPermissions: { noPermissions: true } });

            const event = await generator.createEvent({
                questions: [generator.generateQuestionForEvent({ type: 'checkbox' })],
                applications: []
            });
            const application = generator.generateApplication({
                body_id: regularUser.bodies[0].id,
                answers: [true]
            });
            delete application[field];

            tk.travel(moment(event.application_period_starts).add(5, 'minutes').toDate());

            const res = await request({
                uri: '/events/' + event.id + '/applications/',
                method: 'POST',
                headers: { 'X-Auth-Token': 'blablabla' },
                body: application
            });

            tk.reset();

            expect(res.statusCode).toEqual(422);
            expect(res.body.success).toEqual(false);
            expect(res.body).toHaveProperty('errors');
            expect(res.body).not.toHaveProperty('data');
            expect(res.body.errors).toHaveProperty(field);
        });

        test(`should return 422 if ${field} is empty`, async () => {
            mock.mockAll({ mainPermissions: { noPermissions: true } });

            const event = await generator.createEvent({
                questions: [generator.generateQuestionForEvent({ type: 'checkbox' })],
                applications: []
            });
            const application = generator.generateApplication({
                body_id: regularUser.bodies[0].id,
                answers: [true]
            });
            application[field] = '';

            tk.travel(moment(event.application_period_starts).add(5, 'minutes').toDate());

            const res = await request({
                uri: '/events/' + event.id + '/applications/',
                method: 'POST',
                headers: { 'X-Auth-Token': 'blablabla' },
                body: application
            });

            tk.reset();

            expect(res.statusCode).toEqual(422);
            expect(res.body.success).toEqual(false);
            expect(res.body).toHaveProperty('errors');
            expect(res.body).not.toHaveProperty('data');
            expect(res.body.errors).toHaveProperty(field);
        });
    }

    test('should return 422 if number_of_events_visited is not a number', async () => {
        mock.mockAll({ mainPermissions: { noPermissions: true } });

        const event = await generator.createEvent({
            questions: [generator.generateQuestionForEvent({ type: 'checkbox' })],
            applications: []
        });
        const application = generator.generateApplication({
            body_id: regularUser.bodies[0].id,
            answers: [true]
        });
        application.number_of_events_visited = false;

        tk.travel(moment(event.application_period_starts).add(5, 'minutes').toDate());

        const res = await request({
            uri: '/events/' + event.id + '/applications/',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: application
        });

        tk.reset();

        expect(res.statusCode).toEqual(422);
        expect(res.body.success).toEqual(false);
        expect(res.body).toHaveProperty('errors');
        expect(res.body).not.toHaveProperty('data');
        expect(res.body.errors).toHaveProperty('number_of_events_visited');
    });

    test('should return 422 if number_of_events_visited is negative', async () => {
        mock.mockAll({ mainPermissions: { noPermissions: true } });

        const event = await generator.createEvent({
            questions: [generator.generateQuestionForEvent({ type: 'checkbox' })],
            applications: []
        });
        const application = generator.generateApplication({
            body_id: regularUser.bodies[0].id,
            answers: [true]
        });
        application.number_of_events_visited = -1;

        tk.travel(moment(event.application_period_starts).add(5, 'minutes').toDate());

        const res = await request({
            uri: '/events/' + event.id + '/applications/',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: application
        });

        tk.reset();

        expect(res.statusCode).toEqual(422);
        expect(res.body.success).toEqual(false);
        expect(res.body).toHaveProperty('errors');
        expect(res.body).not.toHaveProperty('data');
        expect(res.body.errors).toHaveProperty('number_of_events_visited');
    });

    test('should return 422 if meals is not one of the allowed options', async () => {
        mock.mockAll({ mainPermissions: { noPermissions: true } });

        const event = await generator.createEvent({
            questions: [generator.generateQuestionForEvent({ type: 'checkbox' })],
            applications: []
        });
        const application = generator.generateApplication({
            body_id: regularUser.bodies[0].id,
            answers: [true]
        });
        application.meals = 'gluten-free';

        tk.travel(moment(event.application_period_starts).add(5, 'minutes').toDate());

        const res = await request({
            uri: '/events/' + event.id + '/applications/',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: application
        });

        tk.reset();

        expect(res.statusCode).toEqual(422);
        expect(res.body.success).toEqual(false);
        expect(res.body).toHaveProperty('errors');
        expect(res.body).not.toHaveProperty('data');
        expect(res.body.errors).toHaveProperty('meals');
    });

    test('should return 500 if meat-eater is given but not allowed', async () => {
        mock.mockAll({ mainPermissions: { noPermissions: true } });

        const event = await generator.createEvent({
            vegetarian: true,
            questions: [generator.generateQuestionForEvent({ type: 'checkbox' })],
            applications: []
        });
        const application = generator.generateApplication({
            body_id: regularUser.bodies[0].id,
            answers: [true]
        }, event);
        application.meals = 'Meat-eater';

        tk.travel(moment(event.application_period_starts).add(5, 'minutes').toDate());

        const res = await request({
            uri: '/events/' + event.id + '/applications/',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: application
        });

        tk.reset();

        expect(res.statusCode).toEqual(500);
        expect(res.body.success).toEqual(false);
        expect(res.body.message).toContain('Meat-eater is not allowed');
        expect(res.body).not.toHaveProperty('data');
    });

    const visaFields = [
        'visa_place_of_birth',
        'visa_passport_number',
        'visa_passport_issue_date',
        'visa_passport_expiration_date',
        'visa_passport_issue_authority',
        'visa_embassy',
        'visa_street_and_house',
        'visa_postal_code',
        'visa_city',
        'visa_country'
    ];

    for (const visaField of visaFields) {
        test(`should return 422 if visa is required, but ${visaField} is not set`, async () => {
            mock.mockAll({ mainPermissions: { noPermissions: true } });

            const event = await generator.createEvent({
                questions: [generator.generateQuestionForEvent({ type: 'checkbox' })],
                applications: []
            });
            const application = generator.generateApplication({
                body_id: regularUser.bodies[0].id,
                answers: [true]
            });
            delete application[visaField];

            tk.travel(moment(event.application_period_starts).add(5, 'minutes').toDate());

            const res = await request({
                uri: '/events/' + event.id + '/applications/',
                method: 'POST',
                headers: { 'X-Auth-Token': 'blablabla' },
                body: application
            });

            tk.reset();

            expect(res.statusCode).toEqual(422);
            expect(res.body.success).toEqual(false);
            expect(res.body).toHaveProperty('errors');
            expect(res.body).not.toHaveProperty('data');
            expect(res.body.errors).toHaveProperty('visaFieldsFilledIn');
        });

        test(`should return 422 if visa is required, but ${visaField} is null`, async () => {
            mock.mockAll({ mainPermissions: { noPermissions: true } });

            const event = await generator.createEvent({
                questions: [generator.generateQuestionForEvent({ type: 'checkbox' })],
                applications: []
            });
            const application = generator.generateApplication({
                body_id: regularUser.bodies[0].id,
                answers: [true]
            });
            application[visaField] = null;

            tk.travel(moment(event.application_period_starts).add(5, 'minutes').toDate());

            const res = await request({
                uri: '/events/' + event.id + '/applications/',
                method: 'POST',
                headers: { 'X-Auth-Token': 'blablabla' },
                body: application
            });

            tk.reset();

            expect(res.statusCode).toEqual(422);
            expect(res.body.success).toEqual(false);
            expect(res.body).toHaveProperty('errors');
            expect(res.body).not.toHaveProperty('data');
            expect(res.body.errors).toHaveProperty('visaFieldsFilledIn');
        });

        test(`should return 422 if visa is required, but ${visaField} is not a string`, async () => {
            mock.mockAll({ mainPermissions: { noPermissions: true } });

            const event = await generator.createEvent({
                questions: [generator.generateQuestionForEvent({ type: 'checkbox' })],
                applications: []
            });
            const application = generator.generateApplication({
                body_id: regularUser.bodies[0].id,
                answers: [true]
            });
            application[visaField] = false;

            tk.travel(moment(event.application_period_starts).add(5, 'minutes').toDate());

            const res = await request({
                uri: '/events/' + event.id + '/applications/',
                method: 'POST',
                headers: { 'X-Auth-Token': 'blablabla' },
                body: application
            });

            tk.reset();

            expect(res.statusCode).toEqual(422);
            expect(res.body.success).toEqual(false);
            expect(res.body).toHaveProperty('errors');
            expect(res.body).not.toHaveProperty('data');
            expect(res.body.errors).toHaveProperty('visaFieldsFilledIn');
        });

        test(`should return 422 if visa is required, but ${visaField} is empty`, async () => {
            mock.mockAll({ mainPermissions: { noPermissions: true } });

            const event = await generator.createEvent({
                questions: [generator.generateQuestionForEvent({ type: 'checkbox' })],
                applications: []
            });
            const application = generator.generateApplication({
                body_id: regularUser.bodies[0].id,
                answers: [true]
            });
            application[visaField] = '';

            tk.travel(moment(event.application_period_starts).add(5, 'minutes').toDate());

            const res = await request({
                uri: '/events/' + event.id + '/applications/',
                method: 'POST',
                headers: { 'X-Auth-Token': 'blablabla' },
                body: application
            });

            tk.reset();

            expect(res.statusCode).toEqual(422);
            expect(res.body.success).toEqual(false);
            expect(res.body).toHaveProperty('errors');
            expect(res.body).not.toHaveProperty('data');
            expect(res.body.errors).toHaveProperty('visaFieldsFilledIn');
        });
    }

    test('should return 500 and not save application if mailer returns net error', async () => {
        mock.mockAll({ mainPermissions: { noPermissions: true }, mailer: { netError: true } });

        const event = await generator.createEvent({
            questions: [generator.generateQuestionForEvent({ type: 'checkbox' })],
            applications: []
        });
        const application = generator.generateApplication({
            body_id: regularUser.bodies[0].id,
            answers: [true]
        });

        tk.travel(moment(event.application_period_starts).add(5, 'minutes').toDate());

        const res = await request({
            uri: '/events/' + event.id + '/applications/',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: application
        });

        tk.reset();

        expect(res.statusCode).toEqual(500);
        expect(res.body.success).toEqual(false);
        expect(res.body).toHaveProperty('message');
        expect(res.body).not.toHaveProperty('data');

        const applications = await Application.findAll({ where: { event_id: event.id } });
        expect(applications.length).toEqual(0);
    });

    test('should return 500 and not save application if mailer returns bad response', async () => {
        mock.mockAll({ mainPermissions: { noPermissions: true }, mailer: { badResponse: true } });

        const event = await generator.createEvent({
            questions: [generator.generateQuestionForEvent({ type: 'checkbox' })],
            applications: []
        });
        const application = generator.generateApplication({
            body_id: regularUser.bodies[0].id,
            answers: [true]
        });

        tk.travel(moment(event.application_period_starts).add(5, 'minutes').toDate());

        const res = await request({
            uri: '/events/' + event.id + '/applications/',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: application
        });

        tk.reset();

        expect(res.statusCode).toEqual(500);
        expect(res.body.success).toEqual(false);
        expect(res.body).toHaveProperty('message');
        expect(res.body).not.toHaveProperty('data');

        const applications = await Application.findAll({ where: { event_id: event.id } });
        expect(applications.length).toEqual(0);
    });

    test('should return 500 and not save application if mailer returns unsuccessful response', async () => {
        mock.mockAll({ mainPermissions: { noPermissions: true }, mailer: { unsuccessfulResponse: true } });

        const event = await generator.createEvent({
            questions: [generator.generateQuestionForEvent({ type: 'checkbox' })],
            applications: []
        });
        const application = generator.generateApplication({
            body_id: regularUser.bodies[0].id,
            answers: [true]
        });

        tk.travel(moment(event.application_period_starts).add(5, 'minutes').toDate());

        const res = await request({
            uri: '/events/' + event.id + '/applications/',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: application
        });

        tk.reset();

        expect(res.statusCode).toEqual(500);
        expect(res.body.success).toEqual(false);
        expect(res.body).toHaveProperty('message');
        expect(res.body).not.toHaveProperty('data');

        const applications = await Application.findAll({ where: { event_id: event.id } });
        expect(applications.length).toEqual(0);
    });

    test('should return 500 and not save application if core login returns net error', async () => {
        mock.mockAll({ mainPermissions: { noPermissions: true }, login: { netError: true } });

        const event = await generator.createEvent({
            questions: [generator.generateQuestionForEvent({ type: 'checkbox' })],
            applications: []
        });
        const application = generator.generateApplication({
            body_id: regularUser.bodies[0].id,
            answers: [true]
        });

        tk.travel(moment(event.application_period_starts).add(5, 'minutes').toDate());

        const res = await request({
            uri: '/events/' + event.id + '/applications/',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: application
        });

        tk.reset();

        expect(res.statusCode).toEqual(500);
        expect(res.body.success).toEqual(false);
        expect(res.body).toHaveProperty('message');
        expect(res.body).not.toHaveProperty('data');

        const applications = await Application.findAll({ where: { event_id: event.id } });
        expect(applications.length).toEqual(0);
    });

    test('should return 500 and not save application if core login returns bad response', async () => {
        mock.mockAll({ mainPermissions: { noPermissions: true }, login: { badResponse: true } });

        const event = await generator.createEvent({
            questions: [generator.generateQuestionForEvent({ type: 'checkbox' })],
            applications: []
        });
        const application = generator.generateApplication({
            body_id: regularUser.bodies[0].id,
            answers: [true]
        });

        tk.travel(moment(event.application_period_starts).add(5, 'minutes').toDate());

        const res = await request({
            uri: '/events/' + event.id + '/applications/',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: application
        });

        tk.reset();

        expect(res.statusCode).toEqual(500);
        expect(res.body.success).toEqual(false);
        expect(res.body).toHaveProperty('message');
        expect(res.body).not.toHaveProperty('data');

        const applications = await Application.findAll({ where: { event_id: event.id } });
        expect(applications.length).toEqual(0);
    });

    test('should return 500 and not save application if core login returns unsuccessful response', async () => {
        mock.mockAll({ mainPermissions: { noPermissions: true }, login: { unsuccessfulResponse: true } });

        const event = await generator.createEvent({
            questions: [generator.generateQuestionForEvent({ type: 'checkbox' })],
            applications: []
        });
        const application = generator.generateApplication({
            body_id: regularUser.bodies[0].id,
            answers: [true]
        });

        tk.travel(moment(event.application_period_starts).add(5, 'minutes').toDate());

        const res = await request({
            uri: '/events/' + event.id + '/applications/',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: application
        });

        tk.reset();

        expect(res.statusCode).toEqual(500);
        expect(res.body.success).toEqual(false);
        expect(res.body).toHaveProperty('message');
        expect(res.body).not.toHaveProperty('data');

        const applications = await Application.findAll({ where: { event_id: event.id } });
        expect(applications.length).toEqual(0);
    });

    test('should return 500 and not save application if core bodies members list returns net error', async () => {
        mock.mockAll({ mainPermissions: { noPermissions: true }, bodyMembers: { netError: true } });

        const event = await generator.createEvent({
            questions: [generator.generateQuestionForEvent({ type: 'checkbox' })],
            applications: []
        });
        const application = generator.generateApplication({
            body_id: regularUser.bodies[0].id,
            answers: [true]
        });

        tk.travel(moment(event.application_period_starts).add(5, 'minutes').toDate());

        const res = await request({
            uri: '/events/' + event.id + '/applications/',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: application
        });

        tk.reset();

        expect(res.statusCode).toEqual(500);
        expect(res.body.success).toEqual(false);
        expect(res.body).toHaveProperty('message');
        expect(res.body).not.toHaveProperty('data');

        const applications = await Application.findAll({ where: { event_id: event.id } });
        expect(applications.length).toEqual(0);
    });

    test('should return 500 and not save application if core bodies members list returns bad response', async () => {
        mock.mockAll({ mainPermissions: { noPermissions: true }, bodyMembers: { badResponse: true } });

        const event = await generator.createEvent({
            questions: [generator.generateQuestionForEvent({ type: 'checkbox' })],
            applications: []
        });
        const application = generator.generateApplication({
            body_id: regularUser.bodies[0].id,
            answers: [true]
        });

        tk.travel(moment(event.application_period_starts).add(5, 'minutes').toDate());

        const res = await request({
            uri: '/events/' + event.id + '/applications/',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: application
        });

        tk.reset();

        expect(res.statusCode).toEqual(500);
        expect(res.body.success).toEqual(false);
        expect(res.body).toHaveProperty('message');
        expect(res.body).not.toHaveProperty('data');

        const applications = await Application.findAll({ where: { event_id: event.id } });
        expect(applications.length).toEqual(0);
    });

    test('should return 500 and not save application if core bodies members list returns unsuccessful response', async () => {
        mock.mockAll({ mainPermissions: { noPermissions: true }, bodyMembers: { unsuccessfulResponse: true } });

        const event = await generator.createEvent({
            questions: [generator.generateQuestionForEvent({ type: 'checkbox' })],
            applications: []
        });
        const application = generator.generateApplication({
            body_id: regularUser.bodies[0].id,
            answers: [true]
        });

        tk.travel(moment(event.application_period_starts).add(5, 'minutes').toDate());

        const res = await request({
            uri: '/events/' + event.id + '/applications/',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: application
        });

        tk.reset();

        expect(res.statusCode).toEqual(500);
        expect(res.body.success).toEqual(false);
        expect(res.body).toHaveProperty('message');
        expect(res.body).not.toHaveProperty('data');

        const applications = await Application.findAll({ where: { event_id: event.id } });
        expect(applications.length).toEqual(0);
    });

    test('should skip sending mails to board if there is no board', async () => {
        mock.mockAll({
            mainPermissions: { noPermissions: true },
            bodyMembers: { empty: true },
        });

        const event = await generator.createEvent({
            questions: [generator.generateQuestionForEvent({ type: 'checkbox' })],
            applications: []
        });
        const application = generator.generateApplication({
            body_id: regularUser.bodies[0].id,
            answers: [true]
        });

        tk.travel(moment(event.application_period_starts).add(5, 'minutes').toDate());

        const res = await request({
            uri: '/events/' + event.id + '/applications/',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: application
        });

        tk.reset();

        expect(res.statusCode).toEqual(200);
        expect(res.body.success).toEqual(true);
        expect(res.body).toHaveProperty('data');
        expect(res.body).not.toHaveProperty('errors');
    });

    describe('should update is_on_memberslist for user', () => {
        test('should set is_on_memberslist = true if there\'s an ID match', async () => {
            const event = await generator.createEvent({ type: 'agora' });
            await generator.createMembersList({
                body_id: regularUser.bodies[0].id,
                members: [generator.generateMembersListMember({
                    user_id: regularUser.id,
                    first_name: 'testing',
                    last_name: 'stuff'
                })]
            }, event);

            const application = generator.generateApplication({
                body_id: regularUser.bodies[0].id
            }, event);

            tk.travel(moment(event.application_period_starts).subtract(5, 'minutes').toDate());

            const res = await request({
                uri: '/events/' + event.id + '/applications/',
                method: 'POST',
                headers: { 'X-Auth-Token': 'blablabla' },
                body: application
            });

            expect(res.statusCode).toEqual(200);
            expect(res.body.success).toEqual(true);
            expect(res.body).toHaveProperty('data');

            const applicationFromDb = await Application.findByPk(res.body.data.id);
            expect(applicationFromDb.is_on_memberslist).toEqual(true);
        });

        test('should set is_on_memberslist = true if there\'s the first/last name match', async () => {
            const event = await generator.createEvent({ type: 'agora' });
            await generator.createMembersList({
                body_id: regularUser.bodies[0].id,
                members: [generator.generateMembersListMember({
                    user_id: 300,
                    first_name: regularUser.first_name,
                    last_name: regularUser.last_name
                })]
            }, event);

            const application = generator.generateApplication({
                body_id: regularUser.bodies[0].id
            }, event);

            tk.travel(moment(event.application_period_starts).subtract(5, 'minutes').toDate());

            const res = await request({
                uri: '/events/' + event.id + '/applications/',
                method: 'POST',
                headers: { 'X-Auth-Token': 'blablabla' },
                body: application
            });

            expect(res.statusCode).toEqual(200);
            expect(res.body.success).toEqual(true);
            expect(res.body).toHaveProperty('data');

            const applicationFromDb = await Application.findByPk(res.body.data.id);
            expect(applicationFromDb.is_on_memberslist).toEqual(true);
        });
    });

    test('should calculate statutory_id correctly', async () => {
        const event = await generator.createEvent({ applications: [] });

        // user with ID 2 applied first => statutory_id === XXX-0001
        // current user (with ID 1) applied second => statutory_id === XXX-0002
        const firstApplication = await generator.createApplication({ user_id: 2 }, event);
        const application = generator.generateApplication({
            body_id: regularUser.bodies[0].id,
        }, event);

        const res = await request({
            uri: '/events/' + event.id + '/applications/',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: application
        });

        expect(res.statusCode).toEqual(200);
        expect(res.body.success).toEqual(true);
        expect(res.body).not.toHaveProperty('errors');
        expect(res.body).toHaveProperty('data');

        expect(firstApplication.statutory_id).toEqual(event.id.toString().padStart(3, '0') + '-0001');
        expect(res.body.data.statutory_id).toEqual(event.id.toString().padStart(3, '0') + '-0002');
    });

    test('should prevent applying if cannot assign pax type', async () => {
        const event = await generator.createEvent({ applications: [] });
        await generator.createPaxLimit({
            event_type: event.type,
            body_id: regularUser.bodies[0].id,
            delegate: 0,
            observer: 0,
            visitor: 0,
            envoy: 0
        });

        const application = generator.generateApplication({
            body_id: regularUser.bodies[0].id,
        }, event);

        const res = await request({
            uri: '/events/' + event.id + '/applications/',
            method: 'POST',
            headers: { 'X-Auth-Token': 'blablabla' },
            body: application
        });

        expect(res.statusCode).toEqual(403);
        expect(res.body.success).toEqual(false);
        expect(res.body).not.toHaveProperty('data');
        expect(res.body).toHaveProperty('message');
    });
});
