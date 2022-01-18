import {IExecuteFunctions,} from 'n8n-core';

import {IDataObject, INodeExecutionData, INodeType, INodeTypeDescription,} from 'n8n-workflow';
import { ConsentedConsentAPIEndpint, Gllue, SentConsentAPIEndpoint} from './GenericFunctions';
import {getOffSetDate} from './helpers';

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

		console.log('DEBUG:response data=', simpleData);

		const candidateData = Gllue.extractIdAndEmail(simpleData);
		const consentedEndpoint = new ConsentedConsentAPIEndpint(this.helpers.request, candidateData.id);
		const consented = await consentedEndpoint.post();
		console.log('DEBUG: consented row=', consented);
		const date30DaysBefore = getOffSetDate(-30);
		console.log('DEBUG: date =', date30DaysBefore);
		const sentEndpoint = new SentConsentAPIEndpoint(this.helpers.request, candidateData.id, date30DaysBefore);
		const sent = await sentEndpoint.post();
		console.log('DEBUG: consent sent in 30 days=', sent);
		return [this.helpers.returnJsonArray(consented)];
	}

}

