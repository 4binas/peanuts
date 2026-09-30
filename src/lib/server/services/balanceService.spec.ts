import { describe, it, expect } from 'vitest';
import { allocateCents, computeBalances, type SplitRow } from './balanceService';

describe('allocateCents', () => {
	it('always sums to the total', () => {
		expect(allocateCents(1001, [50, 50])).toEqual([501, 500]);
		expect(allocateCents(1000, [33, 33, 34])).toEqual([330, 330, 340]);
		expect(allocateCents(100, [1, 1, 1])).toEqual([34, 33, 33]);
	});

	it('returns zeros when there is no weight', () => {
		expect(allocateCents(500, [0, 0])).toEqual([0, 0]);
	});
});

describe('computeBalances', () => {
	const split = (itemId: string, price: number, userId: string, pct: number): SplitRow => ({
		itemId,
		buyerId: 'alice',
		price,
		userId,
		splitPercentage: pct
	});

	it('produces whole cents that are fully settled by paying the shown amount', () => {
		// 10.01 split 50/50: bob's share must be a whole number of cents
		const splits = [split('i1', 1001, 'alice', 50), split('i1', 1001, 'bob', 50)];

		const before = computeBalances(splits, []);
		const bob = before.find((b) => b.userId === 'bob')!;
		expect(Number.isInteger(bob.balanceCents)).toBe(true);

		const after = computeBalances(splits, [
			{ fromUserId: 'bob', toUserId: 'alice', amount: -bob.balanceCents }
		]);
		expect(after).toEqual([]);
	});

	it('does not accumulate rounding drift across many items', () => {
		const splits = Array.from({ length: 30 }, (_, i) => [
			split(`i${i}`, 1001, 'alice', 34),
			split(`i${i}`, 1001, 'bob', 33),
			split(`i${i}`, 1001, 'carol', 33)
		]).flat();

		const balances = computeBalances(splits, []);
		expect(balances.every((b) => Number.isInteger(b.balanceCents))).toBe(true);
		expect(balances.reduce((a, b) => a + b.balanceCents, 0)).toBe(0);
	});
});
