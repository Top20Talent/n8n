import {ErrorMessageBuilder, TokenValidator} from '../../../nodes/Gllue/GenericFunctions';

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
	it('should set hander', ()=>{
		const resp = {writeHead: jest.fn(), end: jest.fn()};
		const builder = new ErrorMessageBuilder(resp, 'webhook', 403);
		builder.handle();
		expect(resp.writeHead).toHaveBeenCalledWith(403, {'WWW-Authenticate': 'Basic realm="webhook"'});
	});
	it('should return no webhook response', ()=>{
		const resp = {writeHead: jest.fn(), end: jest.fn()};
		const builder = new ErrorMessageBuilder(resp, 'webhook', 403);
		expect(builder.handle()).toEqual({noWebhookResponse: true});
	});
});

describe('token validator', ()=>{
	it('should miss on empty token', ()=>{
		const validator = new TokenValidator(undefined, 'expected-token');
		expect(validator.isMissing()).toBeTruthy();
	});
	it('should wrong on different token', ()=>{
		const validator = new TokenValidator('token', 'expected-token');
		expect(validator.isWrong()).toBeTruthy();
	});
});
