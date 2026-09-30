import { getRequestEvent } from '$app/server';
import { error } from '@sveltejs/kit';
import { groupRepository } from './repository/groupRepository';
import { paymentRepository } from './repository/paymentRepository';
import { receiptRepository } from './repository/receptRepository';

/**
 * Guards for remote functions. Remote functions are served from their own
 * endpoint and never run the (private) layout load, so every one of them
 * must call a guard itself.
 */

/** Returns the logged-in user (set by hooks.server.ts) or throws 401. */
export function requireUser() {
	const { user } = getRequestEvent().locals;
	if (!user?.id) error(401, 'Unauthorized');
	return user;
}

/** Returns the logged-in user if they are a member of the group, otherwise throws 401/403. */
export async function requireGroupMember(groupId: string) {
	const user = requireUser();
	if (!(await groupRepository.isMember(groupId, user.id))) error(403, 'Forbidden');
	return user;
}

/** Returns the logged-in user if they own the group, otherwise throws 401/403. */
export async function requireGroupOwner(groupId: string) {
	const user = requireUser();
	if (!(await groupRepository.isOwner(groupId, user.id))) error(403, 'Forbidden');
	return user;
}

/** Throws 400 unless every given user id is a member of the group. */
export async function requireUsersInGroup(groupId: string, userIds: string[]) {
	const unique = [...new Set(userIds)];
	const members = await groupRepository.getMemberIds(groupId, unique);
	if (unique.some((id) => !members.has(id))) error(400, 'User is not a member of this group');
}

/** Returns the receipt if the logged-in user is a member of its group, otherwise throws 401/403/404. */
export async function requireReceiptAccess(receiptId: string) {
	requireUser();
	const receipt = await receiptRepository.getReceipt(receiptId);
	if (!receipt) error(404, 'Receipt not found');
	await requireGroupMember(receipt.groupId);
	return receipt;
}

/** Returns the payment if the logged-in user is a member of its group, otherwise throws 401/403/404. */
export async function requirePaymentAccess(paymentId: string) {
	requireUser();
	const payment = await paymentRepository.getPayment(paymentId);
	if (!payment) error(404, 'Payment not found');
	await requireGroupMember(payment.groupId);
	return payment;
}
