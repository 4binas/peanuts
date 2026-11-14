<script lang="ts">
	import { resolve } from '$app/paths';
	import { BellRing, LogOut } from '@lucide/svelte';
	import { get_user } from '../../user.remote';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { disablePush, enablePush, getPushState, type PushState } from '$lib/client/push';

	const user = $derived(await get_user());

	let pushState = $state<PushState | 'loading'>('loading');
	let pushBusy = $state(false);
	let pushError = $state('');

	const pushHint = $derived(
		{
			loading: '',
			unsupported:
				'Not available in this browser. On iPhone, add Peanuts to the Home Screen and open it from there.',
			unconfigured: 'Push notifications are not set up on this server.',
			denied: 'Notifications are blocked. Allow them for Peanuts in your device settings.',
			enabled: 'This device gets a notification for group activity.',
			disabled: 'Get a notification on this device for group activity.'
		}[pushState]
	);

	onMount(async () => {
		pushState = await getPushState().catch(() => 'unsupported' as const);
	});

	async function togglePush() {
		pushBusy = true;
		pushError = '';
		try {
			pushState = pushState === 'enabled' ? await disablePush() : await enablePush();
		} catch (err) {
			console.error(err);
			pushError = 'Could not change push notifications. Please try again.';
			pushState = await getPushState().catch(() => 'unsupported' as const);
		} finally {
			pushBusy = false;
		}
	}
</script>

{#if user?.id}
	<div class="card mb-4 grid grid-cols-[auto_1fr] gap-4 rounded-box bg-base-300 p-4 shadow-md">
		<div class="avatar">
			<div class="w-20 rounded-xl">
				<img src={user.image} alt={user.name} />
			</div>
		</div>
		<div class="grid content-end justify-self-start">
			<h1 class="text-xl font-semibold">{user.name}</h1>
			<p class="text-sm">{user.email}</p>
		</div>
	</div>

	<ul class="list rounded-box bg-base-100 shadow-md">
		<li class="list-row grid grid-cols-[1fr_auto] content-center gap-4">
			<button onclick={() => goto(resolve('/auth/logout'))} class="btn-white btn btn-outline">
				<LogOut />
				Logout
			</button>
		</li>
		<li class="p-4 pb-2 text-xs tracking-wide opacity-60">Settings</li>

		<li class="list-row grid grid-cols-[auto_1fr_auto] items-center gap-4">
			<BellRing />
			<div>
				<p>Push notifications</p>
				<p class="text-xs opacity-70">{pushHint}</p>
				{#if pushError}
					<p class="text-xs text-error">{pushError}</p>
				{/if}
			</div>
			<input
				type="checkbox"
				class="toggle toggle-primary"
				aria-label="Push notifications"
				checked={pushState === 'enabled'}
				disabled={pushBusy || !(pushState === 'enabled' || pushState === 'disabled')}
				onchange={togglePush}
			/>
		</li>
	</ul>
{/if}
