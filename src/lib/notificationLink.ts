/** App path a notification points to: the expense or payment it is about, else its group. */
export function notificationPath(n: { type: string; groupId: string; entityId: string | null }) {
	if (n.entityId && n.type.startsWith('expense_') && n.type !== 'expense_deleted') {
		return `/groups/${n.groupId}/expenses/${n.entityId}` as const;
	}
	if (n.entityId && n.type.startsWith('payment_') && n.type !== 'payment_deleted') {
		return `/groups/${n.groupId}/payment/${n.entityId}` as const;
	}
	return `/groups/${n.groupId}` as const;
}
