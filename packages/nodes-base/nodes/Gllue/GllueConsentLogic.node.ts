import {IExecuteFunctions,} from 'n8n-core';

import {IDataObject, INodeExecutionData, INodeType, INodeTypeDescription,} from 'n8n-workflow';
import {
	ConsentService, EmailNotificationService,
	Gllue,
	SendEmailOnConsentService,
} from './GenericFunctions';
import {
	CONSENT_EMAIL_CATEGORY,
	CONSENT_FROM_EMAIL,
	CONSENT_FROM_NAME,
	EMAIL_CHANNEL
} from './constants';
import {buildConsentUrl} from './helpers';

const helpers = require('./helpers');


export class GllueConsentLogic implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Gllue Consent Logic',
		name: 'gllueConsentLogic',
		icon: 'file:gllue.svg',
		group: ['transform'],
		version: 1,
		description: 'check to send term or not',
		defaults: {
			name: 'Gllue Consent Logic',
			color: '#1A82e2',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'gllueApi',
				required: true,
			},

		],
		properties: [],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const item = this.getInputData()[0].json;
		// @ts-ignore
		const resourceId = item.info.trigger_model_id;
		// @ts-ignore
		const resource = item.info.trigger_model_name;
		const credentials = await this.getCredentials('gllueApi') as IDataObject;
		const timestamp = helpers.getCurrentTimeStamp();
		const token = helpers.generateTokenWithAESKey(timestamp, credentials.apiUsername, credentials.apiAesKey);

		const gllue = new Gllue(credentials.apiHost as string, token, this.helpers.request);
		const simpleData = await gllue.getDetail(resource, resourceId,
			'id,jobsubmission__candidate__email,gllueext_send_terms_cv_sent');

		console.log('DEBUG:response data=', JSON.stringify(simpleData));

		const candidateData = Gllue.extractIdAndEmail(simpleData);
		const source = item.source as string;
		const consentService = new ConsentService(this.helpers.request);

		const consented = await consentService.getConsented(candidateData.id, source, EMAIL_CHANNEL);
		console.log('DEBUG: consented row=', consented);

		const sent = await consentService.getSentIn30Days(candidateData.id, source, EMAIL_CHANNEL);
		console.log('DEBUG: consent sent in 30 days=', sent);

		const service = new SendEmailOnConsentService(consented, sent, candidateData.cvsentField);


		const envVar = process.env.NODE_ENV;
		console.log('DEBUG: env var=', envVar);

		let emailData = {};
		if (service.canSendEmail()) {
			const saved = await consentService.create(candidateData.id, source, EMAIL_CHANNEL);
			console.log('DEBUG: saved consent', JSON.stringify(saved));
			const emailService = new EmailNotificationService(this.helpers.request);
			const email = await emailService.saveConsentEmail(candidateData.email);
			const track_id = email.insert_email_notification.returning[0].track_id;
			console.log('DEBUG: track_id', track_id);

			const updated = await consentService.updateTrackId(saved.id as string, track_id);
			console.log('DEBUG: updated=', updated);

			const consentConfirmUrl = buildConsentUrl(saved.id as string);
			console.log('DEBUG: consent confirm url=', consentConfirmUrl);

			emailData = {
				senderEmail: CONSENT_FROM_EMAIL,
				senderName: CONSENT_FROM_NAME,
				recipientEmail: candidateData.email,
				dynamicTemplateFields: {consentLink: consentConfirmUrl},
				category: CONSENT_EMAIL_CATEGORY,
				trackId: track_id,
			};
		}
		const responseData = service.canSendEmail() ? emailData : [];
		console.log('DEBUG: response=', responseData);
		return [this.helpers.returnJsonArray(responseData)];

	}

}

