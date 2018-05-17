global.chai = require('chai');
global.chai.use(require('chai-as-promised'));
global.chai.use(require('sinon-chai'));
global.expect = global.chai.expect;
global.sinon = require('sinon');

beforeEach(function () {
	this.sandbox = global.sinon.createSandbox();
	global.spy = this.sandbox.spy.bind(this.sandbox);
	global.stub = this.sandbox.stub.bind(this.sandbox);
});

afterEach(function () {
	delete global.spy;
	delete global.stub;
	this.sandbox.restore();
});

process.env.SNOOPLOGG_MIN_BRIGHTNESS = '100';

global.expectThrow = function expectThrow(fn, meta) {
	try {
		fn();
	} catch (e) {
		expect(e).to.be.instanceof(meta.type);

		if (meta.msg !== undefined) {
			expect(e.message).to.equal(meta.msg);
		}

		if (meta.code !== undefined) {
			expect(e.code).to.equal(meta.code);
		}

		expect(e.meta).to.be.an('object');

		for (const key of Object.keys(meta)) {
			if (!/^(type|code|msg)$/.test(key)) {
				expect(e.meta[key]).to.equal(meta[key]);
			}
		}

		return;
	}

	throw new Error(`Expected function to throw ${meta.type.name || meta.type}`);
};
