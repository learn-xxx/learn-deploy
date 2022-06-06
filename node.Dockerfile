# 选择基础环境镜像
FROM node:14-alpine
# 工作目录，RUN和CMD命令都在这个目录下执行
WORKDIR /code
# 把宿主主机的代码添加到镜像中
ADD . /code
# 默认情况下 无法输入结果，命令行带上 --progress plain 来输出结果
# RUN ls -lah
# 执行yarn安装依赖
RUN yarn
# 暴露端口3000
EXPOSE 3000
# 启动应用
CMD npm start
