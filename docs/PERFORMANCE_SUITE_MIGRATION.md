# 性能监控套件迁移指南

## 概述
`usePerformanceSuite` 是第四阶段新增的统一性能监控入口，旨在简化性能相关 Hook 的使用。

## 迁移前 vs 迁移后

### ❌ 迁移前（分散式导入）
```typescript
import { usePerformanceMetrics, formatBytes } from '../hooks/usePerformanceMetrics';
import { usePerformanceAlert, getAlertConfig } from '../hooks/usePerformanceAlert';
import { useMemoryMonitor } from '../hooks/useMemoryMonitor';

function MyComponent() {
  const metrics = usePerformanceMetrics();
  const { config, updateConfig } = usePerformanceAlert(resources, isHighPerf);
  const memory = useMemoryMonitor({ onAlert: handleAlert });
  
  return (
    <div>
      <p>FCP: {formatBytes(metrics.fcp)}</p>
      <button onClick={() => updateConfig({ enabled: !config.enabled })}>
        切换告警
      </button>
    </div>
  );
}
```

### ✅ 迁移后（统一套件）
```typescript
import { usePerformanceSuite } from '../hooks/usePerformanceSuite';

function MyComponent() {
  const { metrics, alerts, memory, formatters } = usePerformanceSuite({
    enableMetrics: true,
    enableAlerts: true,
    enableMemoryMonitoring: true,
  });
  
  return (
    <div>
      <p>FCP: {formatters.bytes(metrics.fcp)}</p>
      <button onClick={() => alerts.updateConfig({ enabled: !alerts.config.enabled })}>
        切换告警
      </button>
    </div>
  );
}
```

## 推荐的迁移优先级

### 高优先级（新组件）
- ✅ 所有新建组件直接使用 `usePerformanceSuite`
- ✅ 示例：新的 Dashboard、Monitor 页面

### 中优先级（简单组件）
- 📋 `PerformanceMonitor.tsx`
- 📋 `AlertConfigPanel.tsx`

### 低优先级（复杂组件）
- ⏸️ `SystemResources.tsx`（已稳定运行，风险较高）
- ⏸️ `App.tsx`（核心文件，需充分测试）

## 迁移检查清单

- [ ] 功能测试：验证所有原有功能正常工作
- [ ] 性能对比：确保无性能回归
- [ ] TypeScript 编译：零错误零警告
- [ ] ESLint 检查：无新增 lint 错误

## 注意事项

1. **向后兼容**：原有的独立 Hook 仍可继续使用，不会被删除
2. **按需加载**：通过 options 参数控制启用哪些功能模块
3. **类型安全**：完整的 TypeScript 类型定义
