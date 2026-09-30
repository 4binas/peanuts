export type SplitRow = {
	itemId: string;
	buyerId: string;
	price: number; // cents
	userId: string;
	splitPercentage: number;
};

export type PaymentRow = { fromUserId: string; toUserId: string; amount: number }; // cents

export type Balance = { userId: string; balanceCents: number };

/**
 * Splits `totalCents` into whole-cent shares proportional to `weights`, using the
 * largest-remainder method so the shares always add up exactly to `totalCents`.
 * Ties go to the lower index, so the result is deterministic.
 */
export function allocateCents(totalCents: number, weights: number[]): number[] {
	const weightSum = weights.reduce((a, b) => a + b, 0);
	if (weightSum <= 0) return weights.map(() => 0);

	const exact = weights.map((w) => (totalCents * w) / weightSum);
	const shares = exact.map(Math.floor);
	let remaining = totalCents - shares.reduce((a, b) => a + b, 0);

	const byRemainder = exact
		.map((value, index) => ({ index, remainder: value - shares[index] }))
		.sort((a, b) => b.remainder - a.remainder || a.index - b.index);
	for (const { index } of byRemainder) {
		if (remaining <= 0) break;
		shares[index] += 1;
		remaining -= 1;
	}
	return shares;
}

/**
 * Net balance per user in whole cents: positive means the user is owed money,
 * negative means they owe. Balances of all users always sum to zero.
 */
export function computeBalances(splits: SplitRow[], payments: PaymentRow[]): Balance[] {
	const map = new Map<string, number>();
	const add = (userId: string, delta: number) => map.set(userId, (map.get(userId) ?? 0) + delta);

	const items = new Map<string, SplitRow[]>();
	for (const s of splits) items.set(s.itemId, [...(items.get(s.itemId) ?? []), s]);

	for (const itemSplits of items.values()) {
		// Stable order so rounding always favours the same person for the same item
		const ordered = [...itemSplits].sort((a, b) => a.userId.localeCompare(b.userId));
		const { price, buyerId } = ordered[0];
		const shares = allocateCents(
			price,
			ordered.map((s) => s.splitPercentage)
		);
		ordered.forEach((split, i) => {
			if (split.userId === buyerId) return; // buyer keeps own share
			add(split.userId, -shares[i]); // debtor owes -> negative
			add(buyerId, shares[i]); // buyer is owed -> positive
		});
	}

	for (const p of payments) {
		add(p.fromUserId, p.amount); // paid out -> improves their balance
		add(p.toUserId, -p.amount); // received -> reduces what's owed to them
	}

	return [...map.entries()]
		.map(([userId, balanceCents]) => ({ userId, balanceCents }))
		.filter((b) => b.balanceCents !== 0);
}
