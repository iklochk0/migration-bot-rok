const { 
    SlashCommandBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    EmbedBuilder 
} = require('discord.js');
const fs = require('fs');
const path = require('path');

const userStates = new Map();
const adminChannelId = process.env.ADMIN_CHANNEL_ID;
const logFilePath = path.join(__dirname, '../logs/applications.log');

const questions = [
    { key: 'Account Screenshots', question: 'Upload a screenshot of your account (showing Player ID and Kill Points):' },
    { key: 'VIP Screenshot', question: 'Upload a screenshot of your VIP level:' },
    { key: 'Commanders Screenshots', question: 'Upload a screenshot showing your full marches and combat-ready commanders (with proper skills):' },
    { key: 'Equipment Screenshots', question: 'Upload screenshots of your equipment and armaments:' },
];

module.exports.data = new SlashCommandBuilder()
    .setName('apply')
    .setDescription('Submit migration application');

module.exports.execute = async (interaction) => {
    const embed = new EmbedBuilder()
        .setTitle('📋 KVK3 Migration Requirements')
        .setDescription(
            '• 200k+ KP, 800k+ deaths\n' +
            '• 1 full march\n' +
            '• VIP 12+\n\n' +
            //"KVK 5\n" +
            //'**9-digit ID:**\n' +
            //'• 1B+ KP, 5M+ deaths\n' +
            //'• 2 full marches (4 cmdrs)\n' +
            //'• 1 gold set, 1 expertise\n' +
            //'• VIP 14+\n\n' +
            //'**8-digit ID:**\n' +
            //'• 2.2B+ KP, 10M+ deaths\n' +
            //'• 3 full marches (6 cmdrs)\n' +
            //'• 2 gold sets, 2 expertises\n' +
            //'• VIP 15+\n\n' +
            '❗ False or incomplete info = auto reject.'
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
};

module.exports.handleInteraction = async (interaction) => {
    if (!interaction.isButton() || interaction.customId !== 'apply_start') return;

    const userId = interaction.user.id;
    const dm = await interaction.user.createDM();

    userStates.set(userId, { step: 0, answers: {} });

    const message = await dm.send(
        "Let's begin your migration application. Please answer the following questions.\n*This conversation will auto-delete in 5 minutes per step to keep things clean.*\n" +
        questions[0].question
    );

    setTimeout(() => {
        if (message.deletable) message.delete().catch(() => {});
    }, 5 * 60 * 1000);
};

module.exports.handleMessage = async (message) => {
    if (message.author.bot) return;
    const userId = message.author.id;
    const state = userStates.get(userId);

    if (!state) return;

    const step = state.step;
    const key = questions[step].key;

    if (message.attachments.size === 0) {
        await message.reply('Please upload a screenshot.');
        return;
    }
    state.answers[key] = message.attachments.map(a => a.url);

    const prevMsg = message;
    setTimeout(() => {
        if (prevMsg.deletable) prevMsg.delete().catch(() => {});
    }, 5 * 60 * 1000);

    state.step++;

    if (state.step < questions.length) {
        const nextQuestion = questions[state.step].question;
        const msg = await message.author.send(nextQuestion);
        setTimeout(() => {
            if (msg.deletable) msg.delete().catch(() => {});
        }, 5 * 60 * 1000);
    } else {
        userStates.delete(userId);

        const fields = Object.entries(state.answers).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join('\n');
        const embed = new EmbedBuilder()
            .setTitle('📝 New Migration Application')
            .setDescription(fields)
            .setColor(0x3498DB)
            .setFooter({ text: `User ID: ${userId}` });

        if (adminChannelId) {
            const adminChannel = await message.client.channels.fetch(adminChannelId).catch(() => null);
            if (adminChannel && adminChannel.isTextBased()) {
                await adminChannel.send({ embeds: [embed] });
            }
        }

        const logLine = `[${new Date().toISOString()}] ${message.author.tag} (${userId}):\n${fields}\n\n`;
        fs.appendFile(logFilePath, logLine, err => {
            if (err) console.error('Failed to write log:', err);
        });

        await message.author.send('✅ Your application has been submitted. Thank you!');
    }
};