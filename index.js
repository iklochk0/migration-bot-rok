const { 
    Client, 
    GatewayIntentBits, 
    Partials, 
    Events, 
    EmbedBuilder, 
    AttachmentBuilder, 
    ButtonBuilder,
    ActionRowBuilder,
    ButtonStyle 
} = require('discord.js');

require('dotenv').config();

// Конфігураційні константи
const TOKEN = process.env.TOKEN; // Токен бота
const ADMIN_CHANNEL_ID = process.env.ADMIN_CHANNEL_ID;   // ID адмін-каналу для готових заявок

// Створення клієнта Discord з потрібними правами
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,           // для роботи зі слеш-командами
        GatewayIntentBits.GuildMessages,    // для отримання повідомлень на сервері
        GatewayIntentBits.MessageContent,   // для читання змісту повідомлень
        GatewayIntentBits.DirectMessages    // для отримання DM
    ],
    partials: [ Partials.Channel ]
});

// Функція логування з міткою часу
function logEvent(code, description) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${code}] ${description}`);
}

// Збереження активних сесій користувачів
const activeSessions = new Set();

// Тексти для двох мов: українська (ua) та англійська (en)
const localeTexts = {
    ua: {
        startDm: "Привіт! Для подання заявки на міграцію до нашого королівства, будь ласка, дайте відповіді на кілька запитань. Прошу НЕ обрізати скріншоти.\n⚠️ Наразі ми приймаємо лише акаунти для КВК3. Міграція для акаунтів з SoC (Сезону Завоювань) закрита.",
        askProfile: "1️⃣ Надішліть скріншот вашого профілю.",
        askEquipment: "2️⃣ Надішліть скріншот вашого спорядження.",
        askCommanders: "3️⃣ Надішліть скріншот ваших командирів.",
        askVIP: "4️⃣ Який у вас VIP-рівень? Надішліть, будь ласка, скріншот VIP.",
        askAge: "5️⃣ Який вік вашого акканту?",
        lastKVK: "6️⃣ Надішліть скріншот статистики вашого минулого КВК.",
        invalidImage: "❗ Будь ласка, надішліть **зображення** (скріншот) для цього питання.",
        invalidText: "❗ Будь ласка, надішліть відповідь текстом (це питання не потребує зображення).",
        timeoutMsg: "⚠️ Час на відповіді вичерпано. Сесію завершено. Якщо хочете спробувати знову – використайте команду /apply заново.",
        sessionActive: "Ви вже запустили заповнення анкети. Завершіть поточну або зачекайте 5 хвилин, щоб почати нову.",
        dmError: "Не вдалося надіслати вам приватне повідомлення. Можливо, у вас вимкнені DM з цього серверу.",
        thankYou: "✅ Дякуємо, вашу заявку отримано! Її відправлено адміністраторам!"
    },
    en: {
        startDm: "Hello! To apply for migration, please answer a few questions. Please DON'T crop the screenshots. ⚠️ \n",
        askProfile: "1️⃣ Please send a screenshot of your game profile.",
        askAge: "5️⃣ How old is your account?",
        askEquipment: "2️⃣ Please send a screenshot of your equipment.",
        askCommanders: "3️⃣ Please send a screenshot of your commanders.",
        askVIP: "4️⃣ What is your VIP level? Please send a screenshot of your VIP screen.",
        lastKVK: "6️⃣ Please send a screenshot of your last KvK statistics.",
        invalidImage: "❗ Please send an **image** (screenshot) for this question.",
        invalidText: "❗ Please answer with text (no image is needed for this question).",
        timeoutMsg: "⚠️ Time is up. Session ended due to inactivity. Please run /apply again if you want to try again.",
        sessionActive: "You already have an application in progress. Please finish it or wait 5 minutes before starting a new one.",
        dmError: "I couldn't send you a DM. Please check your privacy settings and try again.",
        thankYou: "✅ Thank you, your application has been received and sent to the Admins!"
    }
};

// Головна подія при запуску бота
client.once(Events.ClientReady, async () => {
    console.log(`Bot logged in as ${client.user.tag}`);
    // Очищуємо глобальні команди
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

// Обробка взаємодій
client.on(Events.InteractionCreate, async interaction => {
    // Якщо це натискання кнопки 'apply_start', запускаємо DM-логіку
    if (interaction.isButton() && interaction.customId === 'apply_start') {
        await handleMigrationDM(interaction);
        return;
    }

    // Обробка slash-команди /apply (перший виклик) — відправляємо Embed із кнопкою
    if (interaction.isChatInputCommand() && interaction.commandName === 'apply') {
        const allowedChannelId = '1354829265849286847';
    
        if (interaction.channelId !== allowedChannelId) {
            await interaction.reply({
                content: `❌ This command can only be used in <#${allowedChannelId}> channel.`,
                ephemeral: true
            });
            return;
        }
    
        // Далі твоя логіка відправки ембеда і кнопки
        const embed = new EmbedBuilder()
            .setTitle('📋 Migration Requirements')
            .setDescription(
                '• 1b+ KP, 2m+ deaths\n' +
                '• 2 full marches\n' +
                '• VIP 14+\n\n' +
                '❗ False or incomplete info = auto reject.\n' +
                '⚠️ We are currently accepting only KVK3 accounts.\n' +
                'Migration for SoC (Season of Conquest) accounts is currently closed.'
            )
            .setColor(0x2ECC71);
    
        const button = new ButtonBuilder()
            .setCustomId('apply_start')
            .setLabel('📥 Apply')
            .setStyle(ButtonStyle.Primary);
    
        const row = new ActionRowBuilder().addComponents(button);
    
        await interaction.reply({
            content: 'Click the button to start applying:',
            embeds: [embed],
            components: [row],
            ephemeral: true
        });
        return;
    }
});

