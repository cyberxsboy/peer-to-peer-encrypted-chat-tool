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







# 服务器部署指南 (宝塔面板)

## 一、服务器环境要求

### 1.1 基础环境

| 环境组件 | 版本要求 | 说明 |
|---------|----------|------|
| 操作系统 | CentOS 7+ / Ubuntu 20.04+ / Debian 11+ | 推荐 CentOS 8 或 Ubuntu 22.04 |
| CPU | 2核+ | 建议4核 |
| 内存 | 4GB+ | 建议8GB |
| 硬盘 | 40GB+ | 根据用户数据量调整 |
| 带宽 | 5Mbps+ | 建议10Mbps |

### 1.2 宝塔面板环境

在宝塔面板中需要安装以下环境：

```
推荐安装套件：
- Nginx 1.24 (反向代理 + 静态文件服务)
- PostgreSQL 15 (数据库)
- PHP 8.1+ (可选，用于管理界面)
- Node.js 20 LTS (运行身份服务器)
```

---

## 二、宝塔面板配置步骤

### 2.1 安装宝塔面板

```bash
# CentOS
yum install -y wget && wget -O install.sh https://download.bt.cn/install/install_6.0.sh && sh install.sh

# Ubuntu
wget -O install.sh https://download.bt.cn/install/install_6.0.sh && sudo sh install.sh
```

### 2.2 安装基础环境

1. 登录宝塔面板 (访问 http://your-server-ip:8888)
2. 安装"LNMP套件" (推荐) 或手动安装以下组件：

#### 通过宝塔安装 PostgreSQL：
```
网站 -> 数据库 -> 安装 PostgreSQL 15
```

#### 通过宝塔安装 Node.js：
```
应用商店 -> Node.js -> 安装 20.x LTS
```

### 2.3 创建数据库

1. 进入宝塔面板 -> 数据库
2. 添加数据库：
   - 数据库名：`securep2p`
   - 用户名：`securep2p_user`
   - 密码：(生成强密码)
3. 记住数据库连接信息

### 2.4 配置网站

#### 方式A：运行身份服务器 (API服务)

1. 网站 -> Node项目 -> 添加项目
2. 配置：
   - 项目名称：`securep2p-api`
   - 启动文件：`apps/identity-server/src/index.ts`
   - 端口：`3000`
   - 运行用户：`root`
   - 开机启动：✅

或使用 PM2 管理：
```bash
# SSH登录服务器
cd /www/wwwroot/securep2p-api
pm2 start apps/identity-server/src/index.ts --name securep2p-api
pm2 save
pm2 startup
```

#### 方式B：使用 Nginx 反向代理

1. 网站 -> 添加站点
2. 配置域名 SSL (Let's Encrypt 免费)
3. 网站设置 -> 配置文件，添加：

```nginx
#身份服务器API代理
location /api/ {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_cache_bypass $http_upgrade;
}
```

---

## 三、部署代码

### 3.1 准备代码目录

```bash
# 创建项目目录
mkdir -p /www/wwwroot/securep2p
cd /www/wwwroot/securep2p

# 上传代码 (通过git或上传压缩包)
# 方式1: Git克隆
git clone <你的仓库地址> .

# 方式2: 通过宝塔文件管理器上传
```

### 3.2 安装依赖

```bash
# 安装 pnpm
npm install -g pnpm

# 安装项目依赖
pnpm install
```

### 3.3 配置环境变量

```bash
# 创建环境配置文件
cp apps/identity-server/.env.example apps/identity-server/.env

# 编辑配置
vi apps/identity-server/.env
```

配置内容：
```env
# 服务器配置
PORT=3000
NODE_ENV=production

# 数据库连接
DATABASE_URL=postgresql://securep2p_user:你的密码@localhost:5432/securep2p

# JWT密钥 (生产环境请更改!)
JWT_SECRET=生成一个强随机密钥

# 允许的来源 (你的域名)
ALLOWED_ORIGIN=https://your-domain.com
```

### 3.4 数据库初始化

```bash
cd /www/wwwroot/securep2p/apps/identity-server

# 生成Prisma客户端
pnpm run db:generate

# 执行数据库迁移
pnpm run db:migrate

# 或直接推送schema
pnpm run db:push
```

### 3.5 启动服务

```bash
# 使用PM2管理进程 (推荐)
cd /www/wwwroot/securep2p/apps/identity-server
pm2 start src/index.ts --name securep2p-api --interpreter tsx

# 设置开机自启
pm2 save
pm2 startup
```

---

## 四、安全配置

### 4.1 防火墙配置 (宝塔)

1. 安全 -> 防火墙
2. 添加端口规则：
   - 3000 (API服务，仅内网)
   - 443 (HTTPS)
   - 80 (HTTP，重定向到HTTPS)

### 4.2 SSL证书

1. 网站 -> 您的站点 -> SSL -> Let's Encrypt
2. 申请免费证书
3. 强制HTTPS

### 4.3 Nginx安全配置

在站点配置中添加：

```nginx
# 安全头
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "no-referrer" always;

# 禁止敏感文件访问
location ~ /\.(?!well-known) {
    deny all;
}

location ~ /\.env {
    deny all;
}
```

---

## 五、验证部署

### 5.1 检查服务状态

```bash
# 检查PM2状态
pm2 status

# 检查端口监听
netstat -tlnp | grep 3000
```

### 5.2 测试API

```bash
# 测试健康检查
curl http://localhost:3000/health

# 测试注册接口
curl -X POST http://localhost:3000/api/v1/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@example.com","password":"Test1234"}'
```

### 5.3 检查日志

```bash
# 查看PM2日志
pm2 logs securep2p-api --lines 50

# 查看Nginx错误日志
tail -f /www/wwwlogs/your-domain.com.error.log
```

---

## 六、桌面客户端配置

### 6.1 修改API地址

在桌面客户端代码中修改API地址：

找到 `src/renderer/pages/RegisterPage.tsx` 和 `LoginPage.tsx`

将 `http://localhost:3000` 改为你的服务器地址：

```typescript
// 例如
const API_BASE = 'https://api.your-domain.com';
```

### 6.2 构建客户端

```bash
cd apps/desktop-client
pnpm run build
```

### 6.3 打包

```bash
pnpm run dist
```

生成的安装包在 `apps/desktop-client/release` 目录

---

## 七、常见问题

### 7.1 数据库连接失败

```bash
# 检查PostgreSQL状态
systemctl status postgresql

# 检查连接
psql -h localhost -U securep2p_user -d securep2p
```

### 7.2 端口被占用

```bash
# 查找占用端口的进程
lsof -i:3000

# 杀掉进程
kill -9 <PID>
```

### 7.3 内存不足

```bash
# 创建交换分区
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
```

---

## 八、每日维护

### 8.1 备份

```bash
# 数据库备份
pg_dump securep2p > /backup/securep2p_$(date +%Y%m%d).sql

# 代码备份
rsync -avz /www/wwwroot/securep2p /backup/
```

### 8.2 日志清理

```bash
# 清理PM2日志
pm2 flush

# 清理Nginx日志
>: /www/wwwlogs/your-domain.com.log
```

---

## 九、生产环境检查清单

- [ ] PostgreSQL 15 已安装并运行
- [ ] Node.js 20 LTS 已安装
- [ ] 数据库 securep2p 已创建
- [ ] 环境变量已配置
- [ ] SSL证书已配置
- [ ] 防火墙已配置
- [ ] PM2进程守护已配置
- [ ] 开机自启已设置
- [ ] 备份计划已设置
