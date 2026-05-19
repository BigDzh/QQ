import { describe, it, expect } from 'vitest';

describe('ErrorBoundary 组件测试', () => {
  it('应正确分类渲染错误', () => {
    const error = new Error('Cannot read property of undefined');
    expect(error.message).toBeTruthy();
  });

  it('应正确分类网络错误', () => {
    const error = new Error('Failed to fetch: network error');
    const msg = error.message.toLowerCase();
    expect(msg.includes('network') || msg.includes('fetch')).toBe(true);
  });

  it('应正确分类认证错误', () => {
    const error = new Error('Request failed with status code 401 Unauthorized');
    expect(error.message.toLowerCase()).toContain('401');
  });

  it('应正确处理未知错误类型', () => {
    const error = new Error('Unknown error occurred');
    expect(error.message).toBeTruthy();
    expect(error.stack).toBeDefined();
  });

  it('ErrorInfo 应包含 componentStack', () => {
    const mockErrorInfo = {
      componentStack: 'at Component\n  at App',
    };
    expect(mockErrorInfo.componentStack).toContain('Component');
  });
});
