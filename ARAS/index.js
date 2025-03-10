const { Client, GatewayIntentBits, ActivityType, EmbedBuilder } = require("discord.js");
const fs = require("fs");

const CONFIG = require("./config.json");
const BAN_LIST_FILE = "aras_Users.json";

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

// Load banned users from file
let bannedUsers = new Set();
if (fs.existsSync(BAN_LIST_FILE)) {
    try {
        bannedUsers = new Set(JSON.parse(fs.readFileSync(BAN_LIST_FILE, "utf8")));
    } catch (err) {
        console.error("❌ Error reading ban list file:", err);
    }
}

// Log bot startup
client.once("ready", async () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
    rotateStatus();
    monitorGuilds();
});

// Save banned users to file
function saveBanList() {
    try {
        fs.writeFileSync(BAN_LIST_FILE, JSON.stringify([...bannedUsers], null, 2));
    } catch (err) {
        console.error("❌ Failed to save ban list:", err);
    }
}

// Log bans in Discord
async function logBan(member, guild) {
    const logChannel = client.channels.cache.get(CONFIG.logChannels.banLogs);
    if (!logChannel) return;

    const embed = new EmbedBuilder()
        .setTitle("🚨 Global Ban Alert")
        .setColor("#ff0000")
        .addFields(
            { name: "User", value: `${member.user.tag} (${member.id})`, inline: true },
            { name: "Server", value: guild.name, inline: true },
            { name: "Reason", value: "User is in the global ban list.", inline: false },
            { name: "Timestamp", value: `<t:${Math.floor(Date.now() / 1000)}>`, inline: false }
        )
        .setFooter({ text: "ARAS LOGS | discord.gg/ranls", iconURL: client.user.displayAvatarURL() });

    logChannel.send({ embeds: [embed] });
}

// Periodically check for banned users
async function monitorGuilds() {
    setInterval(async () => {
        for (const guild of client.guilds.cache.values()) {
            const members = await guild.members.fetch();
            for (const member of members.values()) {
                if (bannedUsers.has(member.id)) {
                    try {
                        await member.ban({ reason: "User is in the global ban list." });
                        await logBan(member, guild);
                        await member.send(`🚫 You have been banned from ${guild.name} for being in the global ban list.`);
                    } catch (error) {
                        console.error(`❌ Failed to ban ${member.user.tag} in ${guild.name}:`, error);
                    }
                }
            }
        }
    }, 10000);
}

// Slash command handler
client.on("interactionCreate", async (interaction) => {
    if (!interaction.isCommand()) return;

    const { commandName, options } = interaction;
    if (!CONFIG.allowedUserIds.includes(interaction.user.id)) {
        return interaction.reply({ content: "❌ You don’t have permission to use this command.", ephemeral: true });
    }

    if (commandName === "db-add") {
        const userId = options.getString("user_id");
        if (bannedUsers.has(userId)) return interaction.reply({ content: "⚠️ User is already banned.", ephemeral: true });

        bannedUsers.add(userId);
        saveBanList();
        interaction.reply(`✅ User ${userId} has been added to the ban list.`);
    }

    if (commandName === "db-remove") {
        const userId = options.getString("user_id");
        if (!bannedUsers.has(userId)) return interaction.reply({ content: "⚠️ User is not in the ban list.", ephemeral: true });

        bannedUsers.delete(userId);
        saveBanList();
        interaction.reply(`✅ User ${userId} has been removed from the ban list.`);
    }

    if (commandName === "db-create") {
        if (fs.existsSync(BAN_LIST_FILE)) return interaction.reply({ content: "⚠️ Ban list already exists.", ephemeral: true });

        fs.writeFileSync(BAN_LIST_FILE, JSON.stringify([], null, 2));
        bannedUsers = new Set();
        interaction.reply("✅ Ban list has been created.");
    }
});

// Rotate bot status
function rotateStatus() {
    let index = 0;
    const statuses = [
        () => ({ name: `🌍 ${client.guilds.cache.size} servers`, type: ActivityType.Watching }),
        () => ({ name: `🚫 ${bannedUsers.size} users banned`, type: ActivityType.Watching })
    ];

    setInterval(() => {
        client.user.setPresence({ activities: [statuses[index % statuses.length]()], status: "online" });
        index++;
    }, 10000);

    const statusChannel = client.channels.cache.get(CONFIG.logChannels.botStatus);
    if (statusChannel) statusChannel.send("✅ Bot status rotation started.");
}

// Start the bot
client.login(CONFIG.token);
