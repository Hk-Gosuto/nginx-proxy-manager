import express from "express";
import dnsAuthorization from "../../internal/dns-authorization.js";
import error from "../../lib/error.js";
import jwtdecode from "../../lib/express/jwt-decode.js";
import apiValidator from "../../lib/validator/api.js";
import { getValidationSchema } from "../../schema/index.js";

const router = express.Router({ caseSensitive: true, strict: true });
const path = "/nginx/dns-authorizations";

const parseId = (value) => {
	const id = Number(value);
	if (!/^\d+$/.test(value) || !Number.isSafeInteger(id) || id < 1) {
		throw new error.ItemNotFoundError();
	}
	return id;
};

router
	.route("/")
	.options((_, res) => res.sendStatus(204))
	.all(jwtdecode())
	.get(async (_, res) => res.send(await dnsAuthorization.list(res.locals.access)))
	.post(async (req, res) => {
		const data = await apiValidator(getValidationSchema(path, "post"), req.body);
		res.status(201).send(await dnsAuthorization.create(res.locals.access, data));
	});

router
	.route("/:id")
	.options((_, res) => res.sendStatus(204))
	.all(jwtdecode())
	.put(async (req, res) => {
		const id = parseId(req.params.id);
		const data = await apiValidator(getValidationSchema(`${path}/{id}`, "put"), req.body);
		res.send(await dnsAuthorization.update(res.locals.access, id, data));
	})
	.delete(async (req, res) => {
		res.send(await dnsAuthorization.delete(res.locals.access, parseId(req.params.id)));
	});

export default router;
