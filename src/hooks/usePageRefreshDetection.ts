const PAGE_REFRESH_DETECTION_KEY = 'qq_export_page_load_timestamp';
const LAST_ACTIVITY_KEY = 'qq_export_last_activity';
const TASK_SUBMISSION_TOKEN_KEY = 'qq_export_task_submission_token';
const PENDING_TASK_KEY = 'qq_export_pending_task';
import { logger } from '../utils/logger';

interface PageRefreshState {
  isPageRefresh: boolean;
  previousTimestamp: string | null;
  submissionToken: string | null;
  pendingTaskData: Record<string, unknown> | null;
}

function safeJsonParse<T>(str: string | null, fallback: T): T {
  if (!str) return fallback;
  try {
    return JSON.parse(str) as T;
  } catch (error) {
    logger.error('Failed to parse JSON:', error);
    return fallback;
  }
}

export function getPageRefreshState(): PageRefreshState {
  const currentTimestamp = Date.now().toString();
  const previousTimestamp = sessionStorage.getItem(PAGE_REFRESH_DETECTION_KEY);
  const submissionToken = sessionStorage.getItem(TASK_SUBMISSION_TOKEN_KEY);
  const pendingTaskData = safeJsonParse(
    sessionStorage.getItem(PENDING_TASK_KEY),
    null
  );

  const isPageRefresh = previousTimestamp !== null &&
    currentTimestamp !== previousTimestamp &&
    Date.now() - parseInt(previousTimestamp, 10) < 10000;

  return {
    isPageRefresh,
    previousTimestamp,
    submissionToken,
    pendingTaskData,
  };
}

export function markPageLoaded(): void {
  try {
    sessionStorage.setItem(PAGE_REFRESH_DETECTION_KEY, Date.now().toString());
  } catch (error) {
    logger.error('Failed to mark page loaded:', error);
  }
}

export function generateSubmissionToken(): string {
  const token = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  try {
    sessionStorage.setItem(TASK_SUBMISSION_TOKEN_KEY, token);
  } catch (error) {
    logger.error('Failed to generate submission token:', error);
  }
  return token;
}

export function setPendingTaskData(taskData: Record<string, unknown>): void {
  try {
    sessionStorage.setItem(PENDING_TASK_KEY, JSON.stringify(taskData));
  } catch (error) {
    logger.error('Failed to set pending task data:', error);
  }
}

export function getAndClearPendingTask(): Record<string, unknown> | null {
  const pendingTaskStr = sessionStorage.getItem(PENDING_TASK_KEY);
  sessionStorage.removeItem(PENDING_TASK_KEY);
  sessionStorage.removeItem(TASK_SUBMISSION_TOKEN_KEY);
  return safeJsonParse(pendingTaskStr, null);
}

export function clearPendingTask(): void {
  try {
    sessionStorage.removeItem(PENDING_TASK_KEY);
    sessionStorage.removeItem(TASK_SUBMISSION_TOKEN_KEY);
  } catch (error) {
    logger.error('Failed to clear pending task:', error);
  }
}

export function isValidSubmissionToken(token: string): boolean {
  try {
    const storedToken = sessionStorage.getItem(TASK_SUBMISSION_TOKEN_KEY);
    return storedToken === token;
  } catch (error) {
    logger.error('Failed to validate submission token:', error);
    return false;
  }
}

export function recordActivity(): void {
  try {
    sessionStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
  } catch (error) {
    logger.error('Failed to record activity:', error);
  }
}

export function wasRecentlyActive(): boolean {
  try {
    const lastActivity = sessionStorage.getItem(LAST_ACTIVITY_KEY);
    if (!lastActivity) return false;
    const diff = Date.now() - parseInt(lastActivity, 10);
    return diff < 5000;
  } catch (error) {
    logger.error('Failed to check recent activity:', error);
    return false;
  }
}

export function isDuplicateSubmission(): boolean {
  try {
    const { isPageRefresh, pendingTaskData } = getPageRefreshState();
    return isPageRefresh && pendingTaskData !== null;
  } catch (error) {
    logger.error('Failed to check duplicate submission:', error);
    return false;
  }
}

export function clearAllPageRefreshData(): void {
  try {
    sessionStorage.removeItem(PAGE_REFRESH_DETECTION_KEY);
    sessionStorage.removeItem(LAST_ACTIVITY_KEY);
    sessionStorage.removeItem(TASK_SUBMISSION_TOKEN_KEY);
    sessionStorage.removeItem(PENDING_TASK_KEY);
  } catch (error) {
    logger.error('Failed to clear all page refresh data:', error);
  }
}