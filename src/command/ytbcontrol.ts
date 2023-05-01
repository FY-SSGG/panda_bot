import bot, { Command, deleteMessage } from "../bot";
import fs from "fs"
import { promisify } from 'util';
import axios from "axios";
//@ts-ignore
import { CallbackQuery, Message, InlineKeyboardButton } from "node-telegram-bot-api";
import { spawn } from "child_process";
const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);

const configLog = process.env.YDA_DIR + '/config/config.json'
const runningLog = process.env.YDA_DIR + '/config/running.json'
const YDA_KEY = process.env.YDA_KEY
const YDA_URL = process.env.YDA_URL;

let event: any

export const command = new Command(
  /^\/ytb/,
  '\/ytb 油管脚本控制',
  handler,
  false,
  '录播控制插件',
  call
)

async function handler(msg: Message) {
  deleteMessage(msg, 15)
  if (msg.from.id === parseInt(process.env.HOSTID)) {
    let local = msg.text.split(" ")[1];
    switch (local) {
      case 'help':
        bot.sendMessage(msg.from.id, `这是和<a href="https://github.com/FY-SSGG/testRecorder">录播脚本</a>搭配使用的控制插件
新增监听可使用所属人员视频的id或频道id
新增时需要设置清晰度（best或worst）
需要设置是否默认录制（Auto on/off）
已经添加的人员说明：
英文名既没有直播
频道名既正在直播
英文名后有✓说明当前待机室会进行录制
英文名后有✗说明默认不录制
英文名后没有✓✗说明没有待机信息
点选人员可进行简单设置
比如：终止，会结束录制并跳过当前的直播
跳过，则会跳过当前的待机室
开始，则会录制当前（非即时，适用待机室
      `, { parse_mode: "HTML", disable_web_page_preview: true }).then(res => { deleteMessage(res, 60) })
        console.log('help')
        break;
      default:
        const an_jian: InlineKeyboardButton[][] = await makeMessage()

        bot.sendMessage(msg.from.id, '天気がいいから、散歩しましょう <code>/ytb help</code>', {
          reply_markup: {
            inline_keyboard: an_jian
          },
          parse_mode: 'HTML'
        }).then(res => { deleteMessage(res, 60) })
        break;
    }

  } else {
    bot.sendMessage(msg.from.id, '今天天气真不错').then(res => { deleteMessage(res, 60) })
  }

}

