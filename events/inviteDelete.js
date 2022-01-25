module.exports = async(client, invite) => {
    await client.db.joins.deleteMany({
        joinCode: invite.code
    });
    const roles = await client.db.roles.find({
        guildId: invite.guild.id,
    }).sort({
        uses: -1
    });
    if (!roles.length) return;
    const inviteInfo = await client.db.invites.findOne({
        code: invite.code
    })
    const userInvites = await client.db.invites.find({
        guildId: invite.guild.id,
        authorId: inviteInfo.authorId
    });
    let totalUses = 0;
    if (userInvites.length) {
        totalUses = userInvites.map(i => i.bonus).reduce((acc, cur) => acc + cur);
        for (const each of userInvites) {
            const joinsData = await client.db.joins.find({
                joinCode: each.code,
            });
            if (!joinsData.length) continue;
            const totalJoins = joinsData.filter(join => !join.self && !join.fake).length;
            totalUses += totalJoins;
        };
    }
    let avaliableRoles = roles.filter(role => role.uses <= totalUses)
    if (!avaliableRoles.length) return;
    avaliableRoles = avaliableRoles.map(role => role.roleId);
    const guild = client.guilds.cache.get(invite.guild.id);
    const inviterMember = await guild.members.fetch(invite.inviter.id).catch(() => null);
    if (!inviterMember) return;
    avaliableRoles.forEach(async role => {
        const roleObj = await guild.roles.fetch(role).catch(() => null)
        if (!roleObj || !roleObj.editable) return;
        if (inviterMember._roles.includes(role)) return;
        inviterMember.roles.add(role);
    });
    const alreadyHavedRoles = inviterMember._roles.filter(role => avaliableRoles.includes(role));
    if (!alreadyHavedRoles.length) return;
    alreadyHavedRoles.forEach(async role => {
        const roleObj = await guild.roles.fetch(role).catch(() => null)
        if (!roleObj || !roleObj.editable) return;
        if (!inviterMember._roles.includes(role)) return;
        const requiredUses = roles.find(r => r.roleId === role).uses;
        if (requiredUses > totalUses) inviterMember.roles.remove(role);
    });
    await client.db.invites.findOneAndDelete({
        code: invite.code
    });
};