import {EmailNotificationService} from '../../../nodes/EmailNotification/services';

const ID = '4abd58ed-5bf0-4c9c-a602-1361149d6cbe';
const DATETIME = 1643003936;
const TIMESTAMP = '2022-01-24T13:58:56+08:00';
const service = new EmailNotificationService(jest.fn());

describe('status payload builder', () => {
	it('should build status event', () => {
		const event = 'delivered';
		const payload = service.buildPayloadFromEvent(ID, event);
		const expectData = {
			id: ID,
			data: {status: 'delivered'},
		};
		expect(payload).toEqual(expectData);
	});
	it('should build click action', () => {
		const event = 'click';
		const payload = service.buildPayloadFromEvent(ID, event, DATETIME);
		const expectData = {
			id: ID,
			data: {is_clicked: true, clicked_at: TIMESTAMP},
		};
		expect(payload).toEqual(expectData);
	});
		it('should build open action', () => {
		const event = 'open';
		const payload = service.buildPayloadFromEvent(ID, event, DATETIME);
		const expectData = {
			id: ID,
			data: {is_opened: true, opened_at: TIMESTAMP},
		};
		expect(payload).toEqual(expectData);
	});
});