async function call(query: CallbackQuery) {
  const { data, message } = query
  //console.log(JSON.stringify(query, null, 2))
  const args = data?.split(" ")
  let reply: Message;
  let keyboard: InlineKeyboardButton[][];
  let listen: number;
  let text: string;
  try {
    if (query.from.id === parseInt(process.env.HOSTID)) {
      switch (args[1]) {
        case 'add':
          keyboard = [
            [
              {
                text: 'videoid',
                callback_data: `ytbcontrol add_0 video ${message.message_id}`
              },
              {
                text: 'channelid',
                callback_data: `ytbcontrol add_0 channel ${message.message_id}`
              }
            ]
          ]
          await bot.sendMessage(query.from.id, `选择类型`, {
            reply_markup: {
              inline_keyboard: keyboard
            }
          }).then(res => { deleteMessage(res, 15) })

          break;
        case 'add_0':
          bot.deleteMessage(message.chat.id, `${message.message_id}`)
          switch (args[2]) {
            case 'video':
              reply = await bot.sendMessage(query.from.id, `请输入要增加的视频ID`, {
                reply_markup: {
                  force_reply: true
                },
                parse_mode: 'Markdown',
                disable_web_page_preview: true
              })

              listen = bot.onReplyToMessage(reply.chat.id, reply.message_id, (msg) => { videoidGet(query.id, msg, Number(args[3])) })
              setTimeout(() => {
                deleteMessage(reply, 1)
                bot.removeReplyListener(listen)
              }, 30 * 1000)
              break;
            case 'channel':
              reply = await bot.sendMessage(query.from.id, `请输入要增加的频道ID`, {
                reply_markup: {
                  force_reply: true
                },
                parse_mode: 'Markdown',
                disable_web_page_preview: true
              })

              listen = bot.onReplyToMessage(reply.chat.id, reply.message_id, (msg) => { channelidGet(query.id, msg, Number(args[3])) })
              setTimeout(() => {
                deleteMessage(reply, 1)
                bot.removeReplyListener(listen)
              }, 30 * 1000)
              break;
          }
          break;
        case 'add_1':
          event[args[3]].definition = args[2];
          keyboard = [
            [
              {
                text: 'Auto on',
                callback_data: `ytbcontrol add_2 true ${args[3]} ${args[4]}`
              },
              {
                text: 'Auto off',
                callback_data: `ytbcontrol add_2 false ${args[3]} ${args[4]}`
              }
            ],
            [
              {
                text: '取消',
                callback_data: `ytbcontrol exit`
              }
            ]
          ]
          bot.editMessageText('是否自动录制', {
            chat_id: message.chat.id,
            message_id: message.message_id
          });
          bot.editMessageReplyMarkup({ inline_keyboard: keyboard }, {
            chat_id: message.chat.id,
            message_id: message.message_id
          })
          //rwConfig(query.id, args[3], event[args[3]].channelName, args[2], message.chat.id, Number(args[4]))
          break;
        case 'add_2':
          bot.deleteMessage(message.chat.id, `${message.message_id}`)
          rwConfig(query.id, args[3], event[args[3]].channelName, event[args[3]].definition, JSON.parse(args[2]), message.chat.id, Number(args[4]))
          break;
        case 'exit':
          bot.deleteMessage(message.chat.id, `${message.message_id}`)
          break;
        case 'auto':
          bot.deleteMessage(message.chat.id, `${message.message_id}`)
          rwConfig(query.id, args[2], event[args[2]].channelName, event[args[2]].definition, !JSON.parse(args[3]), message.chat.id, Number(args[4]))
          break;
        case 'start':
          bot.deleteMessage(message.chat.id, `${message.message_id}`)
          rwRunning(query.id, args[2], true, message.chat.id, Number(args[3]))
          break;
        case 'stop':
          bot.deleteMessage(message.chat.id, `${message.message_id}`)
          rwRunning(query.id, args[2], false, message.chat.id, Number(args[3]))
          break;
        case 'delete':
          bot.deleteMessage(message.chat.id, `${message.message_id}`)
          deleteConfig(query.id, args[2], message.chat.id, Number(args[3]))
          break;
        case 'kill':
          bot.deleteMessage(message.chat.id, `${message.message_id}`)
          spawn('kill', [args[2]])
          updateList(message.chat.id, Number(args[3]))
          break;
        default:
          if (args[1]) {
            if (args[2]) {
              keyboard = [
                [
                  {
                    text: '终止',
                    callback_data: `ytbcontrol kill ${args[2]} ${message.message_id}`
                  },
                  {
                    text: `${event[args[3]].autoRecorder ? 'AUTO off' : 'AUTO on'}`,
                    callback_data: `ytbcontrol auto ${args[3]} ${event[args[3]].autoRecorder} ${message.message_id}`
                  }
                ],
                [
                  {
                    text: '删除',
                    callback_data: `ytbcontrol delete ${args[3]} ${message.message_id}`
                  }
                ]
              ]
              text = `name<code>:</code> <b><a href="https://www.youtube.com/channel/${args[3]}/live">${event[args[3]].name}</a></b>\nchannelId<code>:</code> <code>${args[3]}</code>\npid<code>:</code> ${args[2]} - ${event[args[3]].definition} ${event[args[3]].autoRecorder ? '- on' : '- off'}`;

            } else {
              keyboard = [
                [
                  {
                    text: `${event[args[3]].isStreamlink ? '跳过' : '开始'}`,
                    callback_data: `ytbcontrol ${event[args[3]].isStreamlink ? 'stop ' + args[3] + " " + message.message_id : 'start ' + args[3] + " " + message.message_id}`
                  },
                  {
                    text: `${event[args[3]].autoRecorder ? 'AUTO off' : 'AUTO on'}`,
                    callback_data: `ytbcontrol auto ${args[3]} ${event[args[3]].autoRecorder} ${message.message_id}`
                  }
                ],
                [
                  {
                    text: '删除',
                    callback_data: `ytbcontrol delete ${args[3]} ${message.message_id}`
                  }
                ]
              ]
              text = `name<code>:</code> <b><a href="https://www.youtube.com/channel/${args[3]}/live">${event[args[3]].name}</a></b>\nchannelId<code>:</code> <code>${args[3]}</code>\nvid<code>:</code> <b>${args[1]}</b> - ${event[args[3]].definition} ${event[args[3]].autoRecorder ? '- on' : '- off'}`;

            }
          } else {
            keyboard = [
              [
                {
                  text: `${event[args[3]].autoRecorder ? 'AUTO off' : 'AUTO on'}`,
                  callback_data: `ytbcontrol auto ${args[3]} ${event[args[3]].autoRecorder} ${message.message_id}`
                },
                {
                  text: '删除',
                  callback_data: `ytbcontrol delete ${args[3]} ${message.message_id}`
                }
              ]
            ]
            text = `channelName<code>:</code> <b><a href="https://www.youtube.com/channel/${args[3]}">${event[args[3]].channelName}</a></b> - ${event[args[3]].definition} ${event[args[3]].autoRecorder ? '- on' : '- off'}\nchannelId<code>:</code> <code>${args[3]}</code>`;

          }
          await bot.sendMessage(query.from.id, text, {
            reply_markup: {
              inline_keyboard: keyboard
            },
            parse_mode: "HTML",
            disable_web_page_preview: true
          }).then(res => { deleteMessage(res, 15) })
          break;
      }

    }
  } catch (error) {

  }
}

