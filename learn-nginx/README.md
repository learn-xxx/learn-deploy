# Nginx配置指南

## root 与 index

- `root`: 静态资源的根路径。见 [文档](https://nginx.org/en/docs/http/ngx_http_core_module.html#root)
- `index`: 当请求路径以 `/` 结尾时，则自动寻找该路径下的 index 文件。见 [文档](https://nginx.org/en/docs/http/ngx_http_index_module.html#index)

`root` 与 `index` 为前端部署的基础，在默认情况下 root 为 `/usr/share/nginx/html`，因此我们部署前端时，往往将构建后的静态资源目录挂载到该地址。

## location

location 用以匹配路由，配置语法如下。

```
location [ = | ~ | ~* | ^~ ] uri { ... }
```

其中 `uri` 前可提供以下修饰符

-   `=` 精确匹配。优先级最高
-   `^~` 前缀匹配，优先级其次
-   `~` 正则匹配，优先级再次 (~* 只是不区分大小写，不单列)
-   `/` 通用匹配，优先级再次

## proxy_pass

`proxy_pass` 反向代理，也是 nginx 最重要的内容，这也是常用的解决跨域的问题。

当使用 `proxy_pass` 代理路径时，有两种情况

1.  代理服务器地址不含 URI，则此时客户端请求路径与代理服务器路径相同。**强烈建议这种方式**
2.  代理服务器地址含 URI，则此时客户端请求路径匹配 location，并将其 location 后的路径附在代理服务器地址后。

```
server {
    listen       80;
    server_name  localhost;

    root   /usr/share/nginx/html;
    index  index.html index.htm;

    # 建议使用此种 proxy_pass 不加 URI 的写法，原样路径即可
    # http://localhost:8700/api1/hello -> proxy:3000/api1/hello
    location /api1 {
        # 可通过查看响应头来判断是否成功返回
        add_header X-Config A;
        proxy_pass http://api:3000;
    }

    # http://localhost:8700/api2/hello -> proxy:3000/hello
    location /api2/ {
        add_header X-Config B;
        proxy_pass http://api:3000/;
    }

    # http://localhost:8700/api3/hello -> proxy:3000/hello/hello
    location /api3 {
        add_header X-Config C;
        proxy_pass http://api:3000/hello;
    }

    # http://localhost:8700/api4/hello -> proxy:3000//hello
    location /api4 {
        add_header X-Config D;
        proxy_pass http://api:3000/;
    }
}
```

## proxy_read_timeout / proxy_send_timeout

- `proxy_read_timeout`：nginx服务器接收被代理服务器数据超时时间，单位秒
- `proxy_send_timeout`：nginx服务器发送数据给被代理服务器超时时间，单位秒

### 模拟502、504

```conf
server{
  listen 80;
  server_name localhost;

  root /usr/share/nginx/html;
  index index.html index.htm;

  location /api {
    proxy_pass http://api:3000;
  }

  location /502 {
    add_header X-Config A;
    # 请求一个不存在的服务，测试 502 错误
    proxy_pass http://localhost:9999;
  }

  location /504 {
    # nginx服务器接收被代理服务器数据超时时间，单位秒
    proxy_read_timeout 5s;
    # nginx服务器发送数据给被代理服务器超时时间，单位秒
    proxy_send_timeout 5s;
    proxy_pass http://api:3000/?wait=30000000;
  }
}
```

## add_header

控制响应头。

由于很多特性都是通过响应头控制，因此基于此指令可做很多事情，比如:

1.  Cache
2.  CORS
3.  HSTS
4.  CSP
5.  ...

### Cache

```
location /static {
    add_header Cache-Control max-age=31536000;
}
```

### CORS

```
location /api {
    add_header Access-Control-Allow-Origin *;
}
```

### HSTS

```
location / {
    listen 443 ssl;

    add_header Strict-Transport-Security max-age=7200;
}
```

### CSP

```
location / {
    add_header Content-Security-Policy "default-src 'self';";
}
```

## 配置gzip/brotli压缩

docker-compose.yaml 文件中相关配置：

```yaml
version: "3"
services:
    compress:
        build: 
        context: .
        dockerfile: ./compress/brotli.Dockerfile
        ports:
        - 8900:80
        volumes:
        - ./compress/compress.conf:/etc/nginx/conf.d/default.conf
        - ./compress/compress.nginx.conf:/etc/nginx/nginx.conf
        - .:/usr/share/nginx/html
```

### 配置gzip

直接在`compress.nginx.conf`中的`http`块开启

```conf
http {
    # 开启gzip压缩
    gzip on;
    # 设置允许压缩的页面最小字节 
    gzip_min_length 200;
    # 设置压缩缓冲区的大小，此处设置为4个16k内存作为压缩结果流缓存
    gzip_buffers 4 16k;
    # 开启gzip压缩类型
    # 图片如jpg、png文件本身就会有压缩，所以就算开启gzip后，压缩前和压缩后大小没有多大区别，所以开启了反而会白白的浪费资源。
    gzip_types text/plain application/x-javascript text/css application/xml text/javascript application/x-httpd-php application/javascript application/json;
    # 开启gzip压缩级别
    gzip_comp_level 5;
    # 配置禁用gzip条件，支持正则，此处表示ie6及以下不开启gzip
    gzip_disable "MSIE [1-6]\.";
    # nginx作为反向代理时使用，设置代理结果的压缩策略
    gzip_proxied off;
}
```

### 开启brotli压缩

由于docker官方的nginx镜像中没有内置，我们需要手动集成进去。Dockerfile文件如下：

```dockerfile
ARG version=1.20.2

FROM nginx:$version-alpine as builder

ARG version

WORKDIR /root/

RUN apk add --update --no-cache build-base git pcre-dev openssl-dev zlib-dev linux-headers \
  && wget http://nginx.org/download/nginx-${version}.tar.gz \
  && tar zxf nginx-${version}.tar.gz \
  && git clone https://github.com/google/ngx_brotli.git \
  && cd ngx_brotli \
  && git submodule update --init --recursive \
  && cd ../nginx-${version} \
  && ./configure \
  --add-dynamic-module=../ngx_brotli \
  --prefix=/etc/nginx \
  --sbin-path=/usr/sbin/nginx \
  --modules-path=/usr/lib/nginx/modules \
  --conf-path=/etc/nginx/nginx.conf \
  --error-log-path=/var/log/nginx/error.log \
  --http-log-path=/var/log/nginx/access.log \
  --pid-path=/var/run/nginx.pid \
  --lock-path=/var/run/nginx.lock \
  --http-client-body-temp-path=/var/cache/nginx/client_temp \
  --http-proxy-temp-path=/var/cache/nginx/proxy_temp \
  --http-fastcgi-temp-path=/var/cache/nginx/fastcgi_temp \
  --http-uwsgi-temp-path=/var/cache/nginx/uwsgi_temp \
  --http-scgi-temp-path=/var/cache/nginx/scgi_temp \
  --with-perl_modules_path=/usr/lib/perl5/vendor_perl \
  --user=nginx \
  --group=nginx \
  --with-compat \
  --with-file-aio \
  --with-threads \
  --with-http_addition_module \
  --with-http_auth_request_module \
  --with-http_dav_module \
  --with-http_flv_module \
  --with-http_gunzip_module \
  --with-http_gzip_static_module \
  --with-http_mp4_module \
  --with-http_random_index_module \
  --with-http_realip_module \
  --with-http_secure_link_module \
  --with-http_slice_module \
  --with-http_ssl_module \
  --with-http_stub_status_module \
  --with-http_sub_module \
  --with-http_v2_module \
  --with-mail \
  --with-mail_ssl_module \
  --with-stream \
  --with-stream_realip_module \
  --with-stream_ssl_module \
  --with-stream_ssl_preread_module \
  --with-cc-opt='-Os -fomit-frame-pointer -g' \
  --with-ld-opt=-Wl,--as-needed,-O1,--sort-common \
  && make modules

FROM nginx:$version-alpine

ARG version

ENV TIME_ZONE = Asia/Shanghai

# 设置时区，将 /etc/localtime下的内容软连接到对应时区目录下的内容，另外修改 /etc/timezone
RUN ln -snf /usr/share/zoneinfo/${TIME_ZONE} /etc/localtime && \
  echo ${TIME_ZONE} > /etc/timezone

# 将builder中的插件文件复制到镜像主机中
COPY --from=builder /root/nginx-${version}/objs/ngx_http_brotli_filter_module.so /usr/lib/nginx/modules/
COPY --from=builder /root/nginx-${version}/objs/ngx_http_brotli_static_module.so /usr/lib/nginx/modules/

# 之后在nginx的配置文件中加载模块即可
```

编写`compress.nginx.conf`文件，加入brotli配置：

```conf
# 全局块加载模块
load_module /usr/lib/nginx/modules/ngx_http_brotli_filter_module.so;
load_module /usr/lib/nginx/modules/ngx_http_brotli_static_module.so;

# http块中加入配置
http {
    # 开启brotli压缩
    brotli on;
    brotli_comp_level 6;
    brotli_buffers 16 8k;
    brotli_min_length 20;
    brotli_types
        application/atom+xml
        application/geo+json
        application/javascript
        application/x-javascript
        application/json
        application/ld+json
        application/manifest+json
        application/rdf+xml
        application/rss+xml
        application/vnd.ms-fontobject
        application/wasm
        application/x-web-app-manifest+json
        application/xhtml+xml
        application/xml
        font/eot
        font/otf
        font/ttf
        image/bmp
        image/svg+xml
        text/cache-manifest
        text/calendar
        text/css
        text/javascript
        text/markdown
        text/plain
        text/xml
        text/vcard
        text/vnd.rim.location.xloc
        text/vtt
        text/x-component
        text/x-cross-domain-policy;
}
```

> gzip和brotli的区别？

> 参考链接
> [为 Docker 中的 Nginx 启用 Brotli 压缩算法](https://www.iszy.cc/posts/e/)
