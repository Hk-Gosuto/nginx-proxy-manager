import { useQuery } from "@tanstack/react-query";
import { getDNSAuthorizations } from "src/api/backend/dnsAuthorizations";

export const dnsAuthorizationsQueryKey = ["dns-authorizations"];

export function useDNSAuthorizations() {
	return useQuery({ queryKey: dnsAuthorizationsQueryKey, queryFn: getDNSAuthorizations });
}
