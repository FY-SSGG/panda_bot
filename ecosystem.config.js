module.exports = {
    apps: [{
        script: './dist/bot.js',
        watch: './dist',
        env: {
            BOTTOKEN: '', //机器人Token
            HOSTID: '', //bot所有者ID,包含数据写入权限,须特别注意.
            HEFENGKEY: '', //和风天气key
            YOUTUBERAPI: '', //YouTube Data API v3 key
            BUSERNAME: '', //bilibili管理账户
            BPASSWORD: '', //bilibili管理密码
            BURL: 'http://localhost:2356', //bilibili录播机开放的本地管理地址
        }
    }],
};