const { Collection } = require("discord.js");
const cooldowns = new Collection();

module.exports = async(client, message) => {
    if (!Boolean(message.content)) return;
    if (message.author.bot) return;
    if (!client.finished) return;
    
    let prefix;
    let setting;

    if (message.channel.type === "DM") {
        prefix = client.config.prefix
    } else {
        setting = await client.db.guilds.findOne({
            guildID: message.guild.id
        });
        if (!setting) {
            const dbguilds = client.db.guilds;
            setting = new dbguilds({
                guildID: message.guild.id
            });
            await setting.save();
            prefix = setting.prefix;
        } else {
            prefix = setting.prefix;
        }
        if (!message.channel.permissionsFor(message.guild.me).has('SEND_MESSAGES')) return;
    };
    const escapeRegex = str => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const prefixRegex = new RegExp(`^(<@!?${client.user.id}>|${escapeRegex(prefix)})\\s*`);


    if (!prefixRegex.test(message.content)) return;
    const [, matchedPrefix] = message.content.match(prefixRegex);

    let execute = message.content.slice(matchedPrefix.length).trim();
    if (!execute) {
        const prefixMention = new RegExp(`^<@!?${client.user.id}>( |)$`);
        if (prefixMention.test(matchedPrefix)) {
            return message.channel.send(`Use ${prefix}help to display help.`).then(m => {
                setTimeout(() => {
                    if (m.deletable) m.delete()
                }, 5000);
            });
        } else {
            return;
        };
    };
    let args = execute.split(/ +/g);
    let cmd = args.shift().toLowerCase();
    let sender = message.author;

    message.flags = []
    while (args[0] && args[0][0] === "-") {
        message.flags.push(args.shift().slice(1));
    };


    let commandFile = client.commands.get(cmd) || client.commands.get(client.aliases.get(cmd));
    if (!commandFile) return;


    if (message.channel.type === "DM" && commandFile.guildOnly) return message.reply(`This command can not be executed inside DMs!`);


    if (commandFile.userPerms && message.channel.type !== "DM" && commandFile.userPerms.length) {
        if (!message.member.permissions.has(commandFile.userPerms)) {
            return message.channel.send(`Insufficient permission! Are you a mod? You are missing the following permission: ${commandFile.userPerms.map(x => `\`${x}\``).join(" and ")}`);
        };
    };
    if (commandFile.channelPerms && message.channel.type !== 'DM' && commandFile.channelPerms.length) {
        if (!message.channel.permissionsFor(message.guild.me).has(commandFile.channelPerms)) {
            return message.channel.send(`Missing the following permission in this channel (${message.channel.toString()}) to execute that command: ${commandFile.channelPerms.map(x => `\`${x}\``).join(" and ")}`);
        };
    }
    if (commandFile.clientPerms && message.channel.type !== "DM" && commandFile.clientPerms.length) {
        if (!message.guild.me.permissions.has(commandFile.clientPerms)) {
            return message.channel.send(`Missing the following permission to execute that command globally: ${commandFile.clientPerms.map(x => `\`${x}\``).join(" and ")}`)
        };
    };
    if (!cooldowns.has(commandFile.name)) cooldowns.set(commandFile.name, new Collection());

    const cooldownID = message.channel.type === "DM" ? message.author.id : message.author.id + message.guild.id;

    const now = Date.now();
    const timestamps = cooldowns.get(commandFile.name);
    const cooldownAmount = (commandFile.cooldown || 3) * 1000;

    if (!timestamps.has(cooldownID)) {
        timestamps.set(cooldownID, now);
    } else {
        const expirationTime = timestamps.get(cooldownID) + cooldownAmount;

        if (now < expirationTime) {
            return message.reply({ content: `You are in cooldown! Please wait **${timeLeft.toFixed(1)}** seconds before continuing.`})
        };
        timestamps.set(cooldownID, now);
        setTimeout(() => timestamps.delete(cooldownID), cooldownAmount);
    };

    try {
        commandFile.run(client, message, args, prefix, cmd);
        console.log(`${sender.tag} (${sender.id}) from ${message.channel.type === 'DM' ? 'DM' : `${message.guild.name} (${message.guild.id})`} ran a command: ${prefix}${cmd}`);
    } catch (error) {
        message.channel.send(`There was an error while executing that command! Error message: \`${error.message}\``);
        console.error('Error while executing command:', error);
    };
};