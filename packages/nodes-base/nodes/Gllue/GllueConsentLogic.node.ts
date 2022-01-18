import {IExecuteFunctions,} from 'n8n-core';

import {IDataObject, INodeExecutionData, INodeType, INodeTypeDescription,} from 'n8n-workflow';
import {Gllue} from './GenericFunctions';

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
		let responseData = {};
		const credentials = await this.getCredentials('gllueApi') as IDataObject;
		const timestamp = helpers.getCurrentTimeStamp();
		const token = helpers.generateTokenWithAESKey(timestamp, credentials.apiUsername, credentials.apiAesKey);
		console.log('DEBUG: api user name=', credentials.apiUsername);
		const gllue = new Gllue(credentials.apiHost as string, token, this.helpers.request);
		responseData = await gllue.getDetail(resource, resourceId, 'id,jobsubmission__candidate__email');
		console.log('DEBUG:response data=', responseData);
		return [this.helpers.returnJsonArray(responseData)];
	}

}

