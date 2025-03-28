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
    { key: 'playerId', question: 'Your Player ID:' },
    { key: 'killPoints', question: 'Your Kill Points (e.g., 1.2B):' },
    { key: 'deadTroops', question: 'Your Dead Troops (e.g., 10M):' },
    { key: 'vipLevel', question: 'Your VIP level:' },
    { key: 'fullMarches', question: 'Number of full marches (each with 2 commanders):' },
    { key: 'equipmentSets', question: 'Number of full gold equipment sets:' },
    { key: 'expertiseCommanders', question: 'Number of commanders with full or playable expertise (e.g., 5515 Jeanne Prime, 5551 Hermann Prime):' },
    { key: 'screenshots', question: 'Please upload screenshots of your profile and commanders:' },
];

module.exports.data = new SlashCommandBuilder()
    .setName('apply')
    .setDescription('Submit migration application');

module.exports.execute = async (interaction) => {
    const embed = new EmbedBuilder()
        .setTitle('📋 Migration Requirements')
        .setDescription(
            '**9-digit ID:**\n' +
            '• 1B+ KP, 5M+ deaths\n' +
            '• 2 full marches (4 cmdrs)\n' +
            '• 1 gold set, 1 expertise\n' +
            '• VIP 14+\n\n' +
            '**8-digit ID:**\n' +
            '• 2.2B+ KP, 10M+ deaths\n' +
            '• 3 full marches (6 cmdrs)\n' +
            '• 2 gold sets, 2 expertises\n' +
            '• VIP 15+\n\n' +
            '❗ False or incomplete info = auto reject.'
        )
        .setColor(0x2ECC71);

    const button = new ButtonBuilder()
        .setCustomId('apply_start')
        .setLabel('📥 Apply')
        .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(button);

    await interaction.reply({
        content: 'Click the button to start your application:',
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

    const first = await dm.send(
        "Let's begin your migration application. Please answer the following questions.\n" +
        '*This conversation will auto-delete in 5 minutes per step to keep things clean.*\n' +
        questions[0].question
    );

    setTimeout(() => {
        if (first.deletable) first.delete().catch(() => {});
    }, 5 * 60 * 1000);
};

module.exports.handleMessage = async (message) => {
    if (message.author.bot || message.channel.type !== 1) return; // Ensure it's a DM

    const userId = message.author.id;
    const state = userStates.get(userId);
    if (!state) return;

    const step = state.step;
    const currentKey = questions[step].key;

    if (currentKey === 'screenshots') {
        if (message.attachments.size === 0) {
            await message.reply('Please upload at least one screenshot.');
            return;
        }
        state.answers[currentKey] = message.attachments.map(a => a.url);
    } else {
        state.answers[currentKey] = message.content.trim();
    }

    const deleteAfter = (msg) => setTimeout(() => msg.deletable && msg.delete().catch(() => {}), 5 * 60 * 1000);
    deleteAfter(message);

    state.step++;

    if (state.step < questions.length) {
        const next = await message.author.send(questions[state.step].question);
        deleteAfter(next);
    } else {
        userStates.delete(userId);

        const fields = Object.entries(state.answers)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
            .join('\n');

        const embed = new EmbedBuilder()
            .setTitle('📝 New Migration Application')
            .setDescription(fields)
            .setColor(0x3498DB)
            .setFooter({ text: `User ID: ${userId}` });

        if (adminChannelId) {
            const adminChannel = await message.client.channels.fetch(adminChannelId).catch(() => null);
            if (adminChannel?.isTextBased()) {
                await adminChannel.send({ embeds: [embed] });
            }
        }

        const logEntry = `[${new Date().toISOString()}] ${message.author.tag} (${userId}):\n${fields}\n\n`;
        fs.appendFile(logFilePath, logEntry, err => err && console.error('Log write error:', err));

        await message.author.send('✅ Your application has been submitted. Thank you!');
    }
};