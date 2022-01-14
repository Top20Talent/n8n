import {
	IHookFunctions,
	IWebhookFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
} from 'n8n-workflow';
import {Response} from 'express';

/*
import {
	autofriendApiRequest,
} from './GenericFunctions';

import {
	snakeCase,
} from 'change-case';
*/

function authorizationError(resp: Response, realm: string, responseCode: number, message?: string) {
	if (message === undefined) {
		message = 'Authorization problem!';
		if (responseCode === 401) {
			message = 'Authorization is required!';
		} else if (responseCode === 403) {
			message = 'Authorization data is wrong!';
		}
	}

	resp.writeHead(responseCode, {'WWW-Authenticate': `Basic realm="${realm}"`});
	resp.end(message);
	return {
		noWebhookResponse: true,
	};
}


export class GllueTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Gllue Trigger',
		name: 'gllueTrigger',
		icon: 'file:gllue.svg',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["event"]}}',
		description: 'Handle Gllue events via webhooks',
		defaults: {
			name: 'Gllue Trigger',
			color: '#6ad7b9',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'gllueTriggerApi',
				required: true,
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [{
			displayName: 'Event',
			name: 'event',
			type: 'options',
			required: true,
			default: '',
			options: [
				{
					name: 'CV Sent',
					value: 'cvsent',
				},
				{
					name: 'Interview',
					value: 'clientinterview',
				},
			],
		},
		],
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const credentials = await this.getCredentials('gllueTriggerApi') as IDataObject;
		const expectedToken = credentials.apiToken as string;
		const req = this.getRequestObject();
		const token = req.query.token as string;
		const resp = this.getResponseObject();
		const realm = 'Webhook';

		if (token === undefined) {
			// Authorization data is missing
			return authorizationError(resp, realm, 401);
		}
		if (token !== expectedToken) {
			// Provided authentication data is wrong
			return authorizationError(resp, realm, 403);
		}
		return {
			workflowData: [this.helpers.returnJsonArray(req.body)],
		};
	}
}
