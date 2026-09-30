import { db } from '../db';
import { payment } from '../db/schema';
import { eq } from 'drizzle-orm';

export type PaymentInput = {
	groupId: string;
	amount: number;
	currency: string;
	description: string;
	fromUserId: string;
	toUserId: string;
};

class PaymentRepository {
	async getPayments(groupId: string) {
		return await db.query.payment.findMany({
			where: eq(payment.groupId, groupId)
		});
	}

	async getPayment(paymentId: string) {
		return await db.query.payment.findFirst({
			where: eq(payment.id, paymentId)
		});
	}

	async createPayment(values: PaymentInput) {
		await db.insert(payment).values(values);
	}

	async updatePayment(paymentId: string, values: PaymentInput) {
		await db.update(payment).set(values).where(eq(payment.id, paymentId));
	}

	async deletePayment(paymentId: string) {
		await db.delete(payment).where(eq(payment.id, paymentId));
	}

	async getPaymentFlows(groupId: string) {
		return await db
			.select({
				fromUserId: payment.fromUserId,
				toUserId: payment.toUserId,
				amount: payment.amount
			})
			.from(payment)
			.where(eq(payment.groupId, groupId));
	}
}

export const paymentRepository = new PaymentRepository();
