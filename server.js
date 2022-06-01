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
