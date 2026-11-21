import { useQueryClient } from "@tanstack/react-query";
import EasyModal, { type InnerModalProps } from "ez-modal-react";
import { type FormEvent, useState } from "react";
import { Alert, Modal } from "react-bootstrap";
import { Link } from "react-router-dom";
import {
	createDNSAuthorization,
	type DNSAuthorization,
	deleteDNSAuthorization,
	updateDNSAuthorization,
} from "src/api/backend/dnsAuthorizations";
import { Button, HasPermission, LoadingPage } from "src/components";
import { useDnsProviders } from "src/hooks";
import { dnsAuthorizationsQueryKey, useDNSAuthorizations } from "src/hooks/useDNSAuthorizations";
import { intl, T } from "src/locale";
import { showDeleteConfirmModal } from "src/modals";
import { CERTIFICATES, MANAGE } from "src/modules/Permissions";

const DNSAuthorizationModal = EasyModal.create(
	({ visible, remove, authorization }: InnerModalProps & { authorization?: DNSAuthorization }) => {
		const queryClient = useQueryClient();
		const { data: providers, isError: providersError } = useDnsProviders();
		const [name, setName] = useState(authorization?.name ?? "");
		const [provider, setProvider] = useState(authorization?.dnsProvider ?? "");
		const [credentials, setCredentials] = useState("");
		const [submitting, setSubmitting] = useState(false);
		const [error, setError] = useState("");
		const definition = providers?.find((item) => item.id === provider);

		const save = async (event: FormEvent) => {
			event.preventDefault();
			setSubmitting(true);
			setError("");
			try {
				if (authorization) {
					await updateDNSAuthorization(authorization.id, { name, credentials: credentials || undefined });
				} else {
					await createDNSAuthorization({ name, dnsProvider: provider, credentials });
				}
				await queryClient.invalidateQueries({ queryKey: dnsAuthorizationsQueryKey });
				remove();
			} catch (err) {
				setError((err as Error).message);
			} finally {
				setSubmitting(false);
			}
		};

		return (
			<Modal show={visible} onHide={() => !submitting && remove()}>
				<form onSubmit={save}>
					<Modal.Header closeButton={!submitting}>
						<Modal.Title>
							<T id={authorization ? "dns-authorizations.edit" : "dns-authorizations.add"} />
						</Modal.Title>
					</Modal.Header>
					<Modal.Body>
						{error && (
							<Alert variant="danger">
								<T id={error} />
							</Alert>
						)}
						{providersError && !authorization && (
							<Alert variant="danger">
								<T id="dns-authorizations.error.load-providers" />
							</Alert>
						)}
						<fieldset disabled={submitting}>
							<div className="mb-3">
								<label className="form-label" htmlFor="dns-authorization-name">
									<T id="column.name" />
								</label>
								<input
									id="dns-authorization-name"
									className="form-control"
									required
									maxLength={100}
									value={name}
									onChange={(event) => setName(event.target.value)}
								/>
							</div>
							<div className="mb-3">
								<label className="form-label" htmlFor="dns-authorization-provider">
									<T id="certificates.dns.provider" />
								</label>
								{authorization ? (
									<input
										id="dns-authorization-provider"
										className="form-control"
										readOnly
										value={definition?.name ?? provider}
									/>
								) : (
									<select
										id="dns-authorization-provider"
										className="form-select"
										required
										value={provider}
										onChange={(event) => {
											const id = event.target.value;
											setProvider(id);
											setCredentials(
												providers?.find((item) => item.id === id)?.credentials ?? "",
											);
										}}
									>
										<option value="">
											{intl.formatMessage({ id: "certificates.dns.provider.placeholder" })}
										</option>
										{providers?.map((item) => (
											<option key={item.id} value={item.id}>
												{item.name}
											</option>
										))}
									</select>
								)}
							</div>
							<div>
								<label className="form-label" htmlFor="dns-authorization-credentials">
									<T id="certificates.dns.credentials" />
								</label>
								<textarea
									id="dns-authorization-credentials"
									className="form-control font-monospace"
									rows={5}
									required={!authorization}
									maxLength={16000}
									autoComplete="off"
									spellCheck={false}
									value={credentials}
									onChange={(event) => setCredentials(event.target.value)}
								/>
								<small className="form-text">
									<T
										id={
											authorization
												? "dns-authorizations.rotate"
												: "certificates.dns.credentials-note"
										}
									/>
								</small>
								{authorization && definition?.credentials && (
									<details className="mt-2">
										<summary>
											<T id="dns-authorizations.template" />
										</summary>
										<pre className="mb-0">{definition.credentials}</pre>
									</details>
								)}
							</div>
						</fieldset>
					</Modal.Body>
					<Modal.Footer>
						<Button type="button" disabled={submitting} onClick={remove}>
							<T id="cancel" />
						</Button>
						<Button type="submit" actionType="primary" isLoading={submitting} disabled={submitting}>
							<T id="save" />
						</Button>
					</Modal.Footer>
				</form>
			</Modal>
		);
	},
);

function DNSAuthorizationsTable() {
	const { data, isLoading, isError } = useDNSAuthorizations();
	const { data: providers } = useDnsProviders();

	return (
		<div className="card mt-4">
			<div className="card-status-top bg-pink" />
			<div className="card-header justify-content-between gap-2 flex-wrap">
				<h2 className="mb-0">
					<T id="dns-authorizations" />
				</h2>
				<div className="btn-list">
					<Link className="btn btn-sm" to="/certificates">
						<T id="certificates" />
					</Link>
					<Button size="sm" actionType="primary" onClick={() => EasyModal.show(DNSAuthorizationModal, {})}>
						<T id="dns-authorizations.add" />
					</Button>
				</div>
			</div>
			{isLoading ? (
				<LoadingPage noLogo />
			) : isError ? (
				<Alert variant="danger" className="m-3">
					<T id="dns-authorizations.error.load" />
				</Alert>
			) : data?.length ? (
				<div className="table-responsive">
					<table className="table table-vcenter card-table">
						<thead>
							<tr>
								<th scope="col">
									<T id="column.name" />
								</th>
								<th scope="col">
									<T id="certificates.dns.provider" />
								</th>
								<th scope="col" className="w-1" />
							</tr>
						</thead>
						<tbody>
							{data.map((authorization) => (
								<tr key={authorization.id}>
									<td>{authorization.name}</td>
									<td>
										{providers?.find((item) => item.id === authorization.dnsProvider)?.name ??
											authorization.dnsProvider}
									</td>
									<td>
										<div className="btn-list flex-nowrap">
											<Button
												size="sm"
												onClick={() => EasyModal.show(DNSAuthorizationModal, { authorization })}
											>
												<T id="action.edit" />
											</Button>
											<Button
												size="sm"
												onClick={() =>
													showDeleteConfirmModal({
														tTitle: "dns-authorizations.delete",
														children: (
															<T
																id="dns-authorizations.delete-confirm"
																data={{ name: authorization.name }}
															/>
														),
														onConfirm: async () => {
															await deleteDNSAuthorization(authorization.id);
														},
														invalidations: [dnsAuthorizationsQueryKey],
													})
												}
											>
												<T id="action.delete" />
											</Button>
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			) : (
				<div className="card-body text-muted">
					<T id="dns-authorizations.empty" />
				</div>
			)}
		</div>
	);
}

export default function DNSAuthorizations() {
	return (
		<HasPermission section={CERTIFICATES} permission={MANAGE} pageLoading loadingNoLogo>
			<DNSAuthorizationsTable />
		</HasPermission>
	);
}
