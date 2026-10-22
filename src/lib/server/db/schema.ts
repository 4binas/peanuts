import { relations } from 'drizzle-orm';
import {
	pgTable,
	text,
	timestamp,
	boolean,
	index,
	numeric,
	uuid,
	integer,
	varchar
} from 'drizzle-orm/pg-core';

// BetterAuth tables

export const user = pgTable('user', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	email: text('email').notNull().unique(),
	emailVerified: boolean('email_verified').default(false).notNull(),
	image: text('image'),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at')
		.defaultNow()
		.$onUpdate(() => /* @__PURE__ */ new Date())
		.notNull()
});

export const session = pgTable(
	'session',
	{
		id: text('id').primaryKey(),
		expiresAt: timestamp('expires_at').notNull(),
		token: text('token').notNull().unique(),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at')
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
		ipAddress: text('ip_address'),
		userAgent: text('user_agent'),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' })
	},
	(table) => [index('session_userId_idx').on(table.userId)]
);

export const account = pgTable(
	'account',
	{
		id: text('id').primaryKey(),
		accountId: text('account_id').notNull(),
		providerId: text('provider_id').notNull(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		accessToken: text('access_token'),
		refreshToken: text('refresh_token'),
		idToken: text('id_token'),
		accessTokenExpiresAt: timestamp('access_token_expires_at'),
		refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
		scope: text('scope'),
		password: text('password'),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at')
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull()
	},
	(table) => [index('account_userId_idx').on(table.userId)]
);

export const verification = pgTable(
	'verification',
	{
		id: text('id').primaryKey(),
		identifier: text('identifier').notNull(),
		value: text('value').notNull(),
		expiresAt: timestamp('expires_at').notNull(),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at')
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull()
	},
	(table) => [index('verification_identifier_idx').on(table.identifier)]
);

export const userRelations = relations(user, ({ many }) => ({
	sessions: many(session),
	accounts: many(account)
}));

export const sessionRelations = relations(session, ({ one }) => ({
	user: one(user, {
		fields: [session.userId],
		references: [user.id]
	})
}));

export const accountRelations = relations(account, ({ one }) => ({
	user: one(user, {
		fields: [account.userId],
		references: [user.id]
	})
}));

// Receipt

export const receipt = pgTable('receipt', {
	id: uuid('id').primaryKey().defaultRandom(),
	boughtById: text('user_id')
		.notNull()
		.references(() => user.id),
	groupId: uuid('group_id')
		.notNull()
		.references(() => group.id),
	storeName: text('store_name').notNull(),
	boughtAt: timestamp('bought_at').defaultNow().notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at')
		.defaultNow()
		.$onUpdate(() => /* @__PURE__ */ new Date())
		.notNull()
});

export const receiptRelations = relations(receipt, ({ one, many }) => ({
	boughtBy: one(user, {
		fields: [receipt.boughtById],
		references: [user.id]
	}),
	group: one(group, {
		fields: [receipt.groupId],
		references: [group.id]
	}),
	items: many(receipt_item)
}));

export const receipt_item = pgTable('receipt_item', {
	id: uuid('id').primaryKey().defaultRandom(),
	receiptId: uuid('receipt_id')
		.notNull()
		.references(() => receipt.id, { onDelete: 'cascade' }),
	name: text('name'),
	description: text('description'),
	price: integer('price').notNull(),
	currency: varchar('currency', { length: 3 }).notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at')
		.defaultNow()
		.$onUpdate(() => /* @__PURE__ */ new Date())
		.notNull()
});

export const receipt_split = pgTable('receipt_split', {
	id: uuid('id').primaryKey().defaultRandom(),
	receipt_item_id: uuid('receipt_item_id')
		.notNull()
		.references(() => receipt_item.id, { onDelete: 'cascade' }),
	userId: text('user_id')
		.notNull()
		.references(() => user.id),
	splitPercentage: integer('split_percentage').notNull()
});

export const receipt_splitRelations = relations(receipt_split, ({ one }) => ({
	receipt_item: one(receipt_item, {
		fields: [receipt_split.receipt_item_id],
		references: [receipt_item.id]
	}),
	user: one(user, {
		fields: [receipt_split.userId],
		references: [user.id]
	})
}));

export const exchangeRate = pgTable('exchange_rate', {
	id: uuid('id').primaryKey().defaultRandom(),
	from: varchar('from', { length: 3 }).notNull(),
	to: varchar('to', { length: 3 }).notNull(),
	exchangeRate: numeric('exchange_rate').notNull(),
	date: timestamp('date').defaultNow().notNull()
});

export const receipt_itemRelations = relations(receipt_item, ({ one, many }) => ({
	receipt: one(receipt, {
		fields: [receipt_item.receiptId],
		references: [receipt.id]
	}),
	receipt_splits: many(receipt_split)
}));

// Group

export const group = pgTable('group', {
	id: uuid('id').primaryKey().defaultRandom(),
	name: text('name').notNull(),
	currency: varchar('currency', { length: 3 }).notNull(),
	ownerId: text('owner_id')
		.notNull()
		.references(() => user.id),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at')
		.defaultNow()
		.$onUpdate(() => /* @__PURE__ */ new Date())
		.notNull()
});

export const groupRelations = relations(group, ({ one, many }) => ({
	owner: one(user, {
		fields: [group.ownerId],
		references: [user.id]
	}),
	members: many(groupMembers),
	receipts: many(receipt),
	payments: many(payment)
}));

export const groupMembers = pgTable('group_members', {
	id: uuid('id').primaryKey().defaultRandom(),
	groupId: uuid('group_id')
		.notNull()
		.references(() => group.id),
	userId: text('user_id')
		.notNull()
		.references(() => user.id)
});

export const groupMembersRelations = relations(groupMembers, ({ one }) => ({
	group: one(group, {
		fields: [groupMembers.groupId],
		references: [group.id]
	}),
	user: one(user, {
		fields: [groupMembers.userId],
		references: [user.id]
	})
}));

// Payment
export const payment = pgTable('payment', {
	id: uuid('id').primaryKey().defaultRandom(),
	groupId: uuid('group_id')
		.notNull()
		.references(() => group.id),
	amount: integer('amount').notNull(),
	currency: varchar('currency', { length: 3 }).notNull(),
	payedAt: timestamp('payed_at').defaultNow().notNull(),
	fromUserId: text('from_user_id')
		.notNull()
		.references(() => user.id),
	toUserId: text('to_user_id')
		.notNull()
		.references(() => user.id),
	description: text('description'),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at')
		.defaultNow()
		.$onUpdate(() => /* @__PURE__ */ new Date())
		.notNull()
});

export const paymentRelations = relations(payment, ({ one }) => ({
	group: one(group, {
		fields: [payment.groupId],
		references: [group.id]
	}),
	fromUser: one(user, {
		fields: [payment.fromUserId],
		references: [user.id]
	}),
	toUser: one(user, {
		fields: [payment.toUserId],
		references: [user.id]
	})
}));

// Notification

/** One row per recipient, so read state is tracked per user. */
export const notification = pgTable(
	'notification',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		actorId: text('actor_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		groupId: uuid('group_id')
			.notNull()
			.references(() => group.id, { onDelete: 'cascade' }),
		type: varchar('type', { length: 32 }).notNull(),
		// Receipt or payment id; not a foreign key so notifications outlive deleted entities
		entityId: uuid('entity_id'),
		message: text('message').notNull(),
		readAt: timestamp('read_at'),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(table) => [index('notification_userId_createdAt_idx').on(table.userId, table.createdAt)]
);

export const notificationRelations = relations(notification, ({ one }) => ({
	actor: one(user, {
		fields: [notification.actorId],
		references: [user.id]
	}),
	group: one(group, {
		fields: [notification.groupId],
		references: [group.id]
	})
}));
