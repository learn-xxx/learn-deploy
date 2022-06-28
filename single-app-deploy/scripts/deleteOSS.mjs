import OSS from 'ali-oss'
import readdirp from 'readdirp'
import arg from 'arg'

// 该文件用于定时任务周期性删除 OSS 上的冗余资源，可通过 CRON 配置每天凌晨两点进行删除
// 由于该脚本定时完成，所以无需考虑性能问题，故不适用 p-queue 进行并发控制

// 读取命令行参数
const args = arg({
  '--bucket': String, // --bucket 跟随 资源桶名称
  '-b': '--bucket', // -b 表示 --bucket
  '--target': String, // --target 跟随 上传目标目录
  '-t': '--target',
  '--region': String, // --region 跟随 资源桶所在区域
  '-r': '--region',
})

const client = new OSS({
  region: args['--region'],
  accessKeyId: process.env.ACCESS_KEY_ID,
  accessKeySecret: process.env.ACCESS_KEY_SECRET,
  bucket: args['--bucket']
})


async function getCurrentFiles () {
  const files = []
  for await (const entry of readdirp(args['--target'], { type: 'files' })) {
    files.push(entry.path)
  }
  return files
}

// 改成一个支持 stream 的函数，防止 objects 过多
// AsyncIterator
async function getAllObjects () {
  let res = []
  async function walk (cursor = null) {
    const { objects, continuationToken } = await client.listV2({
      'max-keys': 160,
      'continuation-token': cursor
    })
    res = [...res, ...objects]
    if (continuationToken) {
      await walk(continuationToken)
    }
  }
  await walk()
  return res
}

// 列举出来最新被使用到的文件: 即当前目录
// 列举出来OSS上的所有文件，遍历判断该文件是否在当前目录，如果不在，则删除
async function main() {

}

(async function () {
  try {
    if (!args['--target']) {
      throw new Error('请指定上传目录')
    }
    const files = await getCurrentFiles()
    const objects = await getAllObjects()
    for (const object of objects) {
      // 如果当前目录中不存在该文件，则该文件可以被删除
      if (!files.includes(object.name)) {
        await client.delete(object.name)
        console.log(`Delete: ${object.name}`)
      }
    }
  } catch (e) {
    console.error(e)
    process.exitCode = 1
  }
})()
