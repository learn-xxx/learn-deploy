FROM node:14-alpine as builder

WORKDIR /code

# 单独分离 package.json，是为了安装依赖可最大限度利用缓存
ADD package.json yarn.lock /code/
RUN yarn

ADD . /code
# 执行项目打包和文件的上传
RUN npm run build

FROM nginx:alpine
# 设置nginx配置
ADD nginx.conf /etc/nginx/conf.d/default.conf
# 项目资源文件
COPY --from=builder code/docs/.vitepress/dist /usr/share/nginx/html
