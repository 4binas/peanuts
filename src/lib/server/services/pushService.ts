import { env } from '$env/dynamic/private';
import { sendNotification, setVapidDetails } from 'web-push';
import { pushSubscriptionRepository } from '../repository/pushSubscriptionRepository';

export type PushPayload = {
	title: string;
	body: string;
	/** App path opened when the notification is tapped. */
	url: string;
	/** Notifications with the same tag replace each other on the device. */
	tag?: string;
	/** Unread count shown on the app icon. */
	badgeCount?: number;
};

let configured = false;

/** The VAPID public key browsers subscribe with, or null when push is not set up. */
export function getVapidPublicKey() {
	return env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY ? env.VAPID_PUBLIC_KEY : null;
}

function configure() {
	const { VAPID_PUBLIC_KEY: publicKey, VAPID_PRIVATE_KEY: privateKey } = env;
	// Push services contact the subject when a sender misbehaves
	const subject = env.VAPID_SUBJECT || env.ORIGIN;
	if (!publicKey || !privateKey || !subject) return false;
	if (!configured) {
		setVapidDetails(subject, publicKey, privateKey);
		configured = true;
	}
	return true;
}

/**
 * Sends a push message to every device of the given users. `payload` is built
 * per user. Subscriptions the push service reports as gone are deleted.
 */
export async function sendPush(userIds: string[], payload: (userId: string) => PushPayload) {
	if (!configure()) return;

	const subscriptions = await pushSubscriptionRepository.getForUsers(userIds);
	const expired: string[] = [];

	await Promise.all(
		subscriptions.map(async (sub) => {
			try {
				await sendNotification(
					{ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
					JSON.stringify(payload(sub.userId)),
					{ TTL: 60 * 60 * 24, timeout: 10_000 }
				);
			} catch (err) {
				const status = (err as { statusCode?: number }).statusCode;
				if (status === 404 || status === 410) expired.push(sub.endpoint);
				else console.error('Failed to send push notification', err);
			}
		})
	);

	await pushSubscriptionRepository.removeByEndpoints(expired);
}
