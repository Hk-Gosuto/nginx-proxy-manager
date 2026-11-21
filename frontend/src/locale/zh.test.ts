import { describe, expect, it } from "vitest";
import { getFlagCodeForLocale, loadMessages } from "./IntlProvider";
import en from "./src/en.json";
import zh from "./src/zh.json";

describe("Simplified Chinese UI", () => {
	it("translates every English message", () => {
		expect(Object.keys(en).filter((key) => !(key in zh))).toEqual([]);
	});

	it("uses Simplified Chinese for zh-CN and English for en-US", () => {
		expect(loadMessages("zh-CN")["dns-authorizations"]).toBe("DNS 服务商授权");
		expect(loadMessages("en-US")["dns-authorizations"]).toBe("DNS Authorizations");
		expect(getFlagCodeForLocale("zh-CN")).toBe("CN");
	});
});
