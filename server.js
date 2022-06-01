const http = require('http');
const fs = require('fs');

// const html = fs.readFileSync('index.html');

const server = http.createServer((req, res) => {
  // 使用流的方式读取文件并返回
  // 需要手动处理一下Content-Length
  const filePath= './index.html';
  const fileStat = fs.statSync(filePath);
  res.length = fileStat.size;
  fs.createReadStream('index.html').pipe(res)
})

server.listen(3000, () => {
  console.log('server is running on port 3000');
})
