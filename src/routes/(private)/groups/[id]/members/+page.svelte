<script lang="ts">
	import { Plus } from '@lucide/svelte';
	import { addMember } from '../../group.remote';
	import { getUsers } from '../../user.remote';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { getGroup } from '../groupContext';

	const users = $derived(await getUsers());
	const getGroupFn = getGroup();
	const group = $derived(getGroupFn());
	const isOwner = $derived(group?.ownerId === page.data.user?.id);
</script>

{#if group && !isOwner}
	<p class="p-4">Only the group owner can add members.</p>
{:else if group}
	<div class="grid p-4">
		<form
			{...addMember}
			enctype="multipart/form-data"
			class="form grid gap-4"
			onsubmit={() => goto(resolve(`/groups/${page.params.id}`))}
		>
			<input type="hidden" {...addMember.fields.groupId.as('text')} value={page.params.id} />

			<fieldset class="fieldset">
				<legend class="fieldset-legend">Select a member</legend>
				<select class="select w-full border border-black" {...addMember.fields.userId.as('text')}>
					{#each users.filter((u) => !group.members
								.map((m) => m.userId)
								.includes(u.id)) as user (user.id)}
						<option value={user.id}>{user.name}</option>
					{/each}
				</select>
			</fieldset>
			<button class="btn btn-outline" type="submit"> <Plus /> Add Member</button>
		</form>
	</div>
{/if}
