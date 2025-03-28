const {
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    AttachmentBuilder
} = require('discord.js');

const userApplications = new Map();

const questions = [
    { key: 'playerId', question: 'Ваш Player ID:' },
    { key: 'kp', question: 'Ваші Kill Points (KP):' },
    { key: 'deads', question: 'Кількість ваших Dead Troops:' },
    { key: 'marches', question: 'Кількість Full Marches:' },
    { key: 'equipment', question: 'Кількість Gold Equipment Sets:' },
    { key: 'vip', question: 'Ваш VIP Level:' },
    { key: 'commanders', question: 'Кількість командирів з повною або іграбельною експертизою (наприклад: 5515 Жанна Прайм, 5551 Герман Прайм):' }
];

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
        content: 'Натисніть кнопку, щоб почати подачу заявки:',
        components: [row],
        ephemeral: true
    });
};

module.exports.handleInteraction = async (interaction) => {
    if (interaction.isButton() && interaction.customId === 'start_application') {
        try {
            userApplications.set(interaction.user.id, { step: 0, answers: {}, channel: interaction.channel });

            if (!interaction.deferred && !interaction.replied) {
                await interaction.reply({ content: questions[0].question, ephemeral: true });
            } else {
                await interaction.followUp({ content: questions[0].question, ephemeral: true });
            }
        } catch (err) {
            console.error('❌ handleInteraction error:', err);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: '⚠️ Сталася помилка. Спробуйте ще раз. 1', ephemeral: true });
            } else {
                await interaction.followUp({ content: '⚠️ Сталася помилка. Спробуйте ще раз. 2', ephemeral: true });
            }
        }
    }
};

module.exports.handleMessage = async (message) => {
    if (message.author.bot) return;

    const application = userApplications.get(message.author.id);
    if (!application) return;

    const currentQuestion = questions[application.step];
    application.answers[currentQuestion.key] = message.content;
    application.step++;

    if (application.step < questions.length) {
        await message.channel.send(`<@${message.author.id}> ${questions[application.step].question}`);
    } else {
        const adminChannel = message.client.channels.cache.get(process.env.ADMIN_CHANNEL_ID);

        const embed = new EmbedBuilder()
            .setTitle('📋 Нова заявка на міграцію')
            .setColor(0x2ECC71)
            .setTimestamp()
            .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL() });

        questions.forEach(q => {
            embed.addFields({ name: q.question, value: application.answers[q.key] || 'N/A' });
        });

        await adminChannel.send({ embeds: [embed] });
        await message.channel.send('✅ Ваша заявка успішно відправлена!');
        userApplications.delete(message.author.id);
    }
};