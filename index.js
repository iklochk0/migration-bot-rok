const { Client, GatewayIntentBits, Partials, Events, EmbedBuilder, AttachmentBuilder } = require('discord.js');

require('dotenv').config();

// Конфігураційні константи
const TOKEN = process.env.TOKEN; // Токен бота
const ADMIN_CHANNEL_ID = process.env.ADMIN_CHANNEL_ID;   // ID адмін-каналу для готових заявок

// Створюємо клієнт Discord з потрібними правами (інтентами) для роботи з повідомленнями і DM
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,           // для роботи зі слеш-командами
        GatewayIntentBits.GuildMessages,    // для отримання повідомлень на сервері (напр., щоб ігнорувати або логувати)
        GatewayIntentBits.MessageContent,   // щоб читати зміст повідомлень (потрібно для тексту відповідей)
        GatewayIntentBits.DirectMessages    // щоб отримувати повідомлення в DM
    ],
    partials: [ Partials.Channel ]          // для обробки DM-каналу, який може приходити як partial
});

// Логування (console) з міткою часу
function logEvent(code, description) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${code}] ${description}`);
}

// Збереження активних сесій користувачів
const activeSessions = new Set();

// Колекція текстів двома мовами для зручності (ua = українська, en = English)
const localeTexts = {
    // ua: {
    //     startDm: "Привіт! Для подання заявки MGE, будь ласка, дайте відповіді на кілька запитань. Прошу НЕ обрізати скріншоти",
    //     askProfile: "1️⃣ Надішліть скріншот вашого профілю.",
    //     askAge: "5️⃣ Який вік вашого акканту?",
    //     lastKVK: "6️⃣ Надішліть скріншот статистики вашого минулого КВК.",
    //     askCommanders: "4️⃣ Надішліть скріншот ваших командирів.",
    //     askEquipment: "2️⃣ Надішліть скріншот вашого спорядження.",
    //     askVIP: "3️⃣ Який у вас VIP-рівень? Надішліть, будь ласка, скріншот VIP.",
    //     invalidImage: "❗ Будь ласка, надішліть **зображення** (скріншот) для цього питання.",
    //     invalidText: "❗ Будь ласка, надішліть відповідь текстом (це питання не потребує зображення).",
    //     timeoutMsg: "⚠️ Час на відповіді вичерпано. Сесію завершено. Якщо хочете спробувати знову – використайте команду /apply заново.",
    //     sessionActive: "Ви вже запустили заповнення анкети. Завершіть поточну або зачекайте 5 хвилин, щоб почати нову.",
    //     dmError: "Не вдалося надіслати вам приватне повідомлення. Можливо, у вас вимкнені DM з цього серверу.",
    //     thankYou: "✅ Дякуємо, вашу заявку отримано! Її відправлено адміністраторам."
    // },
    en: {
        startDm: "Hello! To apply for the MGE event, please answer a few questions. Please DON'T crop the screenshots.",
        askProfile: "1️⃣ Please send a screenshot of your game profile.",
        askEquipment: "2️⃣ Please send a screenshot of your equipment.",
        askVIP: "3️⃣ What is your VIP level? Please send a screenshot of your VIP screen.",
        askCommanders: "4️⃣ Please send a screenshot of your commanders.",
        askAge: "5️⃣ How old is your account?",
        lastKVK: "6️⃣ Please send a screenshot of your last KvK statistics.",
        invalidImage: "❗ Please send an **image** (screenshot) for this question.",
        invalidText: "❗ Please answer with text (no image is needed for this question).",
        timeoutMsg: "⚠️ Time is up. Session ended due to inactivity. Please run /apply again if you want to try again.",
        sessionActive: "You already have an application in progress. Please finish it or wait 5 minutes before starting a new one.",
        dmError: "I couldn't send you a DM. Please check your privacy settings and try again.",
        thankYou: "✅ Thank you, your application has been received and sent to the admins!"
    }
};

// Головна подія при запуску бота
client.once(Events.ClientReady, async () => {
    console.log(`Bot logged in as ${client.user.tag}`);
    // Очистити глобальні команди
    await client.application.commands.set([]);

    const guildId = '1354546683643428864'; 
    const guild = client.guilds.cache.get(guildId);

    if (!guild) {
        console.error(`Сервер із ID ${guildId} не знайдено!`);
        return;
    }

    try {
        await guild.commands.create({
            name: 'apply',
            description: 'Start an Migration Application.'
        });
        console.log('✅ Slash-команда /apply успішно зареєстрована на сервері!');
    } catch (error) {
        console.error('❌ Помилка реєстрації команди:', error);
    }
});

// Обробка взаємодій (slash-команд)
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName === 'apply') {
        const userId = interaction.user.id;
        // Перевірка активної сесії для цього користувача
        if (activeSessions.has(userId)) {
            // Відповідаємо ephemeral, що сесія вже активна
            await interaction.reply({ content: localeTexts.en.sessionActive, ephemeral: true });
            return;
        }
        // Додаємо у активні сесії
        activeSessions.add(userId);
        logEvent("200", `Started MGE application session for user ${userId}`);
        await interaction.deferReply({ ephemeral: true });
        try {
            // Відправляємо користувачу DM з привітанням
            const dmChannel = await interaction.user.createDM();
            // Визначаємо мову: беремо налаштування Discord користувача, або за замовчуванням англ.
            let lang = 'en';
            const locale = interaction.locale || '';  // наприклад, 'uk' або 'en-US'
            if (locale.startsWith('uk')) {
                lang = 'ua';
            }
            // Якщо хочемо явно запитувати мову, можна раскоментувати наступний блок:
            
            // await dmChannel.send(localeTexts.en.chooseLang + "\n" + localeTexts.ua.chooseLang);
            // const langReply = await dmChannel.awaitMessages({
            //     filter: m => m.author.id === userId,
            //     max: 1,
            //     time: 30000
            // });
            // if (langReply.size) {
            //     const choice = langReply.first().content.trim();
            //     if (choice === '2' || choice === 'Українська' || choice.toLowerCase() === 'ukrainian') {
            //         lang = 'ua';
            //     } else {
            //         lang = 'en';
            //     }
            // }
            
            // Відправляємо стартове повідомлення і перше питання
            await interaction.editReply({ content: (lang === 'ua' ? "✅ Починаємо заповнення анкети! Повідомлення надіслано вам в приват." : "✅ Starting your application! I've sent you a DM.") });
            // Привітання в DM
            const introMsg = await dmChannel.send(localeTexts[lang].startDm);
            // Плануємо авто-видалення повідомлення бота через 5 хв (300000 мс)
            setTimeout(() => { introMsg.delete().catch(() => {}); }, 300000);

            // Функція-хелпер для отримання відповіді з DM з таймаутом і валідацією
            async function askQuestion(questionText, expectImage) {
                // Надсилаємо питання
                const questionMsg = await dmChannel.send(questionText);
                setTimeout(() => { questionMsg.delete().catch(() => {}); }, 300000);
                // Чекаємо на відповідь
                const reply = await dmChannel.awaitMessages({
                    filter: m => m.author.id === userId,
                    max: 1,
                    time: 300000
                });
                if (!reply.size) {
                    // Якщо час вийшов і відповіді нема
                    return null; // signal timeout
                }
                const answerMsg = reply.first();
                // Якщо бот отримав відповідь, далі перевіряємо тип
                if (expectImage) {
                    // Очікувався скріншот (вкладення)
                    if (answerMsg.attachments.size === 0) {
                        // Користувач не прикріпив файл
                        const warnMsg = await dmChannel.send(localeTexts[lang].invalidImage);
                        setTimeout(() => { warnMsg.delete().catch(() => {}); }, 300000);
                        // Видаляємо повідомлення користувача (без вкладення, не потрібно зберігати)
                        try { await answerMsg.delete(); } catch {}
                        // Повторно запитуємо те саме питання рекурсивно
                        return await askQuestion(questionText, expectImage);
                    } else {
                        // ОК - є вкладення. (Можна додатково перевірити, чи це зображення за contentType)
                        const attachment = answerMsg.attachments.first();
                        const isImage = attachment.contentType && attachment.contentType.startsWith('image');
                        if (!isImage) {
                            const warnMsg = await dmChannel.send(localeTexts[lang].invalidImage);
                            setTimeout(() => { warnMsg.delete().catch(() => {}); }, 300000);
                            try { await answerMsg.delete(); } catch {}
                            return await askQuestion(questionText, expectImage);
                        }
                        // Якщо все гаразд, залишаємо відповідь (можна також видалити одразу або пізніше).
                        // (Не видаляємо її зараз, бо нам потрібно attachment.url далі для Embed)
                        return answerMsg;
                    }
                } else {
                    // Очікувався текст
                    if (answerMsg.attachments.size > 0) {
                        // Якщо користувач надіслав картинку, а треба текст
                        const warnMsg = await dmChannel.send(localeTexts[lang].invalidText);
                        setTimeout(() => { warnMsg.delete().catch(() => {}); }, 300000);
                        try { await answerMsg.delete(); } catch {}
                        return await askQuestion(questionText, expectImage);
                    } else {
                        // Отримано текстову відповідь
                        return answerMsg;
                    }
                }
            }

            // Послідовно ставимо кожне питання і збираємо відповіді
            const answers = {};  // для збереження відповідей
            // 1. Профіль (скрін)
            let response = await askQuestion(localeTexts[lang].askProfile, true);
            if (!response) { throw { code: 101, message: "User did not respond to profile screenshot." }; }
            answers.profileScreenshot = response.attachments.first();
            // 2. Cпорядження (скрін)
            response = await askQuestion(localeTexts[lang].askEquipment, true);
            if (!response) { throw { code: 101, message: "User did not respond to equipment screenshot." }; }
            answers.equipmentScreenshot = response.attachments.first();
            // 3. Командир (скрін)
            response = await askQuestion(localeTexts[lang].askCommanders, true);
            if (!response) { throw { code: 101, message: "User did not respond to commander screenshot." }; }
            answers.commanderScreenshot = response.attachments.first();
            // 4. VIP (скрін)
            response = await askQuestion(localeTexts[lang].askVIP, true);
            if (!response) { throw { code: 101, message: "User did not respond to VIP screenshot." }; }
            answers.vipScreenshot = response.attachments.first();

            // 5. Вік (текст)
            response = await askQuestion(localeTexts[lang].askAge, false);
            if (!response) { throw { code: 101, message: "User did not respond to the account age." }; }
            answers.age = response.content.trim();
            // 6. Last KVK (скрін)
            response = await askQuestion(localeTexts[lang].lastKVK, true);
            if (!response) { throw { code: 101, message: "User did not respond to Last KVK result screenshot." }; }
            answers.lastKVKresluts = response.attachments.first();


            // Якщо всі відповіді зібрані успішно:
            logEvent("201", `Collected all answers from user ${userId}. Preparing embed...`);

            // Формуємо Embed з усією інформацією
            const embed = new EmbedBuilder()
                .setTitle(lang === 'ua' ? "📨 Нова заявка MGE" : "📨 New Migration Application")
                .setColor(0x2ECC71);  // зелений для успішної заявки (можна змінити)

            // Додаємо поля з відповідями (скріншоти як імена файлів, текстові як значення)
            // Складаємо імена файлів для вкладень
            const filesToAttach = [];

            // Функція для додавання файлу в список вкладень і текстового представлення в поле
            function addImageField(fieldName, attachment) {
                let fileName = attachment.name || "screenshot.png";
                // Додаємо файл у масив для відправки (AttachmentBuilder з URL файла)
                filesToAttach.push(new AttachmentBuilder(attachment.url, { name: fileName }));
                // Вказуємо в полі назву файлу як посилання на вкладення (attachment://fileName)
                embed.addFields({ name: fieldName, value: `📎 ${fileName}`, inline: false });
            }
            // Поля для скріншотів
            // addImageField("Профіль", answers.profileScreenshot);
            // addImageField("Commander Screenshot", answers.commanderScreenshot);
            // addImageField("Equipment Screenshot", answers.equipmentScreenshot);
            // addImageField("VIP Screenshot", answers.vipScreenshot);
            // Поля для текстових відповідей
            embed.addFields(
                { name: "Вік аккаунту", value: answers.place || "N/A", inline: true },
            );
            // Інформація про користувача
            embed.addFields({ name: "User ID", value: interaction.user.id, inline: false });
            embed.setFooter({ text: `User: ${interaction.user.tag}` });

            // Надсилаємо Embed в адміністративний канал
            const adminChannel = await client.channels.fetch(ADMIN_CHANNEL_ID);
            await adminChannel.send({ embeds: [embed], files: filesToAttach });
            logEvent("202", `Sent application embed to admin channel for user ${userId}.`);

            // Повідомляємо користувачу про успішне завершення
            const thanksMsg = await dmChannel.send(localeTexts[lang].thankYou);
            setTimeout(() => { thanksMsg.delete().catch(() => {}); }, 300000);
        }
        catch (err) {
            // Обробка виключень і таймаутів
            if (err && err.code === 101) {
                // Таймаут (користувач не відповів вчасно)
                logEvent("101", `Session timed out for user ${userId} - ${err.message || 'No response'}`);
                try {
                    const timeoutNotice = await interaction.user.send(localeTexts.en.timeoutMsg);
                    setTimeout(() => { timeoutNotice.delete().catch(() => {}); }, 300000);
                } catch {}
            } else if (err && err.code === 102) {
                // Помилка надсилання в адмін-канал (можна кинути вручну або з catch)
                logEvent("102", `Failed to send embed to admin channel for user ${userId} - ${err.message || err}`);
                try {
                    await interaction.user.send(localeTexts.en.dmError);
                } catch {}
            } else if (err && err.message === "Cannot send messages to this user") {
                // Помилка надсилання DM (користувач відключив приватні повідомлення)
                logEvent("100", `Cannot DM user ${userId}. Possibly has DMs closed.`);
                await interaction.reply({ content: localeTexts.en.dmError, ephemeral: true });
            } else {
                // Непередбачена помилка
                console.error("Unexpected error in application flow:", err);
                logEvent("ERROR", `Unexpected error for user ${userId}: ${err.message || err}`);
                try {
                    await interaction.user.send("❌ An unexpected error occurred. Please contact an administrator.");
                } catch {}
            }
        }
        finally {
            // При будь-якому результаті завершуємо сесію
            activeSessions.delete(userId);
        }
    }
});

client.login(TOKEN);