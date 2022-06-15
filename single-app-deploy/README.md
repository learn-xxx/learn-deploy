# 单页面应用部署

## 过程

分为两个阶段：构建 + 部署

因为我们的单应用使用了外部依赖，需要先打包成纯静态文件，才能进行部署。

所以需要在node环境下进行构建，选择node基础镜像。

而打包完成后我们不在需要node环境，所以我们可以选择更轻量的nginx镜像进行部署。

### 第一阶段：构建

```yaml
# 选择node基础镜像
FROM node:14-alpine as builder
# 设置工作目录
WORKDIR /code

# 分离package.json，是未来安装依赖可最大限度利用缓存
ADD package.json yarn.lock /code/
# 此时yarn可以利用缓存，如果yarn.lock没有更新，则不会重新依赖安装
RUN yarn

# 将当前目录下的所有文件都拷贝到/code目录下，进行项目构建
ADD . /code
RUN npm run build
```

# 第二阶段：部署

```yaml
# 选择nginx镜像
FROM nginx:alpine
# /usr/share/nginx/html是nginx的默认静态文件目录
# 将builder中构建好的dist目录中的内容拷贝到/usr/share/nginx/html目录下即可
COPY --from=builder code/dist /usr/share/nginx/html
```

```yaml
# docker-compose配置文件
version: "3"
services:
  single-app:
    build:
      context: .
      dockerfile: simple.Dockerfile
    ports:
      - 5200:80
```

# nginx配置及长期缓存优化

因为我们部署的是单页面应用，路由的跳转是交给前端`history API`去控制的，在后端并没有相对应的路由资源，如果没有进行配置，自然会返回服务器提供的404页面。

解决方法也很简单：在服务端将所有页面路由均指向 index.html，而单页应用再通过 history API 控制当前路由显示哪个页面。 这也是静态资源服务器的重写(Rewrite)功能。我们可以在nginx配置文件中添加如下内容：

```conf
    location / {
        # 如果资源不存在，则返回index.html
        try_files $uri $uri/ /index.html;
    }
```

另外，我们打包后的资源通常带有hash值，我们可以为他们设置长期缓存，但hash值发生改变时，会导致缓存失效，服务器会重新将资源返回给客户端，否则客户端会从缓存中读取资源。

```conf
    location / {
        # 如果资源不存在，则返回index.html
        try_files $uri $uri/ /index.html;
        # 对不带hash的资源，设置协商缓存，Cache-Control: no-cache，每次请求会校验新鲜度
        expires -1;
    }
    
    # 对于带hash的资源，设置长期缓存
    location /assets {
       # 设置一年的强缓存
      expires 1y;
    }
```
