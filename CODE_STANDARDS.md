# 代码规范文档 - 项目全生命周期管理系统

**版本**: v1.0
**日期**: 2026-04-01
**状态**: 个人开发规范

---

## 1. TypeScript 规范

### 1.1 类型定义
```typescript
// ✅ 正确：使用接口定义
interface UserProps {
  id: string;
  name: string;
  email: string;
}

// ✅ 正确：使用类型别名
type UserRole = 'admin' | 'manager' | 'user';

// ❌ 错误：避免使用 any
let data: any;  // 不允许
```

### 1.2 严格模式
- 启用 `strict: true`
- 启用 `noUnusedLocals: true`
- 启用 `noUnusedParameters: true`

---

## 2. React 组件规范

### 2.1 组件命名
```typescript
// ✅ 正确：PascalCase 命名
import ProjectList from './pages/ProjectList';
import UserCard from './components/UserCard';

// ❌ 错误：避免 camelCase 或 kebab-case
import projectList from './pages/ProjectList';
import user-card from './components/UserCard';
```

### 2.2 Props 接口
```typescript
// ✅ 正确：Props 接口命名
interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

// ❌ 错误：不明确的命名
interface Props {
  label: string;
  click: () => void;
}
```

### 2.3 事件处理函数
```typescript
// ✅ 正确：handle 前缀
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
};

const handleClick = () => {
  console.log('clicked');
};

// ❌ 错误：on 前缀（保留给 DOM 事件）
const onSubmit = () => { };  // 不推荐
```

---

## 3. 文件组织规范

### 3.1 目录结构
```
src/
├── components/           # 业务组件
│   ├── ui/              # 基础 UI 组件
│   ├── layout/          # 布局组件
│   └── [feature]/       # 功能模块组件
├── context/             # React Context
├── hooks/               # 自定义 Hooks
│   └── use*.ts          # Hooks 命名规范
├── pages/               # 页面组件
│   └── [PageName]/      # 页面及子组件
├── services/            # 业务服务层
├── types/               # 类型定义
├── utils/               # 工具函数
├── workers/            # Web Workers
└── test/                # 测试文件
```

### 3.2 文件命名
| 类型 | 规范 | 示例 |
|------|------|------|
| 组件 | PascalCase | `ProjectList.tsx` |
| Hooks | camelCase, use前缀 | `useProjectState.ts` |
| 服务 | camelCase | `apiService.ts` |
| 工具 | camelCase | `formatDate.ts` |
| 类型 | camelCase | `user.types.ts` |

---

## 4. 样式规范

### 4.1 Tailwind CSS 使用
```tsx
// ✅ 正确：使用 Tailwind 类名
<div className="flex items-center justify-between p-4">
  <button className="px-4 py-2 bg-blue-500 text-white rounded">
    提交
  </button>
</div>

// ❌ 错误：避免内联样式
<div style={{ display: 'flex', padding: '16px' }}>
```

### 4.2 主题适配
```typescript
// 使用 useThemeStyles hook 进行主题适配
const { theme } = useTheme();
const t = useThemeStyles();

// 组件中使用
<div className={`${t.card} ${t.text}`}>
  内容
</div>
```

---

## 5. Git 提交规范

### 5.1 提交信息格式
```
<type>(<scope>): <subject>

# 示例
feat(project): 添加项目批量删除功能
fix(component): 修复组件状态不更新的问题
docs(readme): 更新项目文档
style(ui): 调整按钮样式
refactor(api): 重构 API 服务层
test(project): 添加项目模块测试
chore(deps): 更新依赖版本
```

### 5.2 Type 类型
| 类型 | 描述 |
|------|------|
| feat | 新功能 |
| fix | Bug 修复 |
| docs | 文档更新 |
| style | 代码格式（不影响功能） |
| refactor | 重构 |
| test | 测试相关 |
| chore | 构建/工具相关 |

### 5.3 Scope 范围
- `project` - 项目管理
- `component` - 组件管理
- `module` - 模块管理
- `ui` - 用户界面
- `api` - 接口服务
- `auth` - 认证授权
- `deps` - 依赖管理

---

## 6. 分支管理规范

### 6.1 分支命名
```
main                    # 主分支，稳定版本
develop                 # 开发分支
feature/<功能名>        # 功能分支
fix/<问题描述>          # 修复分支
release/<版本号>        # 发布分支
```

### 6.2 工作流程
```
1. 从 develop 创建功能分支
   git checkout -b feature/new-feature

2. 开发并提交
   git add .
   git commit -m "feat(scope): description"

3. 推送到远程
   git push origin feature/new-feature

4. 合并回 develop
   git checkout develop
   git merge feature/new-feature
   git push origin develop
```

---

## 7. 代码审查清单

### 7.1 功能检查
- [ ] 功能实现与需求一致
- [ ] 边界条件处理正确
- [ ] 错误处理完善
- [ ] 没有逻辑漏洞

### 7.2 代码质量
- [ ] TypeScript 类型完整
- [ ] 无 console.log 调试代码
- [ ] 无 hardcoded 魔法值
- [ ] 命名语义清晰
- [ ] 注释说明必要

### 7.3 性能考虑
- [ ] 避免不必要的重渲染
- [ ] 大列表使用虚拟滚动
- [ ] 正确使用 useMemo/useCallback
- [ ] 组件懒加载

---

## 8. 测试规范

### 8.1 单元测试
- 核心业务逻辑必须有测试覆盖
- 使用 Vitest 框架
- 测试文件命名：`*.test.ts` 或 `*.test.tsx`

### 8.2 E2E 测试
- 关键用户流程必须覆盖
- 使用 Playwright 框架
- 配置文件：`playwright.config.ts`

---

*本文档将随项目发展持续更新*
