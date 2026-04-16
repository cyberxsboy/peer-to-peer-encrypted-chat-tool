# SecureP2P Chat

去中心化端到端加密P2P聊天工具

## 快速开始

### 1. 安装依赖

```bash
# 安装 pnpm（如果没有）
npm install -g pnpm

# 安装项目依赖
pnpm install
```

### 2. 配置环境

```bash
# 复制环境配置示例
cp apps/identity-server/.env.example apps/identity-server/.env

# 编辑环境变量
# - DATABASE_URL: PostgreSQL数据库连接字符串
# - JWT_SECRET: JWT密钥（生产环境必须更改）
```

### 3. 启动数据库

```bash
# 使用Docker启动PostgreSQL
docker run -d \
  --name securep2p-postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=securep2p \
  -p 5432:5432 \
  postgres:15
```

### 4. 启动身份服务器

```bash
cd apps/identity-server
pnpm run dev
```

服务器将在 http://localhost:3000 运行

### 5. 启动桌面客户端

```bash
cd apps/desktop-client
pnpm run dev
```

客户端将在 http://localhost:5173 运行

## 功能特性

- ✅ 端到端加密（P2P通信）
- ✅ 用户注册/登录（含实时验证）
- ✅ 文本消息传输
- ✅ 联系人管理
- ✅ 群组聊天（开发中）
- ✅ 文件传输（开发中）
- ✅ 阅后即焚（开发中）
- ✅ 语音消息（开发中）

## 技术栈

- **前端**: React 18, Redux Toolkit
- **后端**: Node.js, Express, Prisma
- **P2P网络**: libp2p, Noise协议
- **数据库**: PostgreSQL
- **加密**: Argon2id, AES-256-GCM

## 开发路线图

请参考 [开发文档.md](./开发文档.md) 获取完整的开发计划。

## 相关命令

```bash
# 开发
pnpm run dev

# 构建
pnpm run build

# 类型检查
pnpm run typecheck
```

## 注意事项

1. 需要PostgreSQL数据库才能运行身份服务器
2. 桌面客户端需要Electron支持
3. 首次运行需要配置数据库连接

## 许可证

MIT