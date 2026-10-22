import { query } from '$app/server';
import { requireUser } from '$lib/server/guards';
import { userRepository } from '$lib/server/repository/userRepository';

export const getUsers = query(async () => {
	requireUser();

	const users = await userRepository.getUsers();
	return users;
});
