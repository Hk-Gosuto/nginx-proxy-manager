import assert from "node:assert/strict";
import { test } from "node:test";
import remoteVersion from "../internal/remote-version.js";
import { getBuildVersion } from "../lib/build-version.js";
import pjson from "../package.json" with { type: "json" };

test("release checks use the built application version", async (t) => {
	const previous = process.env.NPM_BUILD_VERSION;
	t.after(() => {
		if (previous === undefined) {
			delete process.env.NPM_BUILD_VERSION;
		} else {
			process.env.NPM_BUILD_VERSION = previous;
		}
	});

	delete process.env.NPM_BUILD_VERSION;
	assert.equal(getBuildVersion(), pjson.version.split("-")[0]);
	process.env.NPM_BUILD_VERSION = "dev";
	assert.equal(getBuildVersion(), pjson.version.split("-")[0]);
	process.env.NPM_BUILD_VERSION = "v2.17.1-custom";
	assert.equal(getBuildVersion(), "2.17.1");

	t.mock.method(remoteVersion, "fetchUrl", async () => JSON.stringify({ tag_name: "v2.17.1" }));
	assert.deepEqual(await remoteVersion.get(), { current: "v2.17.1", latest: "v2.17.1", update_available: false });

	remoteVersion.last_result = { tag_name: "v2.17.2" };
	assert.deepEqual(await remoteVersion.get(), { current: "v2.17.1", latest: "v2.17.2", update_available: true });
});
