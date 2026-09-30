import { form, getRequestEvent, query } from '$app/server';
import { getAuth } from '$lib/server/auth';
import { groupRepository } from '$lib/server/repository/groupRepository';
import { error, redirect } from '@sveltejs/kit';
import * as v from 'valibot';
import z from 'zod';

export const getGroups = query(async () => {
	const event = getRequestEvent();
	const session = await getAuth().api.getSession({
		headers: event.request.headers
	});

	if (!session?.user.id) error(401, 'Unauthorized');

	return await groupRepository.getGroupsForUser(session.user.id);
});

export const getGroupById = query(v.string(), async (id: string) => {
	const idResult = z.uuid().safeParse(id);

	if (!idResult.success) {
		throw error(400, 'Invalid group ID');
	}
	const event = getRequestEvent();
	const session = await getAuth().api.getSession({
		headers: event.request.headers
	});
	if (!session?.user.id) error(401, 'Unauthorized');

	if (!id) error(400, 'Group ID is required');
	const groupResult = await groupRepository.getGroupForOwner(id, session.user.id);

	if (!groupResult) error(404, 'Group not found');

	return groupResult;
});

export const createGroup = form(
	v.object({
		name: v.pipe(v.string(), v.nonEmpty()),
		currency: v.pipe(v.string(), v.length(3), v.nonEmpty())
	}),
	async ({ name, currency }) => {
		const event = getRequestEvent();
		// Check the user is logged in
		const session = await getAuth().api.getSession({
			headers: event.request.headers
		});
		if (!session?.user.id) error(401, 'Unauthorized');

		// Insert into the database
		const new_group = await groupRepository.createGroup(name, currency, session.user.id);

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
		const event = getRequestEvent();
		// Check the user is logged in
		const session = await getAuth().api.getSession({
			headers: event.request.headers
		});
		if (!session?.user.id) error(401, 'Unauthorized');

		// Insert into the database
		await groupRepository.addMember(groupId, userId);
	}
);
