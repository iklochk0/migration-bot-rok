const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Завантаження команд із папки commands
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    if (command.data && command.execute) {
        client.commands.set(command.data.name, command);
    } else {
        console.warn(`[WARNING] The command in file ${file} is missing required properties.`);
    }
});

// Обробка взаємодій (slash-команд)
client.on(Events.InteractionCreate, async interaction => {
    try {
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;
            await command.execute(interaction);
        } else {
            // Для взаємодій, наприклад, кнопок або модальних форм,
            // припускаємо, що вони стосуються команди "apply"
            const command = client.commands.get('apply');
            if (command && command.handleInteraction) {
                await command.handleInteraction(interaction);
            }
        }
    } catch (error) {
        console.error('Error processing interaction:', error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: '❌ Error processing interaction!', ephemeral: true });
        } else {
            await interaction.followUp({ content: '❌ Error processing interaction!', ephemeral: true });
        }
    }
});

client.on(Events.MessageCreate, async message => {
    const command = client.commands.get('apply');
    if (command && command.handleMessage) {
        await command.handleMessage(message);
    }
});

client.login(TOKEN);