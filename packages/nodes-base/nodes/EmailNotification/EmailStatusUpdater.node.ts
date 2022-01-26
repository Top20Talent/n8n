import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import {buildPayloadFromEvent, buildUrlFromId, EmailNotificationService} from './services';



export class EmailStatusUpdater implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Email Status Updater',
		name: 'emailStatusUpdater',
		icon: 'file:email-search-svgrepo-com.svg',
		group: ['transform'],
		version: 1,
		description: 'Update status/actions for email notifications',
		defaults: {
			name: 'Email Status Updater',
			color: '#1A82e2',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [],
		properties: [
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const item = this.getInputData()[0].json;

		interface SendGridEventBody extends IDataObject {
			event: string;
			timestamp: number;
			trackId: string;
		}

		const body = item.body as SendGridEventBody;
		const service = new EmailNotificationService(this.helpers.request);
		const email = await service.getEmailByTrackId(body.trackId);
		const url = buildUrlFromId(email.id);
		const payload = buildPayloadFromEvent(email.id, body.event, body.timestamp);
		const response = await service.updateEmailById.post(payload);
		return [this.helpers.returnJsonArray(response)];
	}
}
