import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FaceAnalyticsService } from '@/lib/services/face-analytics.service';
import { supabase } from '@/lib/supabase';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    rpc: vi.fn(),
  },
}));

describe('FaceAnalyticsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('recordFaceEvent', () => {
    it('should record a face event with correct payload', async () => {
      const mockUserId = 'user-123';

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: mockUserId } as any },
        error: null,
      } as any);

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: null,
      } as any);

      await FaceAnalyticsService.recordFaceEvent({
        eventType: 'pulse',
        faceState: 'happy',
        metadata: { context: 'test' },
      });

      expect(supabase.rpc).toHaveBeenCalledWith('record_face_event', {
        p_event_type: 'pulse',
        p_face_state: 'happy',
        p_metadata: { context: 'test' },
      });
    });

    it('should silently fail if user is not authenticated', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null as any },
        error: null,
      } as any);

      // Should not throw
      await FaceAnalyticsService.recordFaceEvent({
        eventType: 'pulse',
        faceState: 'happy',
      });

      expect(supabase.rpc).not.toHaveBeenCalled();
    });

    it('should handle RPC errors gracefully', async () => {
      const mockUserId = 'user-123';

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: mockUserId } as any },
        error: null,
      } as any);

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { message: 'RPC failed' } as any,
      } as any);

      // Should not throw
      await FaceAnalyticsService.recordFaceEvent({
        eventType: 'pulse',
        faceState: 'happy',
      });

      expect(supabase.rpc).toHaveBeenCalled();
    });
  });

  describe('logPulse', () => {
    it('should log a pulse event with provided context', async () => {
      const mockUserId = 'user-123';

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: mockUserId } as any },
        error: null,
      } as any);

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: null,
      } as any);

      await FaceAnalyticsService.logPulse('happy', { reason: 'quiz_success' });

      expect(supabase.rpc).toHaveBeenCalledWith('record_face_event', {
        p_event_type: 'pulse',
        p_face_state: 'happy',
        p_metadata: { reason: 'quiz_success' },
      });
    });
  });

  describe('logQuizComplete', () => {
    it('should log happy face for passing score', async () => {
      const mockUserId = 'user-123';

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: mockUserId } as any },
        error: null,
      } as any);

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: null,
      } as any);

      await FaceAnalyticsService.logQuizComplete('quiz-1', 8, 10, 100);

      expect(supabase.rpc).toHaveBeenCalledWith('record_face_event', {
        p_event_type: 'quiz_complete',
        p_face_state: 'happy',
        p_metadata: {
          quiz_id: 'quiz-1',
          score: 8,
          total: 10,
          xp_earned: 100,
        },
      });
    });

    it('should log sad face for failing score', async () => {
      const mockUserId = 'user-123';

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: mockUserId } as any },
        error: null,
      } as any);

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: null,
      } as any);

      await FaceAnalyticsService.logQuizComplete('quiz-1', 5, 10, 50);

      expect(supabase.rpc).toHaveBeenCalledWith('record_face_event', {
        p_event_type: 'quiz_complete',
        p_face_state: 'sad',
        p_metadata: {
          quiz_id: 'quiz-1',
          score: 5,
          total: 10,
          xp_earned: 50,
        },
      });
    });
  });

  describe('logShopPurchase', () => {
    it('should log shop purchase event', async () => {
      const mockUserId = 'user-123';

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: mockUserId } as any },
        error: null,
      } as any);

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: null,
      } as any);

      await FaceAnalyticsService.logShopPurchase('Golden Frame', 500);

      expect(supabase.rpc).toHaveBeenCalledWith('record_face_event', {
        p_event_type: 'shop_purchase',
        p_face_state: 'happy',
        p_metadata: {
          item_name: 'Golden Frame',
          cost: 500,
        },
      });
    });
  });

  describe('logError', () => {
    it('should log error event with sad face', async () => {
      const mockUserId = 'user-123';
      const mockError = new Error('Something went wrong');

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: mockUserId } as any },
        error: null,
      } as any);

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: null,
      } as any);

      await FaceAnalyticsService.logError('test_context', mockError);

      expect(supabase.rpc).toHaveBeenCalledWith('record_face_event', {
        p_event_type: 'error',
        p_face_state: 'sad',
        p_metadata: {
          context: 'test_context',
          error: 'Error: Something went wrong',
        },
      });
    });
  });

  describe('getEventsSummary', () => {
    it('should retrieve face events summary', async () => {
      const mockSummary = [
        {
          event_type: 'pulse',
          face_state: 'happy',
          count: 15,
          recent_at: '2025-12-07T10:00:00Z',
        },
      ];

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: mockSummary,
        error: null,
      } as any);

      const result = await FaceAnalyticsService.getEventsSummary(20);

      expect(supabase.rpc).toHaveBeenCalledWith('get_face_events_summary', {
        p_limit: 20,
      });

      expect(result).toEqual(mockSummary);
    });

    it('should return empty array on error', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { message: 'RPC failed' } as any,
      } as any);

      const result = await FaceAnalyticsService.getEventsSummary();

      expect(result).toEqual([]);
    });
  });
});
