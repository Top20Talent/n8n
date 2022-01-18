import {Response} from 'express';
import {buildOptionWithUri, getResponseByUri, gllueUrlBuilder, UrlParams} from './helpers';
import {IDataObject} from 'n8n-workflow';
import {CvSentResponse} from './interfaces';


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
		if (responseCode === 401) { // TODO: magic number
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
		const firstCandidate = data.result.candidate[0];
		return {id: firstCandidate.id, email: firstCandidate.email};
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

	getPayload() {
		return {};
	}

	async post() {
		const uri = this.getUrl();
		const payload = this.getPayload();
		const options = buildOptionWithUri(uri, 'POST', payload);
		return await this.request(options);

	}
}

class ConsentAPI extends Hasura {
	resource = 'consent';
	candidateId: number;
	dateBefore: string | undefined;

	constructor(request: N8nRequest, candidateId: number, dateBefore?: string) {
		super(request);
		this.candidateId = candidateId;
		this.dateBefore = dateBefore;
	}

}
export class ConsentedConsentAPIEndpint extends ConsentAPI {
	action = 'is-consented';

	getPayload() {
		const payload = super.getPayload();
		return Object.assign(payload, {candidate_id: this.candidateId});
	}
}

export class SentConsentAPIEndpoint extends ConsentAPI {
	action = 'is-sent-30-days';

	getPayload() {
		const payload = super.getPayload();
		return Object.assign(payload, {candidate_id: this.candidateId, date_before_30_days: this.dateBefore});
	}
}
