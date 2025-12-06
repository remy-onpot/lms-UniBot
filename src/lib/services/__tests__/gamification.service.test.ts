import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GamificationService } from '../gamification.service';

// Mock Supabase
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();
const mockUpdate = vi.fn();
const mockInsert = vi.fn();

vi.mock('../../supabase', () => ({
  supabase: {
    from: () => ({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
    }),
  },
}));

describe('GamificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Setup chain
    mockSelect.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ single: mockSingle });
    mockUpdate.mockReturnValue({ eq: vi.fn() }); // End of update chain
  });

  afterEach(() => {
    vi.useRealTimers(); // Reset time after each test
  });

  it('should extend streak if activity is consecutive', async () => {
    // 1. Freeze Time to "Today"
    const today = new Date('2025-01-02T12:00:00Z');
    vi.useFakeTimers();
    vi.setSystemTime(today);

    // 2. Mock User: Active Yesterday
    mockSingle.mockResolvedValue({
      data: { 
        current_streak: 5, 
        last_activity_date: '2025-01-01', // Yesterday
        streak_freezes: 0, 
        xp: 100, 
        gems: 10 
      },
      error: null
    });

    // 3. Perform Activity
    const result = await GamificationService.recordActivity('user-1', 'quiz');

    // 4. Verify Streak Increased
    expect(result?.newStreak).toBe(6);
    
    // Verify DB Update
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
      current_streak: 6,
      last_activity_date: '2025-01-02' // Should act as "Today"
    }));
  });

  it('should reset streak if day is missed', async () => {
    // 1. Freeze Time to "Today"
    const today = new Date('2025-01-05T12:00:00Z');
    vi.useFakeTimers();
    vi.setSystemTime(today);

    // 2. Mock User: Active 3 Days Ago (Streak Broken)
    mockSingle.mockResolvedValue({
      data: { 
        current_streak: 10, 
        last_activity_date: '2025-01-01', 
        streak_freezes: 0 // No freezes to save them
      },
      error: null
    });

    // 3. Perform Activity
    const result = await GamificationService.recordActivity('user-1', 'quiz');

    // 4. Verify Streak Reset
    expect(result?.newStreak).toBe(1);
  });

  it('should consume freeze if available to save streak', async () => {
    // 1. Freeze Time (Missed 1 day)
    const today = new Date('2025-01-03T12:00:00Z');
    vi.useFakeTimers();
    vi.setSystemTime(today);

    // 2. Mock User: Active Jan 1st (Missed Jan 2nd), Has Freeze
    mockSingle.mockResolvedValue({
      data: { 
        current_streak: 10, 
        last_activity_date: '2025-01-01', 
        streak_freezes: 1 // Has a freeze!
      },
      error: null
    });

    // 3. Perform Activity
    const result = await GamificationService.recordActivity('user-1', 'quiz');

    // 4. Verify Streak Saved
    expect(result?.newStreak).toBe(11); // 10 -> 11
    expect(result?.usedFreeze).toBe(true);
    
    // Verify Freeze Deducted
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
      streak_freezes: 0
    }));
  });
});