const { expectRevert } = require('@openzeppelin/test-helpers');
const { assert } = require("chai");

const GatorReferral = artifacts.require('GatorReferral');

contract('GatorReferral', ([alice, bob, carol, referrer, operator, owner]) => {
    beforeEach(async () => {
        this.GatorReferral = await GatorReferral.new({ from: owner });
        this.zeroAddress = '0x0000000000000000000000000000000000000000';
    });

    it('should allow operator and only owner to update operator', async () => {
        assert.equal((await this.GatorReferral.operators(operator)).valueOf(), false);
        await expectRevert(this.GatorReferral.recordReferral(alice, referrer, { from: operator }), 'Operator: caller is not the operator');

        await expectRevert(this.GatorReferral.updateOperator(operator, true, { from: carol }), 'Ownable: caller is not the owner');
        await this.GatorReferral.updateOperator(operator, true, { from: owner });
        assert.equal((await this.GatorReferral.operators(operator)).valueOf(), true);

        await this.GatorReferral.updateOperator(operator, false, { from: owner });
        assert.equal((await this.GatorReferral.operators(operator)).valueOf(), false);
        await expectRevert(this.GatorReferral.recordReferral(alice, referrer, { from: operator }), 'Operator: caller is not the operator');
    });

    it('record referral', async () => {
        assert.equal((await this.GatorReferral.operators(operator)).valueOf(), false);
        await this.GatorReferral.updateOperator(operator, true, { from: owner });
        assert.equal((await this.GatorReferral.operators(operator)).valueOf(), true);

        await this.GatorReferral.recordReferral(this.zeroAddress, referrer, { from: operator });
        await this.GatorReferral.recordReferral(alice, this.zeroAddress, { from: operator });
        await this.GatorReferral.recordReferral(this.zeroAddress, this.zeroAddress, { from: operator });
        await this.GatorReferral.recordReferral(alice, alice, { from: operator });
        assert.equal((await this.GatorReferral.getReferrer(alice)).valueOf(), this.zeroAddress);
        assert.equal((await this.GatorReferral.referralsCount(referrer)).valueOf(), '0');

        await this.GatorReferral.recordReferral(alice, referrer, { from: operator });
        assert.equal((await this.GatorReferral.getReferrer(alice)).valueOf(), referrer);
        assert.equal((await this.GatorReferral.referralsCount(referrer)).valueOf(), '1');

        assert.equal((await this.GatorReferral.referralsCount(bob)).valueOf(), '0');
        await this.GatorReferral.recordReferral(alice, bob, { from: operator });
        assert.equal((await this.GatorReferral.referralsCount(bob)).valueOf(), '0');
        assert.equal((await this.GatorReferral.getReferrer(alice)).valueOf(), referrer);

        await this.GatorReferral.recordReferral(carol, referrer, { from: operator });
        assert.equal((await this.GatorReferral.getReferrer(carol)).valueOf(), referrer);
        assert.equal((await this.GatorReferral.referralsCount(referrer)).valueOf(), '2');
    });

    it('record referral commission', async () => {
        assert.equal((await this.GatorReferral.totalReferralCommissions(referrer)).valueOf(), '0');

        await expectRevert(this.GatorReferral.recordReferralCommission(referrer, 1, { from: operator }), 'Operator: caller is not the operator');
        await this.GatorReferral.updateOperator(operator, true, { from: owner });
        assert.equal((await this.GatorReferral.operators(operator)).valueOf(), true);

        await this.GatorReferral.recordReferralCommission(referrer, 1, { from: operator });
        assert.equal((await this.GatorReferral.totalReferralCommissions(referrer)).valueOf(), '1');

        await this.GatorReferral.recordReferralCommission(referrer, 0, { from: operator });
        assert.equal((await this.GatorReferral.totalReferralCommissions(referrer)).valueOf(), '1');

        await this.GatorReferral.recordReferralCommission(referrer, 111, { from: operator });
        assert.equal((await this.GatorReferral.totalReferralCommissions(referrer)).valueOf(), '112');

        await this.GatorReferral.recordReferralCommission(this.zeroAddress, 100, { from: operator });
        assert.equal((await this.GatorReferral.totalReferralCommissions(this.zeroAddress)).valueOf(), '0');
    });
});
