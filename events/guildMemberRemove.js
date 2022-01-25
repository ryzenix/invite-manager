module.exports = async(client, member) => {
    const joinData = await client.db.joins.findOne({
        userId: member.user.id,
        guildId: member.guild.id,
    });
    if (!joinData) return;
    const inviteData = await client.db.invites.findOne({
        code: joinData.joinCode
    });
    if (!inviteData) return;
    inviteData.leaves += 1;
    await inviteData.save();
    await client.db.joins.findOneAndDelete({
        userId: member.user.id,
        guildId: member.guild.id,
    });
    const roles = await client.db.roles.find({
        guildId: member.guild.id,
    }).sort({
        uses: -1
    });
    if (!roles.length) return;
    const userInvites = await client.db.invites.find({
        guildId: member.guild.id,
        authorId: inviteData.authorId
    });
    let totalUses = 0;
    if (userInvites.length) {
        totalUses = userInvites.map(i => i.bonus).reduce((acc, cur) => acc + cur);
        for (const invite of userInvites) {
            const joinsData = await client.db.joins.find({
                joinCode: invite.code,
            });
            if (!joinsData.length) continue;
            const totalJoins = joinsData.filter(join => !join.self && !join.fake).length;
            totalUses += totalJoins;
        }
    }
    let avaliableRoles = roles.filter(role => role.uses <= totalUses)
    if (!avaliableRoles.length) return;
    avaliableRoles = avaliableRoles.map(role => role.roleId);
    const inviteMember = await member.guild.members.fetch(userId).catch(() => null);
    if (!inviteMember) return;
    avaliableRoles.forEach(async role => {
        const roleObj = await member.guild.roles.fetch(role).catch(() => null);
        if (!roleObj || !roleObj.editable) return;
        if (inviteMember._roles.includes(role)) return;
        inviteMember.roles.add(roleObj);
    });
    const alreadyHavedRoles = inviteMember._roles.filter(role => avaliableRoles.includes(role));
    if (!alreadyHavedRoles.length) return;
    alreadyHavedRoles.forEach(async role => {
        const roleObj = await member.guild.roles.fetch(role).catch(() => null)
        if (!roleObj || !roleObj.editable) return;
        const requiredUses = roles.find(r => r.roleId === role).uses;
        if (requiredUses > totalUses) inviteMember.roles.remove(roleObj);
    })
};