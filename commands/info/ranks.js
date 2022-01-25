const { MessageEmbed } = require('discord.js');

exports.run = async(client, message, args, prefix) => {
    const results = await client.db.roles.find({
        guildId: message.guild.id
    }).sort({
        uses: -1
    });
    if (!results.length) return message.channel.send(`No invite ranks was created on the server yet. To create one, use \`${prefix}create-rank <number of uses> <role mention or role name>\`.`);
    const embed = new MessageEmbed()
    .setAuthor({ name: `All avaliable rank on ${message.guild.name}`, iconURL: message.guild.iconURL({ dynamic: true, size: 1024 }) })
    .setDescription(results.map((r, i) => `${i + 1}. <@&${r.roleId}> ${r.uses} uses required`).join('\n'))
    .setTimestamp()
    return message.channel.send({embeds: [embed] });
};

exports.help = {
    name: "ranks",
    description: "Display all the avaliable ranks for inviting on the server",
    usage: ["ranks"],
    example: ["ranks"]
};

exports.conf = {
    aliases: [],
    cooldown: 3,
    guildOnly: true,
};