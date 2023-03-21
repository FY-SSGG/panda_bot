module.exports = {
    apps: [{
        script: './dist/bot.js',
        watch: './dist',
        env: {
            //请自行替换
            BOTTOKEN: '475485:XXXXXXXXXXXXX-xxxxxxxxx', //机器人Token
            HOSTID: '1234254326', //bot所有者ID,包含数据写入权限,须特别注意.

            HEFENGKEY: 'xxxxxxxxxxxxxxxxxxxxxxxxx', //和风天气key

            YDA_KEY: 'XXXXXXXXXXX-XXXXXXXXXXXXXXXXXXXX', //YouTube Data API v3
            YDA_URL: 'https://youtube.googleapis.com/youtube/v3/', //api请求地址
            YDA_DIR: '/home/live/testRecorder', //油管录播脚本位置

            BUSERNAME: 'XXXXX', //bilibili录播机管理账户名
            BPASSWORD: 'XXXXXXX', //bilibili录播机管理密码
            BURL: 'http://localhost:3856', //bilibili录播机开放的本地管理地址
        }
    }],
};