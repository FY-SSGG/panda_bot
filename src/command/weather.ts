import bot, { Command, deleteMessage } from "../bot";
import axios from "axios";
import url from "url";
import { Message } from "node-telegram-bot-api";
/* import { createBrotliCompress } from "zlib"; */

const hefeng_key = process.env.HEFENGKEY

export const command = new Command(
    /^\/weather/,
    '\/weather 天气查询',
    handler,
    true,
    '天气查询'
)

async function handler(msg:Message) {
    deleteMessage(msg, 15)
    let local = msg.text.split(" ")[1]
    weather(local,msg.from.id)
    .catch(err=>{
        console.log(err);
    })

    bot.on('callback_query',async query=>{
        //console.log(query);
        const { data , from, message } = query
        bot.deleteMessage(from.id, message.message_id.toString())
        if(data && typeof data === 'string'){
            let cmd = data.split("_")
            //console.log(cmd);
            if(cmd){
                switch (cmd[0]) {
                    case 'weather':
                        let weather = await getWearther(cmd[1])
                        bot.sendMessage(from.id,`
                        ${cmd[2]}\n当前天气：${weather.text}\n温度：${weather.temp}℃\n体感温度：${weather.feelsLike}℃\n相对湿度：${weather.humidity}%\n风向：${weather.windDir} ${weather.windScale}级
                        `).then(res => {
                            deleteMessage(res,60)
                        })
                        break;
                
                    default:
                        break;
                }
            }
        }
    })

    function findLactionId(text) {
        const api = new url.URL('https://geoapi.qweather.com/v2/city/lookup')
        api.searchParams.append('key',hefeng_key)
        api.searchParams.append('location',text)
        //console.log(api.href);
        return axios.get(api.href)
        .then(res => {
            /*
            *== 不严谨的比较
            *=== 严谨的比较 比较不单单是数值 还有类型
            *
            */
            if (res.data.code === '200'){
                // console.log(res.data.code);
                return res.data.location
            } else {
                return null
            }
        })
        .catch(err => {
            console.log('发生错误', err)
            return null
        })
    }

    function getWearther(location){
        const api = new url.URL('https://devapi.qweather.com/v7/weather/now')
        api.searchParams.append('key',hefeng_key)
        api.searchParams.append('location', location)
        return axios.get(api.href)
            .then(res => {
                if (res.data.code === '200'){
                    return res.data.now
                } else {
                    return null
                }
            })
            .catch(err => {
                console.log('发生错误', err)
                return null
            })
    }

    async function weather(text, id){
        let list = await findLactionId(text)
            if (list){
                //如果获取到地址
    
                if(list.length > 1){
                    //有多个地方需要选择
                    //console.log(list.length);
                    let an_jian = []
                    let row = []
                    for (let i = 0; i < list.length; i++) {
                        row.push({
                            text: list[i].adm1 + list[i].adm2 + list[i].name,
                            callback_data: 'weather_'+list[i].id+`_${list[i].name}`
                        })
                        if (i !== list.length - 1) {
                            if (row.length === 2) {
                                an_jian.push(row)
                                row = []
                            }
                        }else {
                            an_jian.push(row)
                        }
                    }
                    bot.sendMessage(id, '有几个相似的地方，你要哪一个？', {
                        reply_markup:{
                            inline_keyboard: an_jian
    
                        }
                    })
                
                }else{
                    //只有一个地方没得选
                    let weather = await getWearther(list[0].id)
                    bot.sendMessage(id,`
                        ${list[0].name}\n当前天气：${weather.text}\n温度：${weather.temp}℃\n体感温度：${weather.feelsLike}℃\n相对湿度：${weather.humidity}%\n风向：${weather.windDir} ${weather.windScale}级
                    `).then(res => {
                        deleteMessage(res, 60)
                    })
                }
            }else{
                //没有获取到地址
                bot.sendMessage(id,'很抱歉没有获取到地址')
                .then(res => {
                    deleteMessage(res, 15)
                })
            }
    }


}
    
