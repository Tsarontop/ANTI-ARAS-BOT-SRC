const { Client, GatewayIntentBits, ActivityType, EmbedBuilder } = require("discord.js");
const fs = require("fs");
require("dotenv").config();
const { registerCommands } = require('./registerCommands');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

const CONFIG = require("./config.json");
const BAN_LIST_FILE = "aras_Users.json";
let bannedUsers = new Set(fs.existsSync(BAN_LIST_FILE) ? JSON.parse(fs.readFileSync(BAN_LIST_FILE)) : []);

client.once("ready", async () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
    setTimeout(startStatusRotation, 5000);
    checkForBannedUsers();
    await registerCommands();  // Register slash commands after bot is ready
});

// 🛠️ **Helper Function: Save Ban List**
function saveBanList() {
    fs.writeFileSync(BAN_LIST_FILE, JSON.stringify([...bannedUsers], null, 2));
}

// 🚨 **Embed Logging for Bans**
async function logBan(member, guild) {
    const logChannel = client.channels.cache.get("1346614335446974609"); // Replace with your log channel ID
    if (!logChannel) return;

    const embed = new EmbedBuilder()
        .setTitle("🚨 ANTI ARAS BAN DETECTED 🚨")
        .setColor("#ff0000")
        .addFields(
            { name: "👤 Username", value: `${member.user.tag} (${member.id})`, inline: true },
            { name: "🏠 Server", value: guild.name, inline: true },
            { name: "📜 Reason", value: "User is in the global ban list.", inline: false },
            { name: "🕒 Timestamp", value: `<t:${Math.floor(Date.now() / 1000)}>`, inline: false }
        )
        .setFooter({ text: "ServerProtector+ Logs", iconURL: client.user.displayAvatarURL() });

    logChannel.send({ embeds: [embed] });
}

// 🛑 **Check for Banned Users Periodically**
async function checkForBannedUsers() {
    setInterval(async () => {
        for (const guild of client.guilds.cache.values()) {
            const members = await guild.members.fetch();
            for (const member of members.values()) {
                if (bannedUsers.has(member.id)) {
                    console.log(`🔨 Banning ${member.user.tag} (${member.id}) from ${guild.name}`);

                    try {
                        await member.ban({ reason: "User is in the global ban list." });
                        await logBan(member, guild);

                        // DM user
                        await member.send(`🚫 **You have been banned from ${guild.name}**\nReason: You are in the global ban list.`);
                        console.log(`📩 Sent ban DM to ${member.user.tag}`);
                    } catch (error) {
                        console.error(`❌ Failed to ban ${member.id} in ${guild.name}:`, error);
                    }
                }
            }
        }
    }, 5000);
}

// ✅ **Slash Command: `/db-add <user_id>`**
client.on("interactionCreate", async (interaction) => {
    if (!interaction.isCommand()) return;

    const { commandName, options } = interaction;

    // List of allowed user IDs
    const allowedUserIds = ["1307650846888169483", "1170112690279165974"];

    // Check if the user is allowed to use the command
    if (!allowedUserIds.includes(interaction.user.id)) {
        return interaction.reply({
            content: "❌ You do not have permission to use this command.",
            ephemeral: true
        });
    }

    if (commandName === "db-add") {
        const userId = options.getString("user_id");

        if (bannedUsers.has(userId)) {
            return interaction.reply({ content: `⚠️ **User ${userId} is already in the ban list.**`, ephemeral: true });
        }

        bannedUsers.add(userId);
        saveBanList();
        interaction.reply(`✅ **User ${userId} has been added to the global ban list.**`);
    }

    if (commandName === "db-remove") {
        const userId = options.getString("user_id");

        if (!bannedUsers.has(userId)) {
            return interaction.reply({ content: `⚠️ **User ${userId} is not in the ban list.**`, ephemeral: true });
        }

        bannedUsers.delete(userId);
        saveBanList();
        interaction.reply(`✅ **User ${userId} has been removed from the global ban list.**`);
    }
});

// 🔄 **Rotating Bot Status**
function startStatusRotation() {
    let index = 0;
    const statuses = [
        () => ({ name: `🌍 In ${client.guilds.cache.size} servers`, type: ActivityType.Watching }),
        () => ({ name: `🚫 ${bannedUsers.size} users banned`, type: ActivityType.Watching })
    ];

    setInterval(() => {
        const status = statuses[index % statuses.length]();
        client.user.setPresence({ activities: [status], status: "online" });
        index++;
    }, 10000);
}

// 🔑 **Login Bot**
client.login(CONFIG.token);
