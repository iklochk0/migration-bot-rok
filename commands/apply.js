const {
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    AttachmentBuilder
} = require('discord.js');

const questions = [
    { key: 'playerId', question: 'Ваш Player ID:' },
    { key: 'kp', question: 'Ваші Kill Points (KP):' },
    { key: 'deads', question: 'Кількість ваших Dead Troops:' },
    { key: 'marches', question: 'Кількість Full Marches:' },
    { key: 'equipment', question: 'Кількість Gold Equipment Sets:' },
    { key: 'vip', question: 'Ваш VIP Level:' },
    { key: 'commanders', question: 'Кількість командирів з повною або іграбельною експертизою (наприклад: 5515 Жанна Прайм, 5551 Герман Прайм):' },
    { key: 'screenshots', question: 'Прикріпіть скріншоти профіля та командирів (до 5 файлів):', isAttachment: true }
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

const userApplications = {};

module.exports.handleInteraction = async (interaction) => {
    if (interaction.isButton() && interaction.customId === 'start_application') {
        userApplications[interaction.user.id] = { step: 0, answers: {} };
        await interaction.reply({ content: questions[0].question, ephemeral: true });
    }

    if (interaction.isMessageComponent()) return;

    if (interaction.channel.type === 1 || interaction.channel.type === 0) {
        const application = userApplications[interaction.author?.id];
        if (!application) return;

        const currentQuestion = questions[application.step];

        if (currentQuestion.isAttachment) {
            if (interaction.attachments.size === 0) {
                interaction.reply({ content: 'Будь ласка, прикріпіть зображення (до 5 файлів).', ephemeral: true });
                return;
            }
            application.answers[currentQuestion.key] = interaction.attachments.map(a => a.url);
        } else {
            application.answers[currentQuestion.key] = interaction.content;
        }

        application.step++;

        if (application.step < questions.length) {
            interaction.reply({ content: questions[application.step].question, ephemeral: true });
        } else {
            const adminChannel = interaction.client.channels.cache.get(process.env.ADMIN_CHANNEL_ID);

            const embed = new EmbedBuilder()
                .setTitle('📋 Нова заявка на міграцію')
                .setColor(0x2ECC71)
                .setTimestamp()
                .setFooter({ text: interaction.author.tag, iconURL: interaction.author.displayAvatarURL() });

            questions.forEach(q => {
                if (q.key !== 'screenshots') {
                    embed.addFields({ name: q.question, value: application.answers[q.key] });
                }
            });

            await adminChannel.send({ embeds: [embed] });

            if (application.answers.screenshots) {
                for (const screenshot of application.answers.screenshots) {
                    await adminChannel.send({ files: [new AttachmentBuilder(screenshot)] });
                }
            }

            interaction.reply({ content: '✅ Ваша заявка успішно відправлена!', ephemeral: true });
            delete userApplications[interaction.author.id];
        }
    }
};