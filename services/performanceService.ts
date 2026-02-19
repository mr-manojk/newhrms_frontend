
import { Goal, PerformanceReview, PerformanceFeedback } from '../types';
import { API_BASE_URL, handleResponse, cleanDateStr, safeFetch } from './apiClient';

export const performanceService = {
  // Goals
  async getGoals(): Promise<Goal[]> {
    const res = await safeFetch(`${API_BASE_URL}/performance/goals`, { cache: 'no-store' });
    if (!res) return [];
    const data = await handleResponse(res, "getGoals");
    return (data || []).map((g: any) => ({ ...g, dueDate: cleanDateStr(g.dueDate) }));
  },

  async saveGoals(goals: Goal[]): Promise<void> {
    const res = await safeFetch(`${API_BASE_URL}/performance/goals/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goals })
    });
    if (res) await handleResponse(res, "saveGoals");
  },

  // Reviews
  async getReviews(): Promise<PerformanceReview[]> {
    const res = await safeFetch(`${API_BASE_URL}/performance/reviews`, { cache: 'no-store' });
    if (!res) return [];
    const data = await handleResponse(res, "getReviews");
    return data || [];
  },

  async saveReviews(reviews: PerformanceReview[]): Promise<void> {
    const res = await safeFetch(`${API_BASE_URL}/performance/reviews/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviews })
    });
    if (res) await handleResponse(res, "saveReviews");
  },

  // Feedback
  async getFeedback(): Promise<PerformanceFeedback[]> {
    const res = await safeFetch(`${API_BASE_URL}/performance/feedback`, { cache: 'no-store' });
    if (!res) return [];
    const data = await handleResponse(res, "getFeedback");
    return (data || []).map((f: any) => ({ ...f, date: cleanDateStr(f.date) }));
  },

  async saveFeedback(feedback: PerformanceFeedback[]): Promise<void> {
    const res = await safeFetch(`${API_BASE_URL}/performance/feedback/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feedback })
    });
    if (res) await handleResponse(res, "saveFeedback");
  }
};