//从录播脚本日志处获取信息生成按钮列表
function makeMessage() {

  const configJson = JSON.parse(fs.readFileSync(configLog).toString('utf8'));
  const runJson = JSON.parse(fs.readFileSync(runningLog).toString('utf8'));
  event = runJson;

  interface ChannelData {
    channelName: string;
    definition: string;
    autoRecorder: boolean;
    name: string;
    videoId: string;
    pid: string | number;
    isStreamlink: boolean;
  }
  const runArray = Object.entries(runJson).map(([channelId, channelData]: [string, ChannelData]) => ({
    channelId,
    ...channelData,
  }));

  const mergedData = []

  for (const youtuber of configJson.youtubers) {
    // 在 runArray 中查找相应的 channel
    const channel = runArray.find(channel => channel.channelId === youtuber.channelId);
    // 如果找到了就将其添加到结果数组中
    if (channel) {
      event[youtuber.channelId].definition = youtuber.definition;
      event[youtuber.channelId].autoRecorder = youtuber.autoRecorder;
      channel.definition = youtuber.definition;
      channel.autoRecorder = youtuber.autoRecorder;
      mergedData.push(channel);
    }
  }


  let an_jian: InlineKeyboardButton[][] = [[{ text: '增加', callback_data: `ytbcontrol add` }]]

  let row = []
  mergedData.forEach((channel, index) => {
    row.push({
      text: `${channel.videoId ? (channel.pid ? channel.name : channel.channelName + (channel.isStreamlink ? " ✓" : " ✗")) : channel.channelName + (channel.autoRecorder ? "" : " ✗")}`,
      callback_data: `ytbcontrol ${channel.videoId} ${channel.pid} ${channel.channelId}`
    })

    // 每添加两个按键，就将该行按键添加到按键列表
    if ((index + 1) % 2 === 0) {
      an_jian.push(row)
      row = []
    }
  })

  // 如果最后还有剩余的按键，则添加到列表中
  if (row.length > 0) {
    an_jian.push(row)
  }

  return an_jian
}

//videoid==>channelid
function videoidGet(id: string, msg: Message, messageId: number) {
  //console.log(msg)
  const video_id = msg.text;
  axios.get(`${YDA_URL}videos?part=snippet&id=${video_id}&key=${YDA_KEY}`, {
    headers: {
      'Accept': 'application/json'
    }
  })
    .then(response => {
      const Channel = response.data.items[0]
      //console.log(Channel);
      const updatedMessage: Message = {
        ...msg, // 复制原来的 Message 对象的所有字段
        text: Channel.snippet.channelId, // 修改 text 字段为新的文本内容
      };
      channelidGet(id, updatedMessage, messageId)
    })
    .catch(error => {
      bot.deleteMessage(msg.reply_to_message.chat.id, `${msg.reply_to_message.message_id}`)
      bot.deleteMessage(msg.chat.id, `${msg.message_id}`)
      bot.answerCallbackQuery(id, { text: '无效', show_alert: false });
      console.error(error);
    });
}

