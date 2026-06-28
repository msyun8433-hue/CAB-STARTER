/**
 * Tests for /api/mirror endpoint
 * Core validation and error handling tests
 */

// Setup environment variables before importing handler
process.env.GOOGLE_GEMINI_API_KEY = 'test-gemini-key-123';
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_KEY = 'test-supabase-key';

// Mock Google Generative AI SDK
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: jest.fn().mockResolvedValue({
        response: {
          text: jest.fn().mockReturnValue('Mock mirror text'),
          usageMetadata: { outputTokens: 256 },
        },
      }),
    }),
  })),
}));

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn().mockReturnValue({
    from: jest.fn().mockReturnValue({
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: 'uuid-123' },
            error: null,
          }),
        }),
      }),
    }),
  }),
}));

// Mock global fetch
global.fetch = jest.fn().mockResolvedValue({ ok: true });

const handler = require('./mirror');

describe('POST /api/mirror', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      method: 'POST',
      body: {
        userId: 'test-user-123',
        sensations: '머리가 맑다',
        oneWord: '평온',
        scene: '창밖을 보고 있다',
        sceneSensation: '햇살이 따뜻했다',
        sceneInterpretation: '나는 아직 살아있구나',
        voiceA: '이렇게까지 힘들게',
        voiceB: '하지만 너는 여기 있어',
        oneSentence: '내일은 한 발 더',
        sentenceFeeling: '불안하지만 희망도',
        tomorrowAction: '아침 산책',
        gratitude: ['햇살', '숨쉬는 것'],
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

  test('returns 400 when userId is missing', async () => {
    req.body.userId = null;
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    );
  });

  test('returns 400 when sensations is empty string', async () => {
    req.body.sensations = '   ';
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    );
  });

  test('returns 400 when gratitude is not an array', async () => {
    req.body.gratitude = 'single string';
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('successfully processes valid request', async () => {
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        mirrorText: expect.any(String),
        sessionId: expect.any(String),
        mirrorId: expect.any(String),
      })
    );
  });
});
