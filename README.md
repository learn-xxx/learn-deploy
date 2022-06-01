# 简单服务器部署

### 本地部署

- 使用serve包，可以在本地运行服务器
```bash
// 安装serve
pnpm i serve
// 在当前目录下运行服务器
npx serve .
```
- 编写server.js，使用http来创建服务器，在终端使用node运行

```js
const http = require('http');
const fs = require('fs');

// const html = fs.readFileSync('index.html');
 
const server = http.createServer((req, res) =>{
  // 使用流的方式读取文件并返回
  // 需要手动处理一下Content-Length
  fs.createReadStream('index.html').pipe(res)
})

server.listen(3000,()=>{
    console.log('server is running on port 3000');
})
```

```bash
node ./server.js
```

### 使用nginx部署

> 为什么使用Nginx
> 通过 nginx 进行路由转发至不同的服务，这也就是反向代理，另外 TLS、GZIP、HTTP2 等诸多功能，也需要使用 nginx 进行配置。

### 使用Docker部署

> 为什么使用Docker
> 隔离环境，可单独提供某种语言的运行环境，并同时与宿主机隔离起来。
> 对于前端而言，此时你可以通过由自己在项目中单独维护 nginx.conf 进行一些 nginx 的配置，大大提升前端的自由性和灵活度，而无需通过运维或者后端来进行。


