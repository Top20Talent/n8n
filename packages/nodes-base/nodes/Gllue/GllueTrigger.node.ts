import {IWebhookFunctions,} from 'n8n-core';

import {IDataObject, INodeType, INodeTypeDescription, IWebhookResponseData,} from 'n8n-workflow';
import {convertEventPayload} from './helpers';
import {ErrorMessageBuilder, EventChecker, TokenValidator} from './GenericFunctions';

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

		const validator = new TokenValidator(token, expectedToken);
		if (validator.isMissing()) {
			const builder = new ErrorMessageBuilder(resp, realm, 401);
			return builder.handle();
		}
		if (validator.isWrong()) {
			const builder = new ErrorMessageBuilder(resp, realm, 403);
			return builder.handle();
		}

		const item = convertEventPayload(req.body);
		const event = this.getNodeParameter('event') as string;
		// @ts-ignore
		if (EventChecker.isValid(item.info.trigger_model_name, event)) {
			return {workflowData: [this.helpers.returnJsonArray(item)],};
		} else {
			const builder = new ErrorMessageBuilder(resp, realm, 202);
			return builder.handle();
		}
	}
}
