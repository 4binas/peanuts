import { command, query } from '$app/server';
import { requireUser } from '$lib/server/guards';
import { pushSubscriptionRepository } from '$lib/server/repository/pushSubscriptionRepository';
import { getVapidPublicKey } from '$lib/server/services/pushService';
import * as v from 'valibot';

// The server posts to subscription endpoints, so only real push services are accepted
const PUSH_SERVICE_HOSTS = [
	'fcm.googleapis.com',
	'push.apple.com',
	'push.services.mozilla.com',
	'notify.windows.com'
];

function isPushServiceUrl(value: string) {
	try {
		const url = new URL(value);
		return (
			url.protocol === 'https:' &&
			PUSH_SERVICE_HOSTS.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`))
		);
	} catch {
		return false;
	}
}

const endpoint = v.pipe(
	v.string(),
	v.maxLength(2048),
	v.check(isPushServiceUrl, 'Unknown push service')
);

/** The key the browser subscribes with, or null when the server has no VAPID keys. */
export const getPushPublicKey = query(async () => {
	requireUser();

	return getVapidPublicKey();
});

export const subscribePush = command(
	v.object({
		endpoint,
		keys: v.object({
			p256dh: v.pipe(v.string(), v.minLength(1), v.maxLength(512)),
			auth: v.pipe(v.string(), v.minLength(1), v.maxLength(512))
		})
	}),
	async ({ endpoint, keys }) => {
		const user = requireUser();

		await pushSubscriptionRepository.upsert({ userId: user.id, endpoint, ...keys });
	}
);

export const unsubscribePush = command(v.object({ endpoint }), async ({ endpoint }) => {
	const user = requireUser();

	await pushSubscriptionRepository.remove(user.id, endpoint);
});
