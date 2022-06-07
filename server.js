const http = require('http');
const fs = require('fs');
const fsp = require('fs/promises')

// 如果文件比较大就很慢，可以使用流方式
// const html = fs.readFileSync('index.html');

const server = http.createServer(async (req, res) => {
  // 使用流的方式读取文件并返回
  // 需要手动处理一下Content-Length
  const fileStat = await fsp.stat('./index.html');
  res.setHeader('Content-Length', fileStat.size);
  fs.createReadStream('index.html').pipe(res)
})

server.listen(3000, () => {
  console.log('server is running on port 3000');
})
