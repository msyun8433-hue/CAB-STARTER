/**
 * Tests for POST /api/sessions/create endpoint
 * TDD approach: Write tests first, then implement
 */

// Setup environment variables before importing handler
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-supabase-key';

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn().mockReturnValue({
    from: jest.fn().mockReturnValue({
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: 'session-uuid-123' },
            error: null,
          }),
        }),
      }),
    }),
  }),
}));

describe('POST /api/sessions/create', () => {
  let req, res, handler;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Dynamically import handler to ensure mocks are applied
    const handlerModule = await import('./sessions-create');
    handler = handlerModule.default;

    req = {
      method: 'POST',
      body: {
        stateName: 'morning',
        materialsText: 'I woke up feeling refreshed and ready for the day',
      },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  test('returns 405 for non-POST requests', async () => {
    req.method = 'GET';
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  test('returns 400 when stateName is missing', async () => {
    req.body.stateName = null;
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('stateName') })
    );
  });

  test('returns 400 when stateName is empty string', async () => {
    req.body.stateName = '   ';
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) })
    );
  });

  test('returns 400 when materialsText is missing', async () => {
    req.body.materialsText = null;
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('materialsText') })
    );
  });

  test('returns 400 when materialsText is less than 10 characters', async () => {
    req.body.materialsText = 'short';
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('10') })
    );
  });

  test('returns 400 when materialsText has only whitespace after trim', async () => {
    req.body.materialsText = '         ';
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('trims whitespace from stateName and materialsText', async () => {
    req.body.stateName = '  morning  ';
    req.body.materialsText = '  I woke up feeling refreshed and ready  ';
    await handler(req, res);
    // Should succeed with trimmed values
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test('successfully creates session with valid input', async () => {
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        sessionId: expect.any(String),
        message: expect.any(String),
      })
    );
  });

  test('returns sessionId in response', async () => {
    await handler(req, res);

    const responseCall = res.json.mock.calls[0][0];
    expect(responseCall.sessionId).toBeDefined();
    expect(typeof responseCall.sessionId).toBe('string');
    expect(responseCall.sessionId.length).toBeGreaterThan(0);
  });

  test('returns status 201 on successful creation', async () => {
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test('handles exact minimum length (10 chars) for materialsText', async () => {
    req.body.materialsText = '1234567890'; // exactly 10 chars
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test('handles database errors gracefully', async () => {
    // Re-mock to simulate DB error
    const { createClient } = require('@supabase/supabase-js');
    createClient.mockReturnValueOnce({
      from: jest.fn().mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          }),
        }),
      }),
    });

    // Re-import to use new mock
    const handlerModule = await import('./sessions-create');
    const freshHandler = handlerModule.default;

    await freshHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
