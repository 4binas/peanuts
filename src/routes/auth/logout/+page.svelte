<script>
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { authClient } from '$lib/client/auth-client';
	import { disablePush } from '$lib/client/push';
	import { get_user } from '../../user.remote';

	const logout = async () => {
		// Stop this device from receiving the logged-out user's notifications
		await disablePush().catch(() => {});
		authClient.signOut({
			fetchOptions: {
				onSuccess: async () => {
					console.log('logged out');
					await get_user().refresh();
					goto(resolve('/'));
				}
			}
		});
	};

	$effect(() => {
		logout();
	});
</script>

<h1>Logging out...</h1>
