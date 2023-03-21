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
const pidLog = process.env.YDA_DIR + '/config/pid.json'
const YDA_KEY = process.env.YDA_KEY
const YDA_URL = process.env.YDA_URL

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
      `, { parse_mode: "HTML" }).then(res => { deleteMessage(res, 60) })
        console.log('help')
        break;
      default:
        const an_jian: InlineKeyboardButton[][] = await makeMessage()

        bot.sendMessage(msg.from.id, '说明 <code>>></code> <code>/ytb help</code>', {
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
  //await bot.answerCallbackQuery(query.id, { text: '正在处理中...', show_alert: false });
  const { data, message } = query
  //console.log(JSON.stringify(query, null, 2))
  const args = data?.split(" ")
  let reply: Message;
  let keyboard: InlineKeyboardButton[][];
  let listen: number;
  try {
    if (query.from.id === parseInt(process.env.HOSTID)) {
      switch (args[1]) {
        case '':
        case null:
        case undefined:
          //没直播
          await bot.sendMessage(query.from.id, `
          channelName<code>:</code> <b><a href="https://www.youtube.com/channel/${args[3]}">${args[2]}</a></b> - ${args[4]}\nchannelId<code>:</code> <code>${args[3]}</code>
          `, {
            reply_markup: {
              inline_keyboard: [[
                {
                  text: '删除',
                  callback_data: `ytbcontrol delete ${args[3]} ${message.message_id}`
                }
              ]]
            },
            parse_mode: "HTML",
            disable_web_page_preview: true
          }).then(res => { deleteMessage(res, 15) })
          break;
        case 'add':
          keyboard = [
            [
              {
                text: 'videoid',
                callback_data: `ytbcontrol video ${message.message_id}`
              },
              {
                text: 'channelid',
                callback_data: `ytbcontrol channel ${message.message_id}`
              }
            ]
          ]
          await bot.sendMessage(query.from.id, `选择类型`, {
            reply_markup: {
              inline_keyboard: keyboard
            }
          }).then(res => { deleteMessage(res, 15) })

          break;
        case 'video':
          bot.deleteMessage(message.chat.id, `${message.message_id}`)
          reply = await bot.sendMessage(query.from.id, `请输入要增加的视频ID`, {
            reply_markup: {
              force_reply: true
            },
            parse_mode: 'Markdown',
            disable_web_page_preview: true
          })

          listen = bot.onReplyToMessage(reply.chat.id, reply.message_id, (msg) => { videoidGet(query.id, msg, Number(args[2])) })
          setTimeout(() => {
            deleteMessage(reply, 1)
            bot.removeReplyListener(listen)
          }, 30 * 1000)
          break;
        case 'channel':
          bot.deleteMessage(message.chat.id, `${message.message_id}`)
          reply = await bot.sendMessage(query.from.id, `请输入要增加的频道ID`, {
            reply_markup: {
              force_reply: true
            },
            parse_mode: 'Markdown',
            disable_web_page_preview: true
          })

          listen = bot.onReplyToMessage(reply.chat.id, reply.message_id, (msg) => { channelidGet(query.id, msg, Number(args[2])) })
          setTimeout(() => {
            deleteMessage(reply, 1)
            bot.removeReplyListener(listen)
          }, 30 * 1000)
          break;
        case 'best':
          bot.deleteMessage(message.chat.id, `${message.message_id}`)
          rwConfig(query.id, args[2], args[3], 'best', message.chat.id, Number(args[4]))
          break;
        case 'worst':
          bot.deleteMessage(message.chat.id, `${message.message_id}`)
          rwConfig(query.id, args[2], args[3], 'worst', message.chat.id, Number(args[4]))
          break;
        case 'exit':
          bot.deleteMessage(message.chat.id, `${message.message_id}`)
          break;
        case 'delete':
          bot.deleteMessage(message.chat.id, `${message.message_id}`)
          deleteConfig(query.id, args[2], message.chat.id, Number(args[3]))
          break;
        case 'stop':
          bot.deleteMessage(message.chat.id, `${message.message_id}`)
          spawn('kill', [args[2]])
          break;
        default:
          keyboard = [
            [

              {
                text: '停止',
                callback_data: `ytbcontrol stop ${args[1]}`
              },
              {
                text: '删除',
                callback_data: `ytbcontrol delete ${args[3]}`
              }
            ]
          ]
          await bot.sendMessage(query.from.id, `name: ${args[2]}\npid: ${args[1]}`, {
            reply_markup: {
              inline_keyboard: keyboard
            }
          }).then(res => { deleteMessage(res, 15) })

          //await bot.sendMessage(query.from.id, `${args[3]}-${args[4]}`)
          break;
      }

    }
  } catch (error) {

  }
}

//从录播脚本日志处获取信息
function makeMessage() {
  // 读取第一个文件
  const pidData = fs.readFileSync(pidLog);
  const pidJson = JSON.parse(pidData.toString('utf8'));

  // 读取第二个文件
  const configData = fs.readFileSync(configLog);
  const configJson = JSON.parse(configData.toString('utf8'));

  // 将数据合并到一个数组中
  const mergedData = [];
  for (const { pid, name, channelId } of pidJson.pids) {
    const matchingYoutuber = configJson.youtubers.find((youtuber: { channelId: any; }) => youtuber.channelId === channelId);
    mergedData.push({
      pid,
      name,
      channelName: matchingYoutuber ? matchingYoutuber.channelName : '',
      channelId,
      definition: matchingYoutuber ? matchingYoutuber.definition : '',
    });
  }

  for (const { channelName, channelId, definition } of configJson.youtubers) {
    if (!mergedData.some(({ channelId: mergedChannelId }) => mergedChannelId === channelId)) {
      mergedData.push({
        pid: '',
        name: '',
        channelName,
        channelId,
        definition,
      });
    }
  }
  //return mergedData

  let an_jian: InlineKeyboardButton[][] = [
    [
      {
        text: '增加',
        callback_data: `ytbcontrol add`
      }
    ]
  ]
  let row = []
  mergedData.forEach((room, index) => {
    row.push({
      text: `${room.pid ? room.name : room.channelName}`,
      callback_data: `ytbcontrol ${room.pid} ${room.channelName} ${room.channelId} ${room.definition}`
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
      console.log(Channel);
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

      keyboard = [
        [
          {
            text: 'best',
            callback_data: `ytbcontrol best ${Channel.id} ${Channel.snippet.customUrl} ${messageId}`
          },
          {
            text: 'worst',
            callback_data: `ytbcontrol worst ${Channel.id} ${Channel.snippet.customUrl} ${messageId}`
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
      }).then(res => { deleteMessage(res, 15) })

    })
    .catch(error => {
      bot.answerCallbackQuery(id, { text: '无效', show_alert: false });
      console.error(error);
    });
}

//写入config.json配置
async function rwConfig(id: string, channelId: string, channelName: string, definition: string, chatId: number, messageId: number) {

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

      configJson.youtubers = [...configJson.youtubers, { channelName: channelName.substring(1), channelId: channelId, definition: definition }];
      // Object.assign(runningJson.channelIds, { channelId: youtuber.channelId });
      //console.log(configJson)
      await writeFileAsync(configLog, JSON.stringify(configJson, null, 2))

      await bot.answerCallbackQuery(id, { text: '完成', show_alert: false });
      updateList(chatId, messageId);
    } else {
      await bot.answerCallbackQuery(id, { text: '已在列表中', show_alert: false });
      //console.log(`列表中`);
    }

  } catch (err) {
    console.error(err);
  }

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

  const an_jian: InlineKeyboardButton[][] = await makeMessage()

  await bot.editMessageReplyMarkup({ inline_keyboard: an_jian }, {
    chat_id: chatId,
    message_id: messageId
  })
}