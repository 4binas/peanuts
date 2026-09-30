import { getRequestEvent, query } from '$app/server';
import { getAuth } from '$lib/server/auth';
import { userRepository } from '$lib/server/repository/userRepository';
import { error } from '@sveltejs/kit';

export const getUsers = query(async () => {
	const event = getRequestEvent();
	const session = await getAuth().api.getSession({
		headers: event.request.headers
	});

	if (!session?.user.id) error(401, 'Unauthorized');

	const users = await userRepository.getUsers();
	return users;
});
