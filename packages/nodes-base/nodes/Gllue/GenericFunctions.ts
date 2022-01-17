import {Response} from 'express';


interface NoWebhookResponse {
	noWebhookResponse: boolean;
}

export class ErrorMessageBuilder {
	responseCode: number;
	realm: string;
	resp: Response;

	// tslint:disable-next-line:no-any
	constructor(resp: Response | any, realm: string, responseCode: number) {
		this.resp = resp;
		this.realm = realm;
		this.responseCode = responseCode;
	}

	static getMessage(responseCode?: number): string {
		let message = 'Authorization problem!';
		if (responseCode === 401) {
			message = 'Authorization is required!';
		} else if (responseCode === 403) {
			message = 'Authorization data is wrong!';
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

	constructor(token: string|undefined, expectedToken: string) {
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
