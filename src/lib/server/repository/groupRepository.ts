import { db } from '../db';
import { group, groupMembers } from '../db/schema';
import { and, eq } from 'drizzle-orm';

class GroupRepository {
	async getGroupsForUser(userId: string) {
		const memberships = await db.query.groupMembers.findMany({
			where: eq(groupMembers.userId, userId),
			with: {
				group: {
					with: {
						owner: true,
						members: {
							with: {
								user: true
							}
						}
					}
				}
			}
		});
		return memberships.map((m) => m.group);
	}

	async getGroupForOwner(groupId: string, ownerId: string) {
		return await db.query.group.findFirst({
			where: and(eq(group.id, groupId), eq(group.ownerId, ownerId)),
			with: {
				members: {
					with: {
						user: true
					}
				}
			}
		});
	}

	async isMember(groupId: string, userId: string) {
		const rows = await db
			.select()
			.from(groupMembers)
			.where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)))
			.limit(1);
		return rows.length > 0;
	}

	async createGroup(name: string, currency: string, ownerId: string) {
		return await db.transaction(async (tx) => {
			const newGroup = await tx
				.insert(group)
				.values({ name, currency, ownerId })
				.returning()
				.then((res) => res[0]);

			await tx.insert(groupMembers).values({ groupId: newGroup.id, userId: ownerId });
			return newGroup;
		});
	}

	async addMember(groupId: string, userId: string) {
		await db.insert(groupMembers).values({ groupId, userId });
	}
}

export const groupRepository = new GroupRepository();
