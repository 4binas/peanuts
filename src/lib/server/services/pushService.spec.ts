import { beforeEach, describe, expect, it, vi } from 'vitest';

const env = vi.hoisted(() => ({}) as Record<string, string | undefined>);
const sendNotification = vi.hoisted(() => vi.fn());
const repo = vi.hoisted(() => ({ getForUsers: vi.fn(), removeByEndpoints: vi.fn() }));

vi.mock('$env/dynamic/private', () => ({ env }));
vi.mock('web-push', () => ({ sendNotification, setVapidDetails: vi.fn() }));
vi.mock('../repository/pushSubscriptionRepository', () => ({ pushSubscriptionRepository: repo }));

import { getVapidPublicKey, sendPush } from './pushService';

const sub = (userId: string, endpoint: string) => ({
	id: endpoint,
	userId,
	endpoint,
	p256dh: 'p256dh',
	auth: 'auth',
	createdAt: new Date()
});

describe('pushService', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		Object.assign(env, {
			VAPID_PUBLIC_KEY: 'public',
			VAPID_PRIVATE_KEY: 'private',
			VAPID_SUBJECT: 'mailto:admin@example.com'
		});
		sendNotification.mockResolvedValue({ statusCode: 201 });
		vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	it('does nothing when the VAPID keys are missing', async () => {
		env.VAPID_PRIVATE_KEY = undefined;

		await sendPush(['u1'], () => ({ title: 't', body: 'b', url: '/' }));

		expect(getVapidPublicKey()).toBeNull();
		expect(repo.getForUsers).not.toHaveBeenCalled();
		expect(sendNotification).not.toHaveBeenCalled();
	});

	it('sends each device the payload of its user', async () => {
		repo.getForUsers.mockResolvedValue([sub('u1', 'e1'), sub('u1', 'e2'), sub('u2', 'e3')]);

		await sendPush(['u1', 'u2'], (userId) => ({ title: 't', body: `for ${userId}`, url: '/' }));

		const sent = sendNotification.mock.calls.map(([s, payload]) => [
			s.endpoint,
			JSON.parse(payload).body
		]);
		expect(sent).toEqual([
			['e1', 'for u1'],
			['e2', 'for u1'],
			['e3', 'for u2']
		]);
		expect(sendNotification.mock.calls[0][0].keys).toEqual({ p256dh: 'p256dh', auth: 'auth' });
		expect(repo.removeByEndpoints).toHaveBeenCalledWith([]);
	});

	it('removes subscriptions the push service reports as gone and keeps the rest', async () => {
		repo.getForUsers.mockResolvedValue([sub('u1', 'gone'), sub('u1', 'flaky'), sub('u1', 'ok')]);
		sendNotification.mockImplementation(async ({ endpoint }) => {
			if (endpoint === 'gone') throw Object.assign(new Error('Gone'), { statusCode: 410 });
			if (endpoint === 'flaky') throw Object.assign(new Error('Server error'), { statusCode: 500 });
		});

		await sendPush(['u1'], () => ({ title: 't', body: 'b', url: '/' }));

		expect(sendNotification).toHaveBeenCalledTimes(3);
		expect(repo.removeByEndpoints).toHaveBeenCalledWith(['gone']);
	});
});
