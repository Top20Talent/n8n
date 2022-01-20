import {Response} from 'express';
import {
	buildOptionWithUri,
	getOffSetDate,
	getResponseByUri,
	gllueUrlBuilder,
	UrlParams,
} from './helpers';
import {IDataObject} from 'n8n-workflow';
import {Consents, CvSentResponse} from './interfaces';

import {VALID_GLLUE_SOURCES} from './constants';

interface NoWebhookResponse {
	noWebhookResponse: boolean;
}

export class ErrorMessageBuilder {
	responseCode: number;
	realm: string;
	resp: Response;

	// TODO: remove any and refactor in Unit Test
	// tslint:disable-next-line:no-any
	constructor(resp: Response | any, realm: string, responseCode: number) {
		this.resp = resp;
		this.realm = realm;
		this.responseCode = responseCode;
	}

	static getMessage(responseCode?: number): string {
		let message = 'Authorization problem!';
		if (responseCode === 401) {
			// TODO: magic number
			message = 'Authorization is required!'; // TODO: magic string
		} else if (responseCode === 403) {
			message = 'Authorization data is wrong!';
		} else if (responseCode === 202) {
			message = 'Skipped, event is not the same with webhook.';
		}
		return message;
	}

	static getHeader(realm: string): { 'WWW-Authenticate': string } {
		return {'WWW-Authenticate': `Basic realm="${realm}"`};
	}

	handle(): NoWebhookResponse {
		const message = ErrorMessageBuilder.getMessage(this.responseCode);
		const header = ErrorMessageBuilder.getHeader(this.realm);
		this.resp.writeHead(this.responseCode, header);
		this.resp.end(message);
		return {
			noWebhookResponse: true,
		};
	}
}

export class TokenValidator {
	private token: string | undefined;
	private expectedToken: string;

	constructor(token: string | undefined, expectedToken: string) {
		this.token = token;
		this.expectedToken = expectedToken;
	}

	isMissing() {
		return this.token === undefined;
	}

	isWrong() {
		return this.token !== this.expectedToken;
	}
}

export class EventChecker {
	static isValid(payloadEvent: string, nodeEvent: string) {
		return payloadEvent === nodeEvent;
	}
}

interface GllueWebhookQuery {
	token?: string;
	source?: string;
}

export class SourceValidator {
	query: GllueWebhookQuery;

	constructor(query: GllueWebhookQuery) {
		this.query = query;
	}

	check(): void {
		const sourceExist = this.query.source !== undefined;
		if (!sourceExist) {
			throw new Error('Missing source in query of request');
		}
		if (!this.isInList()) {
			throw new Error(`"${this.query.source}" not in the valid list of [${VALID_GLLUE_SOURCES}]`);
		}
	}

	isInList() {
		return VALID_GLLUE_SOURCES.includes(this.query.source || '');
	}
}

// tslint:disable-next-line:no-any
type N8nRequest = (uriOrObject: string | IDataObject | any, options?: IDataObject) => Promise<any>;

export class Gllue {
	apiHost = '';
	token = '';
	request: N8nRequest;
	operation = 'simple_list_with_ids';

	constructor(apiHost: string, token: string, request: N8nRequest) {
		this.apiHost = apiHost;
		this.token = token;
		this.request = request;
	}

	async getDetail(resource: string, resourceId: number, fields?: string) {
		const query = `id__eq=${resourceId}`;
		const urlParams = new UrlParams(query, fields, this.token);
		const uriGenerated = gllueUrlBuilder(this.apiHost, resource, this.operation, urlParams);

		return await getResponseByUri(uriGenerated, this.request);
	}

	static extractIdAndEmail(data: CvSentResponse) {
		const firstCvSent = data.result.cvsent[0];
		const firstCandidate = data.result.candidate[0];
		return {
			id: firstCandidate.id,
			email: firstCandidate.email,
			cvsentField: firstCvSent.gllueext_send_terms_cv_sent,
		};
	}
}

export class Hasura {
	apiHost = 'http://localhost:8083/api/rest';
	resource = '';
	action = '';
	request: N8nRequest;

	constructor(request: N8nRequest) {
		this.request = request;
	}

	getUrl() {
		return `${this.apiHost}/${this.resource}/${this.action}`;
	}

	async post(payload: IDataObject) {
		const uri = this.getUrl();
		const options = buildOptionWithUri(uri, 'POST', payload);
		return await this.request(options);
	}
}

class ConsentAPI extends Hasura {
	resource = 'consent';
}

export class ConsentedConsentAPIEndpoint extends ConsentAPI {
	action = 'is-consented';
}

export class SentConsentAPIEndpoint extends ConsentAPI {
	action = 'is-sent-30-days';
}

class CreateConsentAPIEndpoint extends ConsentAPI {
	action = 'add';
}

export class ConsentService {
	createEndpoint: CreateConsentAPIEndpoint;
	getSentBeforeDateEndpoint: SentConsentAPIEndpoint;
	getConsentedByCandidateEndpoint: ConsentedConsentAPIEndpoint;


	constructor(request: N8nRequest) {
		this.createEndpoint = new CreateConsentAPIEndpoint(request);
		this.getSentBeforeDateEndpoint = new SentConsentAPIEndpoint(request);
		this.getConsentedByCandidateEndpoint = new ConsentedConsentAPIEndpoint(request);
	}

	async create(candidateId: number, source: string, channel: string): Promise<IDataObject> {
		const data = {
			candidate_id: candidateId,
			source,
			channel,
		};
		return await this.createEndpoint.post(data);
	}

	async getSentIn30Days(candidateId: number, source: string, channel: string) {
		const data = {
			candidate_id: candidateId,
			date_before_30_days: getOffSetDate(-30),
			source,
			channel,
		};
		return await this.getSentBeforeDateEndpoint.post(data);
	}

	async getConsented(candidateId: number, source: string, channel: string) {
		const data = {
			candidate_id: candidateId,
			source,
			channel,
		};
		return await this.getConsentedByCandidateEndpoint.post(data);
	}
}

export class SendEmailOnConsentService {
	hasConsented: Consents;
	hasSent: Consents;
	hasRequired: string | null;

	constructor(hasConsented: Consents, hasSent: Consents, hasRequired: string | null) {
		this.hasConsented = hasConsented;
		this.hasSent = hasSent;
		this.hasRequired = hasRequired;
	}

	canSendEmail() {
		const hasConsented = this.hasConsented.consents.length > 0;
		const hasSent = this.hasSent.consents.length > 0;
		const hasRequired = this.hasRequired === 'yes';
		return !hasConsented && !hasSent && hasRequired;
	}
}
