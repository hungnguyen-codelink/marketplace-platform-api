import request from 'supertest';
import { createApp } from '../../src/app';
import { AppError } from '../../src/errors';

describe('createApp', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    app = createApp();
  });

  it('GET /health returns 200 with {status: "ok"}', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('parses JSON body correctly', async () => {
    // Create a test route that echoes the body
    app.post('/test-echo', (req: any, res: any) => {
      res.json(req.body);
    });

    const response = await request(app)
      .post('/test-echo')
      .send({ name: 'John', age: 30 });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ name: 'John', age: 30 });
  });

  it('handles AppError via errorHandler', async () => {
    // Create a new app instance for this test to avoid route conflicts
    const testApp = createApp();
    testApp.get('/error-test', (_req: any, _res: any, next: any) => {
      next(new AppError('Test error', 400));
    });

    const response = await request(testApp).get('/error-test');
    expect(response.status).toBe(400);
    expect(response.text).toContain('Test error');
  });

  it('handles NotFoundError via errorHandler', async () => {
    const { NotFoundError } = require('../../src/errors');

    // Create a new app instance for this test to avoid route conflicts
    const testApp = createApp();
    testApp.get('/not-found-test', (_req: any, _res: any, next: any) => {
      next(new NotFoundError('Resource not found'));
    });

    const response = await request(testApp).get('/not-found-test');
    expect(response.status).toBe(404);
    expect(response.text).toContain('Resource not found');
  });

  it('uses CORS middleware', async () => {
    const response = await request(app)
      .get('/health')
      .set('Origin', 'http://localhost:3001');

    // CORS middleware sets these headers (when enabled)
    expect(response.headers['access-control-allow-origin']).toBeDefined();
  });
});