// Функція DM-логіки для заявки (запускається при натисканні кнопки)
async function handleMigrationDM(interaction) {
    const userId = interaction.user.id;

    // Перевірка активності сесії
    if (activeSessions.has(userId)) {
        await interaction.reply({ content: localeTexts.en.sessionActive, ephemeral: true });
        return;
    }
    activeSessions.add(userId);
    logEvent("200", `Started application session for user ${userId}`);

    try {
        const dmChannel = await interaction.user.createDM();

        // Визначення мови (якщо локаль починається з "uk", використовуємо українську)
        let lang = 'en';
        const locale = interaction.locale || '';
        if (locale.startsWith('uk')) {
            lang = 'ua';
        }

        await interaction.reply({ 
            content: (lang === 'ua' ? "✅ Починаємо заповнення анкети! Повідомлення надіслано вам в приват." : "✅ Starting your application! I've sent you a DM."), 
            ephemeral: true 
        });

        const introMsg = await dmChannel.send(localeTexts[lang].startDm);
        setTimeout(() => { introMsg.delete().catch(() => {}); }, 300000);

        // Хелпер для задавання питань з таймаутом і валідацією
        async function askQuestion(questionText, expectImage) {
            const questionMsg = await dmChannel.send(questionText);
            setTimeout(() => { questionMsg.delete().catch(() => {}); }, 300000);

            const collected = await dmChannel.awaitMessages({
                filter: m => m.author.id === userId,
                max: 1,
                time: 300000
            });
            if (!collected.size) {
                return null;
            }
            const answerMsg = collected.first();

            if (expectImage) {
                if (answerMsg.attachments.size === 0) {
                    const warnMsg = await dmChannel.send(localeTexts[lang].invalidImage);
                    setTimeout(() => { warnMsg.delete().catch(() => {}); }, 300000);
                    try { await answerMsg.delete(); } catch (e) {}
                    return await askQuestion(questionText, expectImage);
                } else {
                    const attachment = answerMsg.attachments.first();
                    const isImage = attachment.contentType && attachment.contentType.startsWith('image');
                    if (!isImage) {
                        const warnMsg = await dmChannel.send(localeTexts[lang].invalidImage);
                        setTimeout(() => { warnMsg.delete().catch(() => {}); }, 300000);
                        try { await answerMsg.delete(); } catch (e) {}
                        return await askQuestion(questionText, expectImage);
                    }
                    return answerMsg;
                }
            } else {
                if (answerMsg.attachments.size > 0) {
                    const warnMsg = await dmChannel.send(localeTexts[lang].invalidText);
                    setTimeout(() => { warnMsg.delete().catch(() => {}); }, 300000);
                    try { await answerMsg.delete(); } catch (e) {}
                    return await askQuestion(questionText, expectImage);
                } else {
                    return answerMsg;
                }
            }
        }

        const answers = {};

        // Збираємо відповіді
        let response = await askQuestion(localeTexts[lang].askProfile, true);
        if (!response) { throw { code: 101, message: "User did not respond to profile screenshot." }; }
        answers.profileScreenshot = response.attachments.first();

        response = await askQuestion(localeTexts[lang].askEquipment, true);
        if (!response) { throw { code: 101, message: "User did not respond to equipment screenshot." }; }
        answers.equipmentScreenshot = response.attachments.first();

        response = await askQuestion(localeTexts[lang].askCommanders, true);
        if (!response) { throw { code: 101, message: "User did not respond to commanders screenshot." }; }
        answers.commanderScreenshot = response.attachments.first();

        response = await askQuestion(localeTexts[lang].askVIP, true);
        if (!response) { throw { code: 101, message: "User did not respond to VIP screenshot." }; }
        answers.vipScreenshot = response.attachments.first();

        response = await askQuestion(localeTexts[lang].askAge, false);
        if (!response) { throw { code: 101, message: "User did not respond to account age." }; }
        answers.age = response.content.trim();

        response = await askQuestion(localeTexts[lang].lastKVK, true);
        if (!response) { throw { code: 101, message: "User did not respond to last KvK screenshot." }; }
        answers.lastKVKresluts = response.attachments.first();

        logEvent("201", `Collected all answers from user ${userId}. Preparing embed...`);

        // Формуємо результатний Embed для адміністратора
        const resultEmbed = new EmbedBuilder()
            .setTitle("📨 Нова міграційна заява")
            .setColor(0x2ECC71);

        const filesToAttach = [];

        function addImageField(fieldName, attachment) {
            let fileName = attachment.name || "screenshot.png";
            filesToAttach.push(new AttachmentBuilder(attachment.url, { name: fileName }));
            resultEmbed.addFields({ name: fieldName, value: `📎 ${fileName}`, inline: false });
        }

        addImageField("Профіль", answers.profileScreenshot);
        addImageField("Командири", answers.commanderScreenshot);
        addImageField("Спорядження", answers.equipmentScreenshot);
        addImageField("VIP", answers.vipScreenshot);
        addImageField("Статистика мин. KvK", answers.lastKVKresluts);
        resultEmbed.addFields({ name: "Вік аккаунту", value: answers.age || "N/A", inline: true });
        resultEmbed.addFields({ name: "User ID", value: interaction.user.id, inline: false });
        resultEmbed.setFooter({ text: `User: ${interaction.user.tag}` });

        const adminChannel = await client.channels.fetch(ADMIN_CHANNEL_ID);
        await adminChannel.send({ embeds: [resultEmbed], files: filesToAttach });
        logEvent("202", `Sent application embed to admin channel for user ${userId}.`);

        const thanksMsg = await dmChannel.send(localeTexts[lang].thankYou);
        setTimeout(() => { thanksMsg.delete().catch(() => {}); }, 300000);
    }
    catch (err) {
        if (err && err.code === 101) {
            logEvent("101", `Session timed out for user ${userId} - ${err.message || 'No response'}`);
            try {
                const timeoutNotice = await interaction.user.send(localeTexts.en.timeoutMsg);
                setTimeout(() => { timeoutNotice.delete().catch(() => {}); }, 300000);
            } catch {}
        } else if (err && err.code === 102) {
            logEvent("102", `Failed to send embed to admin channel for user ${userId} - ${err.message || err}`);
            try {
                await interaction.user.send(localeTexts.en.dmError);
            } catch {}
        } else if (err && err.message === "Cannot send messages to this user") {
            logEvent("100", `Cannot DM user ${userId}. Possibly has DMs closed.`);
            await interaction.reply({ content: localeTexts.en.dmError, ephemeral: true });
        } else {
            console.error("Unexpected error in application flow:", err);
            logEvent("ERROR", `Unexpected error for user ${userId}: ${err.message || err}`);
            try {
                await interaction.user.send("❌ An unexpected error occurred. Please contact an administrator.");
            } catch {}
        }
    }
    finally {
        activeSessions.delete(userId);
    }
}

client.login(TOKEN);
