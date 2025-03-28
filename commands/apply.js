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
    { key: 'playerId', question: 'Your Player ID:' },
    { key: 'kp', question: 'Your Kill Points (KP):' },
    { key: 'deads', question: 'Your Dead Troops:' },
    { key: 'marches', question: 'Number of Full Marches:' },
    { key: 'equipment', question: 'Number of Gold Equipment Sets:' },
    { key: 'vip', question: 'Your VIP Level:' },
    { key: 'commanders', question: 'Number of commanders with full or playable expertise (e.g., 5515 Jeanne Prime, 5551 Hermann Prime):' }
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
        content: 'Click the button to start your migration application:',
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
                await interaction.reply({ content: '⚠️ An error occurred. Please try again.', ephemeral: true });
            } else {
                await interaction.followUp({ content: '⚠️ An error occurred. Please try again.', ephemeral: true });
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

    await message.delete().catch(() => {});

    if (application.step < questions.length) {
        const followUp = await message.channel.send(`<@${message.author.id}> ${questions[application.step].question}`);
        setTimeout(() => followUp.delete().catch(() => {}), 15000);
    } else {
        const adminChannel = message.client.channels.cache.get(process.env.ADMIN_CHANNEL_ID);

        const embed = new EmbedBuilder()
            .setTitle('📋 New Migration Application')
            .setColor(0x2ECC71)
            .setTimestamp()
            .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL() });

        questions.forEach(q => {
            embed.addFields({ name: q.question, value: application.answers[q.key] || 'N/A' });
        });

        await adminChannel.send({ embeds: [embed] });
        await message.channel.send('✅ Your application has been successfully submitted!').then(m => setTimeout(() => m.delete().catch(() => {}), 15000));
        userApplications.delete(message.author.id);
    }
};