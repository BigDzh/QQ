# TypeScript 类型错误修复计划

**创建日期**: 2026-04-02
**问题总数**: 490 个错误
**影响文件**: 95 个

---

## 问题分类统计

| 问题类型 | 数量 | 严重程度 |
|----------|------|----------|
| 未使用的变量/导入 | ~80 | 低 |
| 类型不兼容 | ~50 | 中 |
| 可能为 undefined | ~30 | 中 |
| JSX 相关问题 | ~20 | 高 |
| 缺少类型定义 | ~5 | 高 |

---

## 优先级 P0 (必须修复)

### 1. useLazyImage.tsx (1个错误)
- **问题**: JSX在.ts文件中
- **状态**: ✅ 已修复 (重命名为.tsx)

### 2. src/utils/auth.ts (1个错误)
- **行号**: 168
- **问题**: `Wordarray` 应为 `WordArray` (大小写)
- **修复**: 将 `CryptoJS.lib.Wordarray` 改为 `CryptoJS.lib.WordArray`

### 3. src/testData/index.ts (26个错误)
- **问题**: 缺少类型定义、未使用的变量、null/undefined赋值
- **主要问题**:
  - `TaskPriority` 未从 `../types` 导出
  - 多个 `null` 值不能赋值给数组类型
  - `undefined` 值不能赋值给必需属性

### 4. src/testData/index.test.ts (3个错误)
- **问题**: 未使用的导入

---

## 优先级 P1 (应该修复)

### 5. src/pages/WorkflowDetail.tsx (16个错误)
- **问题**: `execution.priority` 类型不兼容
- **原因**: `number | undefined` 不能赋值给 `number`

### 6. src/pages/ProjectDetail_broken.tsx (116个错误)
- **问题**: 大量类型错误
- **建议**: 检查是否应该删除此文件或修复

### 7. src/hooks/useProjectHandlers.ts (40个错误)
- **问题**: 多个类型不兼容问题
- **建议**: 逐步修复类型定义

### 8. src/context/AppContext.tsx (4个错误)
- **问题**: React相关类型问题

---

## 优先级 P2 (可以修复)

### 9. 各种未使用的变量/导入 (~80个)
- 大多数是测试文件中的 `vi`, `beforeEach` 等未使用
- 可以在测试文件中添加 `_` 前缀忽略

### 10. src/types/lowPerformanceMode.ts (2个错误)
- **问题**: 未使用的 `config` 变量

---

## 建议修复步骤

### 步骤 1: 修复关键问题 (2小时)
```bash
# 1. 修复 auth.ts 的 WordArray 大小写问题
# 2. 检查 ProjectDetail_broken.tsx 是否需要删除
# 3. 修复 testData/index.ts 中的类型问题
```

### 步骤 2: 修复类型兼容性问题 (4小时)
```bash
# 1. 修复 WorkflowDetail.tsx
# 2. 修复 useProjectHandlers.ts
# 3. 修复 designDiagramService.ts
```

### 步骤 3: 清理未使用的代码 (1小时)
```bash
# 批量删除或标记未使用的变量
```

### 步骤 4: 验证修复 (30分钟)
```bash
npm run build
npx tsc --noEmit
```

---

## 快速修复命令

```bash
# 检查剩余错误数量
npx tsc --noEmit 2>&1 | grep "error TS" | wc -l

# 运行构建测试
npm run build
```

---

*此文档将根据修复进度更新*
