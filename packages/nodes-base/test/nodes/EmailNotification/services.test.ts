import {buildPayloadFromEvent, buildUrlFromId} from '../../../nodes/EmailNotification/services';

const ID = '4abd58ed-5bf0-4c9c-a602-1361149d6cbe';
const DATETIME = 1643003936;
const TIMESTAMP = '2022-01-24T13:58:56+08:00';

describe('status payload builder', () => {
	it('should build status event', () => {
		const event = 'delivered';
		const payload = buildPayloadFromEvent(ID, event);
		const expectData = {
			id: ID,
			data: {status: 'delivered'},
		};
		expect(payload).toEqual(expectData);
	});
	it('should build click action', () => {
		const event = 'click';
		const payload = buildPayloadFromEvent(ID, event, DATETIME);
		const expectData = {
			id: ID,
			data: {is_clicked: true, clicked_at: TIMESTAMP},
		};
		expect(payload).toEqual(expectData);
	});
		it('should build open action', () => {
		const event = 'open';
		const payload = buildPayloadFromEvent(ID, event, DATETIME);
		const expectData = {
			id: ID,
			data: {is_opened: true, opened_at: TIMESTAMP},
		};
		expect(payload).toEqual(expectData);
	});
});

describe('build url from event', ()=>{
	it('should build url from status', ()=>{
		const url = buildUrlFromId(ID);
		expect(url).toEqual(
			'http://localhost:8083/api/rest/email/4abd58ed-5bf0-4c9c-a602-1361149d6cbe/update');
	});
});
