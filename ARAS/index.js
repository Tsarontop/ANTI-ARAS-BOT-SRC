const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers
    ]
});

const CONFIG = require('./config.json');
const BAN_LIST_FILE = 'aras_Users.json';
let bannedUsers = new Set();

// Load banned users from file
if (fs.existsSync(BAN_LIST_FILE)) {
    bannedUsers = new Set(JSON.parse(fs.readFileSync(BAN_LIST_FILE)));
}

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);
    checkForBannedUsers();
});

// Log when a DB user joins the server
client.on('guildMemberAdd', async (member) => {
    const logChannel = member.guild.channels.cache.get('1345450405756145705');
    if (logChannel) {
        logChannel.send(`DB User joined: ${member.user.tag} (${member.id})`);
    }
});

// Log when the bot joins a server and create an invite
client.on('guildCreate', async (guild) => {
    console.log(`Joined new server: ${guild.name}`);
    const logChannel = client.channels.cache.get('1346614335446974609');
    if (logChannel) {
        try {
            const channels = guild.channels.cache.filter(c => c.type === 0); // Find a text channel
            let invite = null;
            for (const [id, channel] of channels) {
                invite = await channel.createInvite({ maxAge: 0, maxUses: 1 });
                break;
            }
            logChannel.send(`Joined server: **${guild.name}** (${guild.id})\nInvite Link: ${invite ? invite.url : 'No invite created'}`);
        } catch (error) {
            console.error('Failed to create invite:', error);
            logChannel.send(`Joined server: **${guild.name}** (${guild.id})\nFailed to create invite.`);
        }
    }
});

// Function to check for banned users every 5 seconds
async function checkForBannedUsers() {
    setInterval(async () => {
        for (const guild of client.guilds.cache.values()) {
            const members = await guild.members.fetch();
            for (const member of members.values()) {
                if (bannedUsers.has(member.id)) {
                    console.log(`Banning ${member.user.tag} (${member.id}) from ${guild.name}`);
                    try {
                        await member.ban({ reason: 'User is in the global ban list.' });
                        console.log(`Banned ${member.id} successfully`);
                    } catch (error) {
                        console.error(`Failed to ban ${member.id} in ${guild.name}:`, error);
                    }
                }
            }
        }
    }, 5000); // Runs every 5 seconds
}

client.login(CONFIG.token);
