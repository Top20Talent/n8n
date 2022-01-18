import {
	ErrorMessageBuilder,
	EventChecker,
	Gllue,
	TokenValidator
} from '../../../nodes/Gllue/GenericFunctions';
import {CV_SENT_EVENT, INTERVIEW_EVENT} from '../../../nodes/Gllue/constants';

describe('error message builder', () => {
	it('should return on undefined', () => {
		const message = ErrorMessageBuilder.getMessage();
		expect(message).toEqual('Authorization problem!');
	});
	it('should return on 401', () => {
		const message = ErrorMessageBuilder.getMessage(401);
		expect(message).toEqual('Authorization is required!');
	});
	it('should return on 403', () => {
		const message = ErrorMessageBuilder.getMessage(403);
		expect(message).toEqual('Authorization data is wrong!');
	});
	it('should return on 202', () => {
		const message = ErrorMessageBuilder.getMessage(202);
		expect(message).toEqual('Skipped, event is not the same with webhook.');
	});
	it('should build headers with realm', () => {
		const header = ErrorMessageBuilder.getHeader('webhook');
		expect(header).toEqual({'WWW-Authenticate': 'Basic realm="webhook"'});
	});
	it('should set message', () => {
		const resp = {writeHead: jest.fn(), end: jest.fn()};
		const builder = new ErrorMessageBuilder(resp, 'webhook', 401);
		builder.handle();
		expect(resp.end).toHaveBeenCalledWith('Authorization is required!');
	});
	it('should set hander', () => {
		const resp = {writeHead: jest.fn(), end: jest.fn()};
		const builder = new ErrorMessageBuilder(resp, 'webhook', 403);
		builder.handle();
		expect(resp.writeHead).toHaveBeenCalledWith(403, {'WWW-Authenticate': 'Basic realm="webhook"'});
	});
	it('should return no webhook response', () => {
		const resp = {writeHead: jest.fn(), end: jest.fn()};
		const builder = new ErrorMessageBuilder(resp, 'webhook', 403);
		expect(builder.handle()).toEqual({noWebhookResponse: true});
	});
});

describe('token validator', () => {
	it('should miss on empty token', () => {
		const validator = new TokenValidator(undefined, 'expected-token');
		expect(validator.isMissing()).toBeTruthy();
	});
	it('should wrong on different token', () => {
		const validator = new TokenValidator('token', 'expected-token');
		expect(validator.isWrong()).toBeTruthy();
	});
});

describe('event check', () => {
	it('should be true on same event', () => {
		expect(EventChecker.isValid('cvsent', CV_SENT_EVENT)).toBeTruthy();
	});
	it('should be false on different event', () => {
		expect(EventChecker.isValid('cvsent', INTERVIEW_EVENT)).toBeFalsy();
	});
});

const SIMPLE_RESPONSE = {ids: [1234], result: {candidate: [{id: 1234, email: 'fake@email.com'}]}};
describe('gllue api', () => {
	it('should parse id', () => {
		const out = Gllue.extractIdAndEmail(SIMPLE_RESPONSE);
		expect(out.id).toEqual(1234);
	});
	it('should parse email', () => {
		const out = Gllue.extractIdAndEmail(SIMPLE_RESPONSE);
		expect(out.email).toEqual('fake@email.com');
	});
});