//channelid==>Name+callback
function channelidGet(id: string, msg: Message, messageId: number) {
  //console.log(msg)
  bot.deleteMessage(msg.reply_to_message.chat.id, `${msg.reply_to_message.message_id}`)
  bot.deleteMessage(msg.chat.id, `${msg.message_id}`)
  let keyboard: InlineKeyboardButton[][];
  const channelId = msg.text;
  axios.get(`${YDA_URL}channels?part=snippet&id=${channelId}&key=${YDA_KEY}`, {
    headers: {
      'Accept': 'application/json'
    }
  })
    .then(response => {
      const Channel = response.data.items[0]

      event[Channel.id] = event[Channel.id] ?? {
        channelName: Channel.snippet.customUrl,
        definition: null,
        autoRecorder: null
      }
      keyboard = [
        [
          {
            text: 'best',
            callback_data: `ytbcontrol add_1 best ${Channel.id} ${messageId}`
          },
          {
            text: 'worst',
            callback_data: `ytbcontrol add_1 worst ${Channel.id} ${messageId}`
          }
        ],
        [
          {
            text: '取消',
            callback_data: `ytbcontrol exit`
          }
        ]
      ]
      bot.sendMessage(msg.from.id, `是否确认加入录播(worst仅上传音频):\n${Channel.snippet.customUrl}\n${Channel.snippet.title}`, {
        reply_markup: {
          inline_keyboard: keyboard
        }
      }).then(res => { deleteMessage(res, 20) })
    })
    .catch(error => {
      bot.answerCallbackQuery(id, { text: '无效', show_alert: false });
      console.error(error);
    });
}

//写入config.json配置
async function rwConfig(id: string, channelId: string, channelName: string, definition: string, autoRecorder: boolean, chatId: number, messageId: number) {

  try {
    let configJson: { youtubers: any[]; };
    try {
      const configData = await readFileAsync(configLog, 'utf-8');
      configJson = JSON.parse(configData);
      //console.log(configJson)
    } catch (err) {
      if (err instanceof SyntaxError) {
        console.error(`config.json解析错误：\n`, err.message);
      } else {
        console.error(err);
      }
    }

    //console.log(!configJson.youtubers.some((c: { channelId: string; }) => c.channelId === channelId))
    if (!configJson.youtubers.some((c: { channelId: string; }) => c.channelId === channelId)) {

      configJson.youtubers = [...configJson.youtubers, { channelName: channelName.substring(1), channelId: channelId, definition: definition, autoRecorder: autoRecorder }];
      // Object.assign(runningJson.channelIds, { channelId: youtuber.channelId });
      //console.log(configJson)
      await bot.answerCallbackQuery(id, { text: '新增', show_alert: false });
      await writeFileAsync(configLog, JSON.stringify(configJson, null, 2))
      updateList(chatId, messageId);
    } else {
      configJson.youtubers.forEach(youtuber => {
        if (youtuber.channelId === channelId) {
          youtuber.autoRecorder = autoRecorder;
          youtuber.definition = definition;
        }
      });
      await bot.answerCallbackQuery(id, { text: '更新', show_alert: false });
      //console.log(`列表中`);
      await writeFileAsync(configLog, JSON.stringify(configJson, null, 2))
      updateList(chatId, messageId);
    }

  } catch (err) {
    console.error(err);
  }

}

//写入running.json配置
async function rwRunning(id: string, channelId: string, isStreamlink: boolean, chatId: number, messageId: number) {

  const runData = await readFileAsync(runningLog);
  const runJson = JSON.parse(runData.toString('utf8'));

  runJson[channelId].isStreamlink = isStreamlink
  await writeFileAsync(runningLog, JSON.stringify(runJson, null, 2))
  await bot.answerCallbackQuery(id, { text: '完成', show_alert: false });
  updateList(chatId, messageId);
}

//删除config.json配置
async function deleteConfig(id: string, channelId: string, chatId: number, messageId: number) {
  let configJson: { youtubers: any[]; };
  try {
    const configData = await readFileAsync(configLog, 'utf-8');
    configJson = JSON.parse(configData);
    //console.log(configJson)

    if (configJson.youtubers.some((c: { channelId: string; }) => c.channelId === channelId)) {
      configJson.youtubers = configJson.youtubers.filter((c: { channelId: string; }) => c.channelId !== channelId);
      await writeFileAsync(configLog, JSON.stringify(configJson, null, 2))
      await bot.answerCallbackQuery(id, { text: '完成', show_alert: false });
      updateList(chatId, messageId);

    } else {
      await bot.answerCallbackQuery(id, { text: '不在列表中', show_alert: false });
    }

  } catch (err) {
    if (err instanceof SyntaxError) {
      console.error(`config.json解析错误：\n`, err.message);
    } else {
      console.error(err);
    }
  }
}

//更新主菜单按钮
async function updateList(chatId: number, messageId: number) {
  setTimeout(async () => {
    const an_jian: InlineKeyboardButton[][] = await makeMessage()
    try {
      await bot.editMessageReplyMarkup({ inline_keyboard: an_jian }, {
        chat_id: chatId,
        message_id: messageId
      })
    } catch (error) {
      console.error(error.message);
    }

  }, 3 * 1000);
}