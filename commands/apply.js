const {
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder
} = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

const userApplications = new Map();

const questions = [
    { key: 'playerId', question: 'Your Player ID:' },
    { key: 'kp', question: 'Your Kill Points (KP):' },
    { key: 'deads', question: 'Your Dead Troops:' },
    { key: 'marches', question: 'Number of Full Marches:' },
    { key: 'equipment', question: 'Number of Gold Equipment Sets:' },
    { key: 'vip', question: 'Your VIP Level:' },
    { key: 'commanders', question: 'Number of commanders with full or playable expertise (e.g., 5515 Jeanne Prime, 5551 Hermann Prime):' }
];

const logPath = path.join(__dirname, '../logs');
if (!fs.existsSync(logPath)) fs.mkdirSync(logPath);

function logApplication(username, answers) {
    const logEntry = `User: ${username}\n` + questions.map(q => `${q.key}: ${answers[q.key]}`).join('\n') + `\nTime: ${new Date().toISOString()}\n\n`;
    const logFile = path.join(logPath, 'applications.log');
    fs.appendFileSync(logFile, logEntry);
}

module.exports.data = new SlashCommandBuilder()
    .setName('apply')
    .setDescription('Submit migration application');

module.exports.execute = async (interaction) => {
    const applyButton = new ButtonBuilder()
        .setCustomId('start_application')
        .setLabel('📥 Apply')
        .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(applyButton);

    await interaction.reply({
        content: 'Click the button to start your migration application:',
        components: [row],
        ephemeral: true
    });
};

module.exports.handleInteraction = async (interaction) => {
    if (interaction.isButton() && interaction.customId === 'start_application') {
        try {
            const dm = await interaction.user.createDM();

            userApplications.set(interaction.user.id, {
                step: 0,
                answers: {},
                channelId: dm.id
            });

            const introMessage = await dm.send("Let's begin your migration application. Please answer the following questions.\n_This conversation will auto-delete in 5 minutes per step to keep things clean._");
            setTimeout(() => introMessage.delete().catch(() => {}), 300000);

            const questionMsg = await dm.send(questions[0].question);
            setTimeout(() => questionMsg.delete().catch(() => {}), 300000);

            await interaction.reply({
                content: '📬 Check your DMs to complete the application.',
                ephemeral: true
            });
        } catch (err) {
            console.error('❌ Could not send DM:', err);
            await interaction.reply({
                content: '❌ I can’t message you. Please enable Direct Messages in your privacy settings and try again.',
                ephemeral: true
            });
        }
    }
};

module.exports.handleMessage = async (message) => {
    try {
        if (message.author.bot || message.channel.type !== 1) return; // DM only

        const application = userApplications.get(message.author.id);
        if (!application) return;

        const currentQuestion = questions[application.step];
        application.answers[currentQuestion.key] = message.content.trim();
        application.step++;

        setTimeout(() => message.delete().catch(() => {}), 300000);

        if (application.step < questions.length) {
            const next = await message.channel.send(questions[application.step].question);
            setTimeout(() => next.delete().catch(() => {}), 300000);
        } else {
            const adminChannel = message.client.channels.cache.get(process.env.ADMIN_CHANNEL_ID);
            if (!adminChannel) {
                console.error('❌ Admin channel not found. Check ADMIN_CHANNEL_ID');
                await message.channel.send('❌ Internal error: Admin channel not found. Please contact staff.');
                userApplications.delete(message.author.id);
                return;
            }

            const embed = new EmbedBuilder()
                .setTitle('📋 New Migration Application')
                .setColor(0x2ECC71)
                .setTimestamp()
                .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL() });

            questions.forEach(q => {
                embed.addFields({ name: q.question, value: application.answers[q.key] || 'N/A' });
            });

            await adminChannel.send({ embeds: [embed] });
            logApplication(message.author.tag, application.answers);

            await message.channel.send('✅ Your application has been successfully submitted. This message will remain.');
            userApplications.delete(message.author.id);
        }
    } catch (err) {
        console.error('❌ Error handling message:', err);
    }
};
