import dnsPlugins from "../certbot/dns-plugins.json" with { type: "json" };
import db from "../db.js";
import error from "../lib/error.js";

const publicColumns = ["id", "name", "dns_provider"];
const table = "dns_authorization";
const inUse = () => new error.ValidationError("dns-authorizations.error.in-use");
const notFound = () => new error.ValidationError("dns-authorizations.error.not-found");

const owner = async (access) => {
	await access.can("certificates:create");
	const id = access.token.getUserId();
	if (!id) {
		throw new error.PermissionError();
	}
	return id;
};

const save = async (query) => {
	try {
		return await query;
	} catch {
		// Database driver errors can include the bound credentials.
		throw new error.InternalError("Unable to save DNS authorization");
	}
};

const dnsAuthorization = {
	list: async (access) => {
		return db()(table)
			.where("owner_user_id", await owner(access))
			.select(publicColumns)
			.orderBy("name");
	},

	create: async (access, data) => {
		const owner_user_id = await owner(access);
		const name = data.name.trim();
		if (!name || !data.credentials.trim() || !Object.hasOwn(dnsPlugins, data.dns_provider)) {
			throw new error.ValidationError("dns-authorizations.error.invalid");
		}
		const [row] = await save(
			db()(table).insert(
				{ owner_user_id, name, dns_provider: data.dns_provider, credentials: data.credentials },
				["id"],
			),
		);
		// MySQL returns the inserted ID as a number, while SQLite and PostgreSQL return a row.
		return { id: typeof row === "number" ? row : row.id, name, dns_provider: data.dns_provider };
	},

	update: async (access, id, data) => {
		const ownerId = await owner(access);
		const existing = await db()(table).where({ id, owner_user_id: ownerId }).first(publicColumns);
		if (!existing) {
			throw notFound();
		}
		const name = data.name.trim();
		if (!name || (data.credentials !== undefined && !data.credentials.trim())) {
			throw new error.ValidationError("dns-authorizations.error.invalid");
		}
		const changes = { name };
		if (data.credentials !== undefined) {
			changes.credentials = data.credentials;
		}
		const updated = await save(db()(table).where({ id, owner_user_id: ownerId }).update(changes));
		if (!updated && !(await db()(table).where({ id, owner_user_id: ownerId }).first("id"))) {
			throw notFound();
		}
		return { ...existing, name };
	},

	delete: async (access, id) => {
		const ownerId = await owner(access);
		const query = db()(table).where({ id, owner_user_id: ownerId });
		try {
			const deleted = await query
				.clone()
				.whereNotExists(db()("certificate").select("id").where("dns_authorization_id", id))
				.delete();
			if (deleted) return true;
		} catch (err) {
			if (["SQLITE_CONSTRAINT_FOREIGNKEY", "ER_ROW_IS_REFERENCED_2", "23503"].includes(err.code)) {
				throw inUse();
			}
			throw err;
		}
		if (!(await query.first("id"))) {
			throw notFound();
		}
		throw inUse();
	},

	// Called only during issuance and renewal. Never use this query to build an API response.
	getForCertificate: async (id, ownerId, trx) => {
		const query = (trx || db())(table).where({ id, owner_user_id: ownerId });
		if (trx) query.forUpdate();
		const row = await query.first("dns_provider", "credentials");
		if (!row) {
			throw notFound();
		}
		return row;
	},
};

export default dnsAuthorization;
