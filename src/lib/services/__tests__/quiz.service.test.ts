import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QuizService } from '../quiz.service'; // Adjusted path

// Mock Supabase
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();
const mockMaybeSingle = vi.fn();
const mockInsert = vi.fn();
const mockOrder = vi.fn();

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: mockSelect,
      insert: mockInsert,
    }),
  },
}));

describe('QuizService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock chain
    mockSelect.mockReturnValue({
      eq: mockEq,
    });
    
    mockEq.mockReturnValue({
      eq: mockEq, // For chaining .eq().eq()
      single: mockSingle,
      maybeSingle: mockMaybeSingle,
      order: mockOrder,
    });

    mockOrder.mockReturnValue({
      limit: () => ({ maybeSingle: mockMaybeSingle }),
    });
  });

  it('should fetch a quiz by ID', async () => {
    const mockQuiz = { id: 'quiz-1', title: 'Test Quiz' };
    mockSingle.mockResolvedValue({ data: mockQuiz, error: null });

    const result = await QuizService.getById('quiz-1');
    expect(result).toEqual(mockQuiz);
    expect(mockSelect).toHaveBeenCalledWith('*, courses(id, classes(users(plan_tier)))');
  });

  it('should check student access correctly', async () => {
    // Case 1: Has Access
    mockMaybeSingle.mockResolvedValueOnce({ data: { id: 'access-1' }, error: null });
    const hasAccess = await QuizService.checkAccess('user-1', 'course-1');
    expect(hasAccess).toBe(true);

    // Case 2: No Access
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null });
    const noAccess = await QuizService.checkAccess('user-1', 'course-1');
    expect(noAccess).toBe(false);
  });

  it('should submit a quiz attempt', async () => {
    mockInsert.mockResolvedValue({ error: null });

    await QuizService.submitAttempt('quiz-1', 'user-1', 85, 10, 8);

    expect(mockInsert).toHaveBeenCalledWith([{
      quiz_id: 'quiz-1',
      student_id: 'user-1',
      score: 85,
      total_questions: 10,
      correct_answers: 8
    }]);
  });
});