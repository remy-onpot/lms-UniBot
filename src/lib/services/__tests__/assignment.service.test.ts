import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AssignmentService } from '../assignment.service';

// Mock Supabase
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockInsert = vi.fn();
const mockUpload = vi.fn();
const mockGetPublicUrl = vi.fn();
const mockMaybeSingle = vi.fn();
const mockUpsert = vi.fn();

// Mocking relative to this test file
vi.mock('../../supabase', () => ({
  supabase: {
    from: () => ({
      select: mockSelect,
      insert: mockInsert,
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      upsert: mockUpsert,
    }),
    storage: {
      from: () => ({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      }),
    },
  },
}));

// Mock PDF Utils
vi.mock('../../utils/pdf-utils', () => ({
  // ✅ FIX: Return a string longer than 50 chars to trigger AI grading
  extractTextFromPDF: vi.fn().mockResolvedValue('This is a very long essay content that definitely has more than fifty characters to ensure the AI grading logic is triggered correctly in the service layer test.'),
}));

// Mock Global Fetch (for AI Grading)
global.fetch = vi.fn();

describe('AssignmentService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default Mock Chains
    mockSelect.mockReturnValue({
      eq: mockEq,
      order: vi.fn().mockReturnThis(),
    });
    
    mockEq.mockReturnValue({
      eq: mockEq,
      maybeSingle: mockMaybeSingle,
      single: vi.fn(),
    });

    mockGetPublicUrl.mockReturnValue({ data: { publicUrl: 'http://mock.url/file.pdf' } });
  });

  it('should submit an assignment successfully', async () => {
    // 1. Setup Mocks
    const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    
    // Attempts check
    mockMaybeSingle.mockResolvedValue({ data: { attempt_count: 0 }, error: null });
    // Upload success
    mockUpload.mockResolvedValue({ error: null });
    // DB Upsert success
    mockUpsert.mockResolvedValue({ error: null });

    // Mock AI API Response
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ score: 85, feedback: 'Good job', is_ai_generated: false, breakdown: {} }),
    });

    // 2. Call Service
    const result = await AssignmentService.submit('assign-1', 'user-1', mockFile, {
      title: 'Test Assignment',
      description: 'Test Desc',
      maxPoints: 100
    });

    // 3. Assertions
    expect(mockUpload).toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalledWith('/api/grade-assignment', expect.any(Object));
    expect(mockUpsert).toHaveBeenCalled();
    expect(result.score).toBe(85);
  });

  it('should fail if attempt limit reached', async () => {
    const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    
    // Mock limit reached
    mockMaybeSingle.mockResolvedValue({ data: { attempt_count: 2 }, error: null });

    await expect(AssignmentService.submit('assign-1', 'user-1', mockFile, {
      title: 'Test', description: 'Desc', maxPoints: 100
    })).rejects.toThrow("Limit Reached");
  });
});