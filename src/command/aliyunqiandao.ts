import bot, { Command, deleteMessage } from "../bot";
import fs from "fs"
//@ts-ignore
import { scheduleJob } from "node-schedule"
import { CallbackQuery, Message } from "node-telegram-bot-api";
import moment from 'moment-timezone'
import axios from "axios";

moment.tz.setDefault('Asia/Shanghai');

const updateAccesssTokenURL = 'https://auth.aliyundrive.com/v2/account/token'
const signinURL =
    'https://member.aliyundrive.com/v1/activity/sign_in_list?_rx-s=mobile'
const rewardURL =
    'https://member.aliyundrive.com/v1/activity/sign_in_reward?_rx-s=mobile'


const ALIYUNTOKEN = process.env.ALIYUNTOKEN

/*  bot.on('message', async (msg) => {
    // 判断消息是否是文件类型,显示文件信息
    if (msg.document) {
      const fileId = msg.document.file_id;
      const fileInfo = await bot.getFile(fileId);
      console.log(fileInfo);
    }
}); */

try {
    fs.readFileSync("aliyunqiandao.json", { encoding: 'utf-8' })
    //console.log(ALIYUNTOKEN)
    updateSchedule()
} catch (error) {
    console.log(error.message);
    if (error.message.includes("no such file or directory")) {
        fs.writeFileSync("aliyunqiandao.json", JSON.stringify([]), { encoding: 'utf-8' })
    }
}


export const command = new Command(
    /^\/aliyun/,
    '\/aliyun 阿里云签到小助手',
    handler,
    true,
    '阿里云签到小助手',
    cb
)

function updateSchedule() {

    // 创建定时任务
    //let utcTime = moment().clone().startOf('day').set({ hours: Math.floor(Math.random() * (24 + 1)), minutes: Math.floor(Math.random() * (60 + 1)) }).utc().toObject();
    let utcTime = moment().clone().startOf('day').set({ hours: 0, minutes: 35 }).utc().toObject();
    scheduleJob({ hour: utcTime.hours, minute: utcTime.minutes }, async () => {
        const notisyList = JSON.parse(fs.readFileSync("aliyunqiandao.json", { encoding: 'utf-8' }))
        for (const _vo of notisyList) {


            !(async () => {
                const { instance, refreshTokenArray } = await getRefreshToken();

                const message: string[] = [];
                let index = 1;
                for await (const refreshToken of refreshTokenArray) {
                    let remarks: string = refreshToken.remarks || `账号${index}`;
                    const queryBody: { grant_type: string; refresh_token: string } = {
                        grant_type: 'refresh_token',
                        refresh_token: refreshToken.value || refreshToken,
                    };

                    try {
                        const { nick_name, refresh_token, access_token } = await updateAccesssToken(queryBody, remarks);

                        if (nick_name && nick_name !== remarks) remarks = `${nick_name}(${remarks})`;


                        const sendMessage = await sign_in(access_token, remarks);
                        console.log(sendMessage);
                        console.log('\n');
                        message.push(sendMessage);
                    } catch (e) {
                        console.log(e);
                        console.log('\n');
                        message.push(e);
                    }
                    index++;
                }
                bot.sendMessage(_vo, message.join('\n')).then(res => { deleteMessage(res, 3600) })
                //await notify.sendNotify(`阿里云盘签到`, message.join('\n'));
            })();

        }
    })
}
async function handler(msg: Message) {
    //updateSchedule()
    const inline_keyboard = [
        [
            {
                text: '开启',
                callback_data: `aliyunqiandao_setting_${msg.from?.id}_${msg.chat.id}`
            },
            {
                text: '关闭',
                callback_data: `aliyunqiandao_cancel_${msg.from?.id}_${msg.chat.id}`
            }
        ]
    ]
    if (msg.chat.type === 'private') {
        await bot.sendMessage(msg.chat.id, `开启随机阿里云签到`, {
            reply_markup: {
                inline_keyboard
            }
        })
    }
    if (msg.chat.type === 'group' || msg.chat.type === 'supergroup') {
        const admins = await bot.getChatAdministrators(msg.chat.id)
        let isAdmin = admins.find(item => item.user.id === msg.from?.id)
        if (!isAdmin) {
            await bot.sendMessage(msg.chat.id, '非管理员无法管理群组阿里云签到,如需私人提醒,请通过私聊找我单独开启.', {
                reply_markup: {
                    inline_keyboard: [[{
                        text: '立即设置',
                        url: `https://t.me/${process.env.BOTID}`
                    }]]
                }
            }).then(res => {
                deleteMessage(msg, 15)
                deleteMessage(res, 15)
            })
        } else {
            await bot.sendMessage(msg.from?.id, `我将会开启随机阿里云签到`, {
                reply_markup: {
                    inline_keyboard
                }
            }).catch(err => { })
            await bot.sendMessage(msg.chat.id, `请通过私聊进行设置.(若是第一次使用,请先私聊并发送/start)`, {
                reply_markup: {
                    inline_keyboard: [[{
                        text: '立即设置',
                        url: `https://t.me/${process.env.BOTID}`
                    }]]
                }
            }).then(res => {
                deleteMessage(res, 15)
                deleteMessage(msg, 15)
            })
        }
    }
}
async function cb(query: CallbackQuery) {
    const args = query.data?.split("_")
    let notisyList = JSON.parse(fs.readFileSync("aliyunqiandao.json", { encoding: 'utf-8' }))
    try {
        if (args[1]) {
            switch (args[1]) {
                case 'setting':
                    if (String(query.from.id) === args[2]) {
                        notisyList = [...notisyList, args[3]]
                        fs.writeFileSync("aliyunqiandao.json", JSON.stringify(notisyList), { encoding: 'utf-8' })
                        let reply = await bot.sendMessage(query.from.id, '好的,我将会准时签到的.')
                        deleteMessage(query.message, 2)
                        deleteMessage(reply, 5)
                    }
                    break;
                case 'cancel':
                    if (String(query.from.id) === args[2]) {
                        notisyList = notisyList.filter((item: string) => item !== args[3])
                        fs.writeFileSync("aliyunqiandao.json", JSON.stringify(notisyList), { encoding: 'utf-8' })
                        let reply = await bot.sendMessage(query.from.id, '没有我的签到,也要记得每天坚持上线哟.')
                        deleteMessage(query.message, 2)
                        deleteMessage(reply, 5)
                    }
                    break;

                default:
                    break;
            }
        }
    } catch (error) {
        console.log(error);
    }

}








// 使用 refresh_token 更新 access_token
function updateAccesssToken(queryBody: { grant_type: string; refresh_token: string; }, remarks: string) {
    const errorMessage = [remarks, '更新 access_token 失败']
    return axios(updateAccesssTokenURL, {
        method: 'POST',
        data: queryBody,
        headers: { 'Content-Type': 'application/json' }
    })
        .then(d => d.data)
        .then(d => {
            const { code, message, nick_name, refresh_token, access_token } = d
            if (code) {
                if (
                    code === 'RefreshTokenExpired' ||
                    code === 'InvalidParameter.RefreshToken'
                )
                    errorMessage.push('refresh_token 已过期或无效')
                else errorMessage.push(message)
                return Promise.reject(errorMessage.join(', '))
            }
            return { nick_name, refresh_token, access_token }
        })
        .catch(e => {
            errorMessage.push(e.message)
            return Promise.reject(errorMessage.join(', '))
        })
}

//签到列表
function sign_in(access_token: any, remarks: string) {
    const sendMessage = [remarks]
    return axios(signinURL, {
        method: 'POST',
        data: {
            isReward: false
        },
        headers: {
            Authorization: access_token,
            'Content-Type': 'application/json'
        }
    })
        .then(d => d.data)
        .then(async json => {
            if (!json.success) {
                sendMessage.push('签到失败', json.message)
                return Promise.reject(sendMessage.join(', '))
            }

            sendMessage.push('签到成功')

            const { signInLogs, signInCount } = json.result
            const currentSignInfo = signInLogs[signInCount - 1] // 当天签到信息

            sendMessage.push(`本月累计签到 ${signInCount} 天`)

            // 未领取奖励列表
            const rewards = signInLogs.filter(
                (v: { status: string; isReward: any; }) => v.status === 'normal' && !v.isReward
            )

            if (rewards.length) {
                for await (const reward of rewards) {
                    const signInDay = reward.day
                    try {
                        const rewardInfo = await getReward(access_token, signInDay)
                        sendMessage.push(
                            `第${signInDay}天奖励领取成功: 获得${rewardInfo.name || ''}${rewardInfo.description || ''
                            }`
                        )
                    } catch (e) {
                        sendMessage.push(`第${signInDay}天奖励领取失败:`, e)
                    }
                }
            } else if (currentSignInfo.isReward) {
                sendMessage.push(
                    `今日签到获得${currentSignInfo.reward.name || ''}${currentSignInfo.reward.description || ''
                    }`
                )
            }

            return sendMessage.join(', ')
        })
        .catch(e => {
            sendMessage.push('签到失败')
            sendMessage.push(e.message)
            return Promise.reject(sendMessage.join(', '))
        })
}

// 领取奖励
function getReward(access_token: any, signInDay: any) {
    return axios(rewardURL, {
        method: 'POST',
        data: { signInDay },
        headers: {
            authorization: access_token,
            'Content-Type': 'application/json'
        }
    })
        .then(d => d.data)
        .then(json => {
            if (!json.success) {
                return Promise.reject(json.message)
            }

            return json.result
        })
}

// 获取环境变量
async function getRefreshToken() {
    let instance = null
    /*   try {
        instance = await initInstance()
      } catch (e) {} */
    let refreshToken = ALIYUNTOKEN || [];
    //const aliYunTokenArray = JSON.parse(ALIYUNTOKEN);
    /*   try {
        if (instance) refreshToken = await getEnv(instance, 'refreshToken')
      } catch (e) {} */

    let refreshTokenArray = []


    if (Array.isArray(refreshToken)) {
        refreshTokenArray = refreshToken;
    } else if (refreshToken.indexOf('&') > -1) {
        refreshTokenArray = refreshToken.split('&');
    } else if (refreshToken.indexOf('\n') > -1) {
        refreshTokenArray = refreshToken.split('\n');
    } else {
        refreshTokenArray = [refreshToken];
    }

    if (!refreshTokenArray.length) {
        console.log('未获取到refreshToken, 程序终止')
        process.exit(1)
    }

    return {
        instance,
        refreshTokenArray
    }
}

