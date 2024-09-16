import {ClientResponse, Consents, ClientContractResponse} from '../interfaces';
import {CONSENT_EMAIL_TYPE, CONSENT_FROM_EMAIL, INTERVIEW_PIPELINE_NAME} from '../constants';
import {Hasura, N8nRequest} from '../GenericFunctions';

export class HandsOffService {
	client: ClientResponse|null;
	contracts: ClientContractResponse[]|null;

	constructor(client: ClientResponse|null, contracts: ClientContractResponse[]|null) {
		this.client = client;
		this.contracts = contracts;
	}

	isHandsoff() {
		let warningSituation = this.getWarningSituation();
		let handsOff = this.getHandsoff();
		return ((warningSituation !==null) || handsOff) ? true : false;
	}

	private getWarningSituation() {
		if (this.client === null) {
			return '';
		}
		return this.client.warning_situation;
	}

	private getHandsoff() {

		if (this.contracts !== null) {
			for (let contract of this.contracts) {
				if (contract.is_handsoff) {
					return true
				}
			}
	}
		return false
	}

}

export class SendEmailOnConsentService {
	hasConsented: Consents;
	hasSent: Consents;
	pipelineName: string;
	hasRequired: string | null;
	isHandsOff: boolean;

	constructor(hasConsented: Consents, hasSent: Consents, pipelineName: string, hasRequired: string | null, isHandsOff: boolean) {
		this.hasConsented = hasConsented;
		this.hasSent = hasSent;
		this.pipelineName = pipelineName;
		this.hasRequired = hasRequired;
		this.isHandsOff = isHandsOff;
	}

	canSendEmail() {
		const hasConsented = this.hasConsented.consents.length > 0;
		const hasSent = this.hasSent.consents.length > 0;
		const hasRequired = this.hasRequired === 'yes';
		const isInterview = this.pipelineName === INTERVIEW_PIPELINE_NAME;
		return !hasConsented && !hasSent && (isInterview || hasRequired) && !this.isHandsOff;
	}
}

class EmailNotificationAPI extends Hasura {
	resource = 'email';
}

class SaveEmailEndpoint extends EmailNotificationAPI {
	action = 'add';
}

export class EmailNotificationService {
	createEndpoint: SaveEmailEndpoint;

	constructor(request: N8nRequest) {
		this.createEndpoint = new SaveEmailEndpoint(request);
	}

	async create(from: string, to: string, type: string) {
		const data = {
			from, to, type,
		};
		return await this.createEndpoint.post(data);
	}

	async saveConsentEmail(email: string) {
		const response = await this.create(CONSENT_FROM_EMAIL, email, CONSENT_EMAIL_TYPE);
		return response.insert_email_notification.returning[0];
	}
}
