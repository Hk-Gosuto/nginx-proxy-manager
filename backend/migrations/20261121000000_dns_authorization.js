const up = async (knex) => {
	await knex.schema.createTable("dns_authorization", (table) => {
		table.increments().primary();
		table.integer("owner_user_id").unsigned().notNullable().index();
		table.string("name", 100).notNullable();
		table.string("dns_provider", 100).notNullable();
		table.text("credentials").notNullable();
	});
	await knex.schema.alterTable("certificate", (table) => {
		table.integer("dns_authorization_id").unsigned().nullable().index();
		table.foreign("dns_authorization_id").references("dns_authorization.id").onDelete("RESTRICT");
	});
};

const down = async (knex) => {
	// Restore inline credentials so certificates created on this version can still renew after a rollback.
	const linked = await knex("certificate")
		.join("dns_authorization", "certificate.dns_authorization_id", "dns_authorization.id")
		.select("certificate.id", "certificate.meta", "dns_authorization.credentials");
	for (const row of linked) {
		const meta = typeof row.meta === "string" ? JSON.parse(row.meta) : row.meta;
		await knex("certificate")
			.where("id", row.id)
			.update({ meta: JSON.stringify({ ...meta, dns_provider_credentials: row.credentials }) });
	}
	await knex.schema.alterTable("certificate", (table) => {
		table.dropForeign("dns_authorization_id");
		table.dropIndex("dns_authorization_id");
		table.dropColumn("dns_authorization_id");
	});
	await knex.schema.dropTable("dns_authorization");
};

export { down, up };
