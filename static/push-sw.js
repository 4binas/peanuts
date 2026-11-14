// Push handlers, loaded into the generated service worker via workbox `importScripts`.

self.addEventListener('push', (event) => {
	let data;
	try {
		data = event.data?.json() ?? {};
	} catch {
		data = { body: event.data?.text() };
	}

	const shown = self.registration.showNotification(data.title ?? 'Peanuts', {
		body: data.body,
		tag: data.tag,
		icon: '/icons/icon-192.png',
		badge: '/icons/icon-192.png',
		data: { url: data.url ?? '/notifications' }
	});

	const badged =
		typeof data.badgeCount === 'number' && 'setAppBadge' in self.navigator
			? self.navigator.setAppBadge(data.badgeCount).catch(() => {})
			: Promise.resolve();

	event.waitUntil(Promise.all([shown, badged]));
});

self.addEventListener('notificationclick', (event) => {
	event.notification.close();
	const url = new URL(event.notification.data?.url ?? '/notifications', self.location.origin).href;

	event.waitUntil(
		(async () => {
			const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
			const open = windows[0];
			if (open) {
				await open.focus();
				if ('navigate' in open) await open.navigate(url).catch(() => self.clients.openWindow(url));
				return;
			}
			await self.clients.openWindow(url);
		})()
	);
});
