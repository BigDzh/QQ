# Windows 7 可执行文件打包配置说明

## 一、打包配置说明

### 1. 项目配置信息

| 配置项 | 值 |
|--------|-----|
| 项目名称 | 项目全生命周期管理系统_导出版 |
| 应用ID | com.lifecycle.management.export |
| Electron版本 | 25.9.8 |
| 打包格式 | 便携版 (portable) |
| 输出目录 | `C:\temp\win7-app-export-05` |

### 2. 核心配置文件

#### 2.1 package.json build配置

```json
{
  "build": {
    "appId": "com.lifecycle.management.export",
    "productName": "项目全生命周期管理系统_导出版",
    "copyright": "Copyright © 2024",
    "electronVersion": "25.9.8",
    "directories": {
      "output": "C:\\temp\\win7-app-export-05"
    },
    "files": [
      "win7-dist/**/*",
      "main.cjs",
      "preload.cjs"
    ],
    "asarUnpack": [
      "win7-dist/**/*"
    ],
    "win": {
      "target": "portable",
      "artifactName": "${productName}.${ext}",
      "sign": false
    },
    "portable": {
      "artifactName": "${productName}.${ext}"
    }
  }
}
```

#### 2.2 Vite构建配置 (vite.win7.config.ts)

关键配置项：
- `target: 'es2015'` - 面向ES2015保证Windows 7兼容性
- `cssTarget: 'chrome48'` - CSS兼容Chrome 48
- `base: './'` - 相对路径支持本地文件访问
- 代码分割：vendor-react, vendor-charts, vendor-jspdf等

#### 2.3 后置处理脚本 (win7-post-build.cjs)

- 复制 `Python服务器启动.bat` 和 `server.py` 到输出目录
- 修改 `index.html` 中的Google字体链接从HTTPS改为HTTP（Windows 7兼容）

### 3. 浏览器启动机制

程序使用两种方式之一启动浏览器：

#### 方式一：Electron内置Chromium（主程序）
- 窗口尺寸：1400x900
- 最小尺寸：1200x700
- 自动隐藏菜单栏
- 直接加载本地打包的前端资源

#### 方式二：外部Chrome浏览器（通过BAT脚本）
- 窗口尺寸：1400x900
- 窗口位置：50,50
- 禁用Web安全策略（用于本地文件加载）
- 启动时最大化

### 4. 前端资源打包结构

```
win7-dist/
├── index.html              # 入口HTML
├── sw.js                   # Service Worker
├── server.py               # Python HTTP服务器
├── Python服务器启动.bat    # 一键启动脚本
└── assets/
    ├── css/
    │   └── index.css-*.css
    ├── vendor/
    │   ├── vendor-react-*.js
    │   ├── vendor-charts-*.js
    │   ├── vendor-jspdf-*.js
    │   └── ...
    └── [page]-*.js         # 页面级代码分割
```

---

## 二、生成步骤文档

### 前置要求

1. **操作系统**：Windows 10/11（构建机）
2. **Node.js**：v18+
3. **Python**：3.x（用于本地服务器功能）
4. **Chrome浏览器**：在目标Windows 7机器上需要安装

### 构建步骤

#### 步骤1：构建前端资源

```bash
npm run build:win7
```

此命令会：
1. 使用Vite构建生产版本前端资源
2. 输出到 `win7-dist` 目录
3. 执行后置处理脚本，复制服务器文件

#### 步骤2：打包Electron应用

```bash
npx electron-builder --win portable
```

或使用完整发布包：

```bash
npm run electron:dist
```

#### 步骤3：获取可执行文件

打包完成后，可执行文件位于：
- 便携版：`C:\temp\win7-app-export-05\win-unpacked\项目全生命周期管理系统_导出版.exe`
- 安装版：`C:\temp\win7-app-export-05\项目全生命周期管理系统_导出版.exe`

### 文件说明

| 文件 | 说明 |
|------|------|
| `win-unpacked/` | 便携版目录，直接运行其中的.exe即可 |
| `*.exe` (根目录) | 安装版自解压程序 |
| `*.zip` | 便携版压缩包 |

---

## 三、Windows 7环境测试验证报告

### 1. 已知限制

1. **Electron 25.x 要求**：根据Electron官方文档，Electron 25+ 需要Windows 10或更高版本
2. **Chromium内核**：内置Chromium 112+ 不再支持Windows 7
3. **建议方案**：使用外部Chrome浏览器方式运行

### 2. 推荐运行方式

#### 方式一：使用内置Electron（需要Windows 10+）

直接运行 `.exe` 文件，Electron会启动内置Chromium窗口加载应用。

#### 方式二：使用外部Chrome（支持Windows 7）

在Windows 7机器上：

1. 确保安装Google Chrome浏览器
2. 双击运行 `Python服务器启动.bat`
3. 脚本会自动：
   - 检测Python环境
   - 启动HTTP服务器（端口8080）
   - 调用Chrome浏览器以预设尺寸(1400x900)打开应用

### 3. 测试检查清单

| 测试项 | 预期结果 | Windows 7兼容性 |
|--------|----------|----------------|
| 启动exe文件 | 程序启动，显示主窗口 | ⚠️ 受Electron版本限制 |
| 运行bat脚本 | 启动Python服务器和Chrome | ✅ 完全兼容 |
| 页面加载 | 所有页面正常渲染 | ✅ |
| 路由跳转 | SPA路由正常工作 | ✅ |
| 数据操作 | CRUD操作正常 | ✅ |
| 样式显示 | 布局和样式正确 | ✅ |

### 4. 备选方案：纯前端静态部署

如遇Windows 7兼容性问题，可采用纯前端方案：

1. 在Windows 7机器安装Python 3
2. 将 `win7-dist` 文件夹复制到目标机器
3. 运行 `Python服务器启动.bat`
4. 使用Chrome浏览器访问 `http://localhost:8080`

### 5. 故障排除

| 问题 | 解决方案 |
|------|----------|
| exe启动无反应 | 检查Visual C++ Redistributable是否安装 |
| Chrome未找到 | 确认Chrome已安装，或手动指定路径 |
| 页面显示空白 | 检查控制台错误，可能是ES6语法不兼容 |
| 端口被占用 | 修改bat脚本中的PORT变量 |

---

## 四、快速开始指南

### 在Windows 7上运行应用

1. 将 `win7-dist` 文件夹复制到目标机器
2. 确保目标机器已安装：
   - Python 3.x (可从 https://www.python.org/downloads/ 下载)
   - Google Chrome浏览器
3. 双击 `Python服务器启动.bat`
4. 应用将在Chrome浏览器中自动打开

### 修改启动参数

如需修改浏览器窗口尺寸或位置，编辑 `Python服务器启动.bat` 中的：

```batch
--window-size="1400,900"     ; 窗口尺寸
--window-position="50,50"    ; 窗口位置
```

---

## 五、文件结构总览

```
win7-dist/                          # 前端资源包
├── index.html                      # 应用入口
├── server.py                       # Python HTTP服务器
├── Python服务器启动.bat            # 一键启动脚本
├── sw.js                           # Service Worker
└── assets/                         # 静态资源
    ├── css/
    ├── vendor/
    └── [页面模块]/

win-unpacked/                       # Electron便携版（构建输出）
├── 项目全生命周期管理系统_导出版.exe
├── locales/
├── resources/
│   └── app.asar.unpacked/
│       └── win7-dist/             # 解压的前端资源
└── [Electron运行时文件]
```
