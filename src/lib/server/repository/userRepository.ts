import { db } from '../db';

class UserRepository {
	async getUsers() {
		return await db.query.user.findMany();
	}
}

export const userRepository = new UserRepository();
