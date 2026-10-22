import { form, query } from '$app/server';
import { requireGroupMember, requireUser } from '$lib/server/guards';
import { groupRepository } from '$lib/server/repository/groupRepository';
import { error, redirect } from '@sveltejs/kit';
import * as v from 'valibot';
import z from 'zod';

export const getGroups = query(async () => {
	const user = requireUser();

	return await groupRepository.getGroupsForUser(user.id);
});

export const getGroupById = query(v.string(), async (id: string) => {
	const idResult = z.uuid().safeParse(id);

	if (!idResult.success) {
		throw error(400, 'Invalid group ID');
	}
	await requireGroupMember(id);

	const groupResult = await groupRepository.getGroup(id);

	if (!groupResult) error(404, 'Group not found');

	return groupResult;
});

export const createGroup = form(
	v.object({
		name: v.pipe(v.string(), v.nonEmpty()),
		currency: v.pipe(v.string(), v.length(3), v.nonEmpty())
	}),
	async ({ name, currency }) => {
		const user = requireUser();

		const new_group = await groupRepository.createGroup(name, currency, user.id);

		// Redirect to the newly created page
		redirect(303, `/groups/${new_group.id}`);
	}
);

export const addMember = form(
	v.object({
		groupId: v.string(),
		userId: v.string()
	}),
	async ({ groupId, userId }) => {
		await requireGroupMember(groupId);

		await groupRepository.addMember(groupId, userId);
	}
);
