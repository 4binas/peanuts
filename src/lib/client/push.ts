import {
	getPushPublicKey,
	subscribePush,
	unsubscribePush
} from '../../routes/(private)/settings/push.remote';

export type PushState =
	/** Browser has no web push; on iOS the app must be added to the Home Screen first. */
	| 'unsupported'
	/** Server has no VAPID keys. */
	| 'unconfigured'
	/** User blocked notifications in the browser or OS settings. */
	| 'denied'
	| 'enabled'
	| 'disabled';

function isSupported() {
	return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/** The current subscription, without waiting for a service worker that may never activate. */
async function getSubscription() {
	const registration = await navigator.serviceWorker.getRegistration();
	return (await registration?.pushManager.getSubscription()) ?? null;
}

function save(subscription: PushSubscription) {
	const { endpoint, keys } = subscription.toJSON();
	if (!endpoint || !keys?.p256dh || !keys.auth) throw new Error('Incomplete push subscription');
	return subscribePush({ endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } });
}

export async function getPushState(): Promise<PushState> {
	if (!isSupported()) return 'unsupported';
	if (!(await getPushPublicKey())) return 'unconfigured';
	if (Notification.permission === 'denied') return 'denied';
	const subscription = await getSubscription();
	return subscription && Notification.permission === 'granted' ? 'enabled' : 'disabled';
}

/** Asks for permission and subscribes this device. Must be called from a user gesture. */
export async function enablePush(): Promise<PushState> {
	if (!isSupported()) return 'unsupported';
	const publicKey = await getPushPublicKey();
	if (!publicKey) return 'unconfigured';

	const permission = await Notification.requestPermission();
	if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'disabled';

	const registration = await navigator.serviceWorker.ready;
	await save(
		(await registration.pushManager.getSubscription()) ??
			(await registration.pushManager.subscribe({
				userVisibleOnly: true,
				applicationServerKey: publicKey
			}))
	);
	return 'enabled';
}

/** Unsubscribes this device, e.g. when turning push off or logging out. */
export async function disablePush(): Promise<PushState> {
	if (!isSupported()) return 'unsupported';
	const subscription = await getSubscription();
	if (subscription) {
		await unsubscribePush({ endpoint: subscription.endpoint }).catch(() => {});
		await subscription.unsubscribe();
	}
	return 'disabled';
}

/**
 * Re-sends an existing subscription to the server, so it survives the browser
 * rotating it and follows the user who is logged in on this device.
 */
export async function syncPushSubscription() {
	if (!isSupported() || Notification.permission !== 'granted') return;
	const subscription = await getSubscription();
	if (subscription) await save(subscription);
}
