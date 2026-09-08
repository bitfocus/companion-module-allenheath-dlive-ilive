const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const { buildTalkbackCommand } = require('../protocol')

describe('buildTalkbackCommand', () => {
	it('matches the captured dLive 2.11 Talk On packet', () => {
		assert.equal(buildTalkbackCommand(true).toString('hex'), 'f100010000005500000053000010f30000000101f8')
	})

	it('matches the captured dLive 2.11 Talk Off packet', () => {
		assert.equal(buildTalkbackCommand(false).toString('hex'), 'f100010000005500000053000010f30000000100f8')
	})
})
