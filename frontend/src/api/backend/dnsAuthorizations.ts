import * as api from "./base";

export interface DNSAuthorization {
	id: number;
	name: string;
	dnsProvider: string;
}

const url = "/nginx/dns-authorizations";

export function getDNSAuthorizations(): Promise<DNSAuthorization[]> {
	return api.get({ url });
}

export function createDNSAuthorization(data: { name: string; dnsProvider: string; credentials: string }) {
	return api.post({ url, data });
}

export function updateDNSAuthorization(id: number, data: { name: string; credentials?: string }) {
	return api.put({ url: `${url}/${id}`, data });
}

export function deleteDNSAuthorization(id: number) {
	return api.del({ url: `${url}/${id}` });
}
