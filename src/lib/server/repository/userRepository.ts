import { db } from '../db';
import { user } from '../db/schema';

class UserRepository {
	/** Public profile fields only, so emails and account metadata are never exposed. */
	async getUsers() {
		return await db.select({ id: user.id, name: user.name, image: user.image }).from(user);
	}
}

export const userRepository = new UserRepository();
