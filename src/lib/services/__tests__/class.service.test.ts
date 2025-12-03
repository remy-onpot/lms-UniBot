import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClassService } from '../class.service';

// 1. Mock the Supabase client
const mockSelect = vi.fn();
const mockEq = vi.fn();

vi.mock('../../supabase', () => ({
  supabase: {
    from: () => ({
      select: mockSelect,
    }),
  },
}));

describe('ClassService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the mock chain for each test
    mockSelect.mockReturnValue({
      eq: mockEq,
    });
  });

  it('should fetch owned classes for a lecturer', async () => {
    // A. Setup Mock Data
    const mockClasses = [
      { id: '1', name: 'CS101', lecturer_id: 'user-123' },
      { id: '2', name: 'CS102', lecturer_id: 'user-123' }
    ];

    // Tell the mock what to return when called
    mockEq.mockResolvedValue({ data: mockClasses, error: null });

    // B. Call the Service
    const result = await ClassService.getDashboardClasses('user-123', 'lecturer', false);

    // C. Assertions (Expectations)
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('CS101');
    expect(result[0].isOwner).toBe(true); // Should verify ownership logic
    expect(result[0].progress).toBe(0);   // Lecturers have 0 progress by default
  });

  it('should return an empty list if database error occurs', async () => {
    // Simulate an error
    mockEq.mockResolvedValue({ data: null, error: { message: 'DB Error' } });

    // Note: Our service currently awaits data. If data is null, the loop won't run.
    // Ideally, the service should throw, but let's see how it behaves.
    const result = await ClassService.getDashboardClasses('user-123', 'lecturer', false);
    
    expect(result).toEqual([]);
  });
});