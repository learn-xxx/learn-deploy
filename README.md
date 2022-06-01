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
  fs.createReadStream('index.html').pipe(res)
})

server.listen(3000,()=>{
    console.log('server is running on port 3000');
})
```

```bash
node ./server.js
```
