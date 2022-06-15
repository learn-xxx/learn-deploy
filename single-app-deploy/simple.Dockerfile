FROM node:14-alpine as builder

WORKDIR /code

# 分离package.json，是未来安装依赖可最大限度利用缓存
ADD package.json yarn.lock /code/
# 此时yarn可以利用缓存，如果yarn.lock没有更新，则不会重新依赖安装
RUN yarn

ADD . /code
RUN npm run build

FROM nginx:alpine
# 设置nginx配置
ADD nginx.conf /etc/nginx/conf.d/default.conf
# 项目资源文件
COPY --from=builder code/dist /usr/share/nginx/html
