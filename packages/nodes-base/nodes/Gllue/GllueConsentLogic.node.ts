import {IExecuteFunctions,} from 'n8n-core';

import {IDataObject, INodeExecutionData, INodeType, INodeTypeDescription,} from 'n8n-workflow';
import {
	ConsentedConsentAPIEndpoint,
	CreateConsentAPIEndpoint,
	Gllue,
	SendEmailOnConsentService,
	SentConsentAPIEndpoint
} from './GenericFunctions';
import {BLUE_GLLUE_SOURCE, EMAIL_CHANNEL} from './constants';

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
		const consentedEndpoint = new ConsentedConsentAPIEndpoint(this.helpers.request, candidateData.id, BLUE_GLLUE_SOURCE, EMAIL_CHANNEL);
		const consented = await consentedEndpoint.post();
		console.log('DEBUG: consented row=', consented);
		const sentEndpoint = new SentConsentAPIEndpoint(this.helpers.request, candidateData.id, BLUE_GLLUE_SOURCE, EMAIL_CHANNEL);
		const sent = await sentEndpoint.post();
		console.log('DEBUG: consent sent in 30 days=', sent);
		const service = new SendEmailOnConsentService(consented, sent, candidateData.cvsentField);

		const responseData = service.canSendEmail() ? [candidateData] : [];
		console.log('DEBUG: response=', responseData);
		const envVar = process.env.NODE_ENV;
		console.log('DEBUG: env var=', envVar);

		if (service.canSendEmail()) {
			const saveEndpoint = new CreateConsentAPIEndpoint(this.helpers.request, candidateData.id, BLUE_GLLUE_SOURCE, EMAIL_CHANNEL);
			const saved = await saveEndpoint.post();
			console.log('DEBUG: saved consent', JSON.stringify(saved));
		}
		return [this.helpers.returnJsonArray(responseData)];

	}

}
