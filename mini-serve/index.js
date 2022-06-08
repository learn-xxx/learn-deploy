const http = require('http');
const fs = require('fs');
const fsp = require('fs/promises')
const arg = require('arg');
const path = require('path');


async function processDirectory(absolutePath) {
  const newAbsolutePath = path.join(absolutePath, 'index.html');
  try {
    // 尝试过获取index.html文件信息
    const newStat = await fsp.stat(newAbsolutePath);
    return [newStat, newAbsolutePath]
  } catch (e) {
    // 获取失败
    return [null, newAbsolutePath]
  }
}

function responseNotFound(res) {
  res.statusCode = 404;
  res.end('not found');
}

async function handler(req, res, config) {
  // 获取请求路径
  const pathname = new URL('http://localhost' + req.url).pathname;
  // 获取绝对路径
  let absolutePath = path.resolve(config.entry ?? '', path.join('.', pathname));
  let statusCode = 200;
  let stat = null;
  // 尝试获取文件信息
  try {
    stat = await fsp.stat(absolutePath);
  } catch (error) { }

  // 如果是目录，则访问index.html
  if (stat?.isDirectory()) {
    [stat, absolutePath] = await processDirectory(absolutePath);
  }

  if (stat === null) {
    // 文件不存在
    return responseNotFound(res);
  }

  // 需要手动处理一下Content-Length
  let headers = {
    'Content-Length': stat.size,
  }
  res.writeHead(statusCode, headers);
  // 使用流的方式读取文件并返回
  fs.createReadStream(absolutePath).pipe(res);
}

// 开启服务
function startEndpoint(port, entry) {
  const server = http.createServer(async (req, res) => {
    await handler(req, res, { entry });
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      // 端口被占用，自动尝试使用下一个端口
      startEndpoint(port + 1, entry);
      return
    }
    // 其他错误，直接停止服务
    process.exit(1);
  })

  server.listen(port, () => {
    console.log('server is running: http://localhost:' + port);
  });
}

// 读取命令行参数
const args = arg({
  '--port': Number, // --port后面跟随的是一个数字
  '-p': '--port', // -p表示--port
})

startEndpoint(args['--port'] ?? 3000, args._[0]);
