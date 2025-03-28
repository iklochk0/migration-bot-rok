const { 
    SlashCommandBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    EmbedBuilder 
} = require('discord.js');

module.exports.data = new SlashCommandBuilder()
    .setName('apply')
    .setDescription('Submit migration application');

module.exports.execute = async (interaction) => {
    const requirementsEmbed = new EmbedBuilder()
        .setTitle('📋 Migration Requirements')
        .setDescription(
            "**9-digit ID:**\n" +
            "• 1B+ KP, 5M+ deaths\n" +
            "• 2 full marches (4 cmdrs)\n" +
            "• 1 gold set, 1 expertise\n" +
            "• VIP 14+\n\n" +
            "**8-digit ID:**\n" +
            "• 2.2B+ KP, 10M+ deaths\n" +
            "• 3 full marches (6 cmdrs)\n" +
            "• 2 gold sets, 2 expertises\n" +
            "• VIP 15+\n\n" +
            "❗ False or incomplete info = auto reject."
        )
        .setColor(0x2ECC71);

    const openFormButton = new ButtonBuilder()
        .setCustomId('apply_openForm')
        .setLabel('📥 Apply')
        .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(openFormButton);

    await interaction.reply({
        content: 'Click the button below to start your migration application:',
        embeds: [requirementsEmbed],
        components: [row],
        ephemeral: true
    });
};

module.exports.handleInteraction = async (interaction) => {
    if (interaction.isButton() && interaction.customId === 'apply_openForm') {
        const modal = new ModalBuilder()
            .setCustomId('apply_formModal')
            .setTitle('Migration Application');

        const playerIdInput = new TextInputBuilder()
            .setCustomId('playerId')
            .setLabel('Your Player ID')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('e.g., 123456789')
            .setRequired(true);
            
        const kpInput = new TextInputBuilder()
            .setCustomId('kp')
            .setLabel('Your Kill Points (KP)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('e.g., 1B')
            .setRequired(true);
            
        const playerDeadsInput = new TextInputBuilder()
            .setCustomId('playerDeads')
            .setLabel('Your Dead Troops')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('e.g., 10m')
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(playerIdInput),
            new ActionRowBuilder().addComponents(kpInput),
            new ActionRowBuilder().addComponents(playerDeadsInput)
        );

        await interaction.showModal(modal);
    }
    else if (interaction.isModalSubmit() && interaction.customId === 'apply_formModal') {
        const playerId = interaction.fields.getTextInputValue('playerId');
        const kp = interaction.fields.getTextInputValue('kp');
        const kp = interaction.fields.getTextInputValue('playerDeadsInput');

        // Тут можна додати додаткову логіку (наприклад, пересилання заявки в адмін-канал)
        await interaction.reply({ content: '✅ Your application has been submitted!', ephemeral: true });
    }
};