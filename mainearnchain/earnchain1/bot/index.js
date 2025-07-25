const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEB_APP_URL = process.env.WEB_APP_URL || 'https://your-app.onrender.com';

const bot = new TelegramBot(TOKEN, { polling: true });

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  try {
    await bot.sendMessage(chatId, '🌟 Welcome to Earn Chain! 🌟\n\nClick ads to earn rewards and build your crypto fortune!', {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔗 Start Earning Now', web_app: { url: WEB_APP_URL } }]
        ]
      }
    });
  } catch (error) {
    console.error('Bot Error:', error.message);
  }
});

console.log('Earn Chain Bot is running...');