# ==========================================
# 阶段一：构建阶段 (Builder) - 负责把源码打包成 dist
# ==========================================
FROM node:20.15.0-alpine AS builder

# 设置工作目录
WORKDIR /app

RUN npm install -g pnpm

# 先拷贝依赖文件，利用 Docker 缓存机制加速下一次构建
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# 拷贝所有源代码并执行打包
COPY . .
RUN pnpm run build

# ==========================================
# 阶段二：生产运行阶段 (Production) - 负责提供 Web 服务
# ==========================================
FROM nginx:alpine

# 👑 核心魔法：把上一个阶段（builder）打包好的 example/dist 目录，
# 直接复制到当前 Nginx 容器的默认静态资源目录下！
COPY --from=builder /app/example/dist /usr/share/nginx/html

# 暴露 80 端口（这是容器内部的端口）
EXPOSE 80

# 启动 Nginx
CMD ["nginx", "-g", "daemon off;"]
