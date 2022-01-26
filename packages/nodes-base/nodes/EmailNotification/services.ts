import {Hasura, N8nRequest} from '../Gllue/GenericFunctions';
import moment = require('moment');
import {SENDGRID_ACTIONS} from './constants';

class EmailAPI extends Hasura {
	resource = 'email';
}

export class GetEmailByTrackIdAPIEndpoint extends EmailAPI {
	action = 'by-track-id';

	getUrl(id?: string) {
		return `${this.apiHost}/${this.resource}/${this.action}/${id}`;
	}
}

export class EmailNotificationService {
	getEmailByTrackIdEndpoint: GetEmailByTrackIdAPIEndpoint;

	constructor(request: N8nRequest) {
		this.getEmailByTrackIdEndpoint = new GetEmailByTrackIdAPIEndpoint(request);
	}

	async getEmailByTrackId(id: string){
		return await this.getEmailByTrackIdEndpoint.get(id);
	}
}

function buildDataByAction(action: string, datetime: number){
	const timestamp = moment.unix(datetime).format();
	return action === 'click' ? {is_clicked: true, clicked_at: timestamp} :
		{is_opened: true, opened_at: timestamp};
}
export function buildPayloadFromEvent(id: string, event: string, datetime=0){
	const status = {id, data: {status: event}};
	const data = buildDataByAction(event, datetime);
	const action = {id, data};
	return SENDGRID_ACTIONS.includes(event)? action : status;
}

export function buildUrlFromId(id: string): string{
	return `http://localhost:8083/api/rest/email/${id}/update`;
}
