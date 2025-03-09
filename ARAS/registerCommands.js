// registerCommands.js
const { SlashCommandBuilder } = require("discord.js");
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const CONFIG = require('./config.json');

async function registerCommands() {
    try {
        const commands = [
            new SlashCommandBuilder()
                .setName("db-add")
                .setDescription("Adds a user to the global ban list.")
                .addStringOption(option =>
                    option.setName("user_id")
                        .setDescription("The Discord user ID to ban globally.")
                        .setRequired(true)
                ),
            new SlashCommandBuilder()
                .setName("db-remove")
                .setDescription("Removes a user from the global ban list.")
                .addStringOption(option =>
                    option.setName("user_id")
                        .setDescription("The Discord user ID to remove from the ban list.")
                        .setRequired(true)
                )
        ].map(command => command.toJSON());

        const rest = new REST({ version: '10' }).setToken(CONFIG.token);
        await rest.put(Routes.applicationCommands(CONFIG.client_id), { body: commands });

        console.log("✅ Slash commands registered.");
    } catch (error) {
        console.error("❌ Error registering commands:", error);
    }
}

module.exports = { registerCommands };
