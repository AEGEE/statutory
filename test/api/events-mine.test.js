const { startServer, stopServer } = require('../../lib/server.js');
const { request } = require('../scripts/helpers');
const mock = require('../scripts/mock-core-registry');
const generator = require('../scripts/generator');

describe('Events participating', () => {
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

    test('should not display events you haven\'t applied to', async () => {
        const event = await generator.createEvent({ status: 'published' });

        const res = await request({
            uri: '/mine',
            method: 'GET',
            headers: { 'X-Auth-Token': 'blablabla' }
        });

        expect(res.statusCode).toEqual(200);
        expect(res.body.success).toEqual(true);
        expect(res.body).not.toHaveProperty('errors');
        expect(res.body).toHaveProperty('data');

        const ids = res.body.data.map(e => e.id);
        expect(ids).not.toContain(event.id);
    });

    test('should display all published events you applied to', async () => {
      const event = await generator.createEvent({ status: 'published' });
      const application = await generator.createApplication({}, event);

      const res = await request({
        uri: '/mine',
        method: 'GET',
        headers: { 'X-Auth-Token': 'blablabla' }
      });

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toEqual(true);
      expect(res.body).not.toHaveProperty('errors');
      expect(res.body).toHaveProperty('data');

      const ids = res.body.data.map(e => e.id);
      expect(ids).toContain(event.id);
    });

});
