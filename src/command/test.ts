import bot, { Command, deleteMessage } from "../bot";
//import fs from "fs"
//import { promisify } from 'util';
//import axios from "axios";
//@ts-ignore
import { CallbackQuery, Message, InlineKeyboardButton } from "node-telegram-bot-api";
//import { spawn } from "child_process";


export const command = new Command(
    /^\/test/,
    '\/test 测试',
    handler,
    true,
    '测试',
    call
)

async function handler(msg: Message) {
    deleteMessage(msg, 300)
    bot.sendMessage(msg.from.id, `应用示例 <b>:</b> <code>有效 >> 5分钟</code> `, {
        reply_markup: {
            inline_keyboard: [[
                {
                    text: '开始',
                    callback_data: `test 开始 ${msg.chat.id} ${msg.message_id}`
                }
            ]]
        },
        parse_mode: 'HTML'
    }).then(res => { deleteMessage(res, 300) })

}

async function call(query: CallbackQuery) {
    const { data, message } = query
    //console.log(JSON.stringify(query, null, 2))
    const args = data?.split(" ")
    try {
        switch (args[1]) {
            case '':
            case null:
            case undefined:
                bot.deleteMessage(message.chat.id, `${message.message_id}`)
                await bot.answerCallbackQuery(query.id, { text: '示例结束', show_alert: true });
                break;
            case 'id':
                bot.deleteMessage(args[2], args[3])
                await bot.answerCallbackQuery(query.id, { text: '成功', show_alert: false });
                await bot.editMessageReplyMarkup({
                    inline_keyboard: [[
                        {
                            text: '删除回调',
                            callback_data: `test `
                        }
                    ]]
                }, {
                    chat_id: message.chat.id,
                    message_id: Number(args[4])
                })
                break;
            case 'wait':
                await bot.answerCallbackQuery(query.id, { text: '请按 "删除触发"', show_alert: false });
                break;
            default:
                await bot.answerCallbackQuery(query.id, { text: args[1], show_alert: false });
                await bot.editMessageReplyMarkup({
                    inline_keyboard: [[
                        {
                            text: '删除触发',
                            callback_data: `test id ${args[2]} ${args[3]} ${message.message_id}`
                        },
                        {
                            text: '删除回调',
                            callback_data: `test wait`
                        }
                    ]]
                }, {
                    chat_id: message.chat.id,
                    message_id: message.message_id
                })
                break;
        }


    } catch (error) {
        console.error(error);
    }



}
