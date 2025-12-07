import { supabase } from '@/lib/supabase';

export interface FaceEventPayload {
  eventType: string;
  faceState?: string;
  metadata?: Record<string, any>;
}

export class FaceAnalyticsService {
  /**
   * Record a face event to the database
   * Call this from client-side when face state changes, or from server-side on backend events
   */
  static async recordFaceEvent(payload: FaceEventPayload): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return; // Silent fail if not authenticated

      const { error } = await supabase.rpc('record_face_event', {
        p_event_type: payload.eventType,
        p_face_state: payload.faceState || 'idle',
        p_metadata: payload.metadata || {},
      });

      if (error) {
        console.error('[FaceAnalytics] Error recording event:', error);
      }
    } catch (e) {
      console.error('[FaceAnalytics] Exception:', e);
    }
  }

  /**
   * Get summary of face events for current user (for analytics dashboard)
   */
  static async getEventsSummary(limit: number = 50) {
    try {
      const { data, error } = await supabase.rpc('get_face_events_summary', {
        p_limit: limit,
      });

      if (error) {
        console.error('[FaceAnalytics] Error fetching summary:', error);
        return [];
      }

      return data || [];
    } catch (e) {
      console.error('[FaceAnalytics] Exception:', e);
      return [];
    }
  }

  /**
   * Record a pulse event (temporary expression)
   */
  static async logPulse(faceState: string, context?: Record<string, any>): Promise<void> {
    return this.recordFaceEvent({
      eventType: 'pulse',
      faceState,
      metadata: context,
    });
  }

  /**
   * Record common micro-interaction events
   */
  static async logLogin(method: string): Promise<void> {
    return this.recordFaceEvent({
      eventType: 'login',
      faceState: 'happy',
      metadata: { method },
    });
  }

  static async logQuizStart(quizId: string, topic: string): Promise<void> {
    return this.recordFaceEvent({
      eventType: 'quiz_start',
      faceState: 'thinking',
      metadata: { quiz_id: quizId, topic },
    });
  }

  static async logQuizComplete(quizId: string, score: number, total: number, xpEarned: number): Promise<void> {
    const faceState = score / total >= 0.7 ? 'happy' : 'sad';
    return this.recordFaceEvent({
      eventType: 'quiz_complete',
      faceState,
      metadata: { quiz_id: quizId, score, total, xp_earned: xpEarned },
    });
  }

  static async logAssignmentSubmit(assignmentId: string, score: number): Promise<void> {
    const faceState = score >= 70 ? 'happy' : 'sad';
    return this.recordFaceEvent({
      eventType: 'assignment_submit',
      faceState,
      metadata: { assignment_id: assignmentId, score },
    });
  }

  static async logShopPurchase(itemName: string, cost: number): Promise<void> {
    return this.recordFaceEvent({
      eventType: 'shop_purchase',
      faceState: 'happy',
      metadata: { item_name: itemName, cost },
    });
  }

  static async logError(context: string, error: any): Promise<void> {
    return this.recordFaceEvent({
      eventType: 'error',
      faceState: 'sad',
      metadata: { context, error: String(error) },
    });
  }
}
