FROM node:14-alpine as builder

# 通过命令号 --build-arg 或者 docker-compose 配置 build.args 传入变量
ARG ACCESS_KEY_ID
ARG ACCESS_KEY_SECRET
ARG ENDPOINT
ENV PUBLIC_URL http://cdn.merlin218.top/

WORKDIR /code

# 安装ossutil工具，配置文件执行权限，并设置资源上传配置
RUN wget http://gosspublic.alicdn.com/ossutil/1.7.7/ossutil64 -O /usr/local/bin/ossutil \
  && chmod 755 /usr/local/bin/ossutil \
  && ossutil config -i $ACCESS_KEY_ID -k $ACCESS_KEY_SECRET -e $ENDPOINT

# 单独分离 package.json，是为了安装依赖可最大限度利用缓存
ADD package.json yarn.lock /code/
RUN yarn

ADD . /code
# 执行项目打包和文件的上传
RUN npm run build && npm run oss:cli

FROM nginx:alpine
# 设置nginx配置
ADD nginx.conf /etc/nginx/conf.d/default.conf
# 项目资源文件
COPY --from=builder code/dist /usr/share/nginx/html
