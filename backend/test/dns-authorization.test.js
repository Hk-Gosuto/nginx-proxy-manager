import assert from "node:assert/strict";
import { test } from "node:test";
import knex from "knex";
import apiValidator from "../lib/validator/api.js";
import { down, up } from "../migrations/20261121000000_dns_authorization.js";
import { getCompiledSchema, getValidationSchema } from "../schema/index.js";

test("DNS authorization migration preserves legacy credentials and restores linked credentials on rollback", async () => {
	const db = knex({ client: "better-sqlite3", connection: { filename: ":memory:" }, useNullAsDefault: true });
	try {
		await db.schema.createTable("certificate", (table) => {
			table.increments().primary();
			table.json("meta").notNullable();
		});
		const legacy = { dns_challenge: true, dns_provider: "cloudflare", dns_provider_credentials: "legacy-fixture" };
		await db("certificate").insert({ id: 1, meta: JSON.stringify(legacy) });

		await up(db);
		const [authorization] = await db("dns_authorization")
			.insert({ owner_user_id: 1, name: "Test DNS", dns_provider: "cloudflare", credentials: "test-fixture" })
			.returning("id");
		await db("certificate").insert({
			id: 2,
			dns_authorization_id: authorization.id,
			meta: JSON.stringify({ dns_challenge: true, dns_provider: "cloudflare" }),
		});
		await assert.rejects(db("dns_authorization").where("id", authorization.id).delete());
		await db("dns_authorization").where("id", authorization.id).update({ credentials: "rotated-fixture" });

		await down(db);
		const rows = await db("certificate").orderBy("id");
		assert.deepEqual(JSON.parse(rows[0].meta), legacy);
		assert.equal(JSON.parse(rows[1].meta).dns_provider_credentials, "rotated-fixture");
		assert.equal(await db.schema.hasColumn("certificate", "dns_authorization_id"), false);
	} finally {
		await db.destroy();
	}
});

test("DNS authorization requests accept a saved certificate reference and keep provider immutable on update", async () => {
	await getCompiledSchema();
	const createCertificate = getValidationSchema("/nginx/certificates", "post");
	await apiValidator(createCertificate, {
		provider: "letsencrypt",
		domain_names: ["example.test"],
		dns_authorization_id: 1,
		meta: { dns_challenge: true },
	});
	const updateAuthorization = getValidationSchema("/nginx/dns-authorizations/{id}", "put");
	await apiValidator(updateAuthorization, { name: "Renamed" });
	await assert.rejects(
		apiValidator(updateAuthorization, { name: "Renamed", dns_provider: "route53" }),
		/additional properties/,
	);
});
