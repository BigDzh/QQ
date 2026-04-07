const PAGE_REFRESH_DETECTION_KEY = 'qq_export_page_load_timestamp';
const LAST_ACTIVITY_KEY = 'qq_export_last_activity';
const TASK_SUBMISSION_TOKEN_KEY = 'qq_export_task_submission_token';
const PENDING_TASK_KEY = 'qq_export_pending_task';

interface PageRefreshState {
  isPageRefresh: boolean;
  previousTimestamp: string | null;
  submissionToken: string | null;
  pendingTaskData: Record<string, unknown> | null;
}

export function getPageRefreshState(): PageRefreshState {
  const currentTimestamp = Date.now().toString();
  const previousTimestamp = sessionStorage.getItem(PAGE_REFRESH_DETECTION_KEY);
  const submissionToken = sessionStorage.getItem(TASK_SUBMISSION_TOKEN_KEY);
  const pendingTaskDataStr = sessionStorage.getItem(PENDING_TASK_KEY);
  const pendingTaskData = pendingTaskDataStr ? JSON.parse(pendingTaskDataStr) : null;

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
  sessionStorage.setItem(PAGE_REFRESH_DETECTION_KEY, Date.now().toString());
}

export function generateSubmissionToken(): string {
  const token = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  sessionStorage.setItem(TASK_SUBMISSION_TOKEN_KEY, token);
  return token;
}

export function setPendingTaskData(taskData: Record<string, unknown>): void {
  sessionStorage.setItem(PENDING_TASK_KEY, JSON.stringify(taskData));
}

export function getAndClearPendingTask(): Record<string, unknown> | null {
  const pendingTaskStr = sessionStorage.getItem(PENDING_TASK_KEY);
  sessionStorage.removeItem(PENDING_TASK_KEY);
  sessionStorage.removeItem(TASK_SUBMISSION_TOKEN_KEY);
  return pendingTaskStr ? JSON.parse(pendingTaskStr) : null;
}

export function clearPendingTask(): void {
  sessionStorage.removeItem(PENDING_TASK_KEY);
  sessionStorage.removeItem(TASK_SUBMISSION_TOKEN_KEY);
}

export function isValidSubmissionToken(token: string): boolean {
  const storedToken = sessionStorage.getItem(TASK_SUBMISSION_TOKEN_KEY);
  return storedToken === token;
}

export function recordActivity(): void {
  sessionStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
}

export function wasRecentlyActive(): boolean {
  const lastActivity = sessionStorage.getItem(LAST_ACTIVITY_KEY);
  if (!lastActivity) return false;
  const diff = Date.now() - parseInt(lastActivity, 10);
  return diff < 5000;
}

export function isDuplicateSubmission(): boolean {
  const { isPageRefresh, pendingTaskData } = getPageRefreshState();
  return isPageRefresh && pendingTaskData !== null;
}
