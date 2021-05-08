const { expectRevert } = require("@openzeppelin/test-helpers");
const { assert } = require("chai");

const GatorToken = artifacts.require('GatorToken');

contract('GatorToken', ([alice, bob, carol, operator, owner]) => {
    beforeEach(async () => {
        this.Gator = await GatorToken.new({ from: owner });
        this.burnAddress = '0x000000000000000000000000000000000000dEaD';
        this.zeroAddress = '0x0000000000000000000000000000000000000000';
    });

    it('only operator', async () => {
        assert.equal((await this.Gator.owner()), owner);
        assert.equal((await this.Gator.operator()), owner);

        await expectRevert(this.Gator.updateTransferTaxRate(700, { from: operator }), 'operator: caller is not the operator');
        await expectRevert(this.Gator.updateBurnRate(20, { from: operator }), 'operator: caller is not the operator');
        await expectRevert(this.Gator.updateMaxTransferAmountRate(100, { from: operator }), 'operator: caller is not the operator');
        await expectRevert(this.Gator.updateSwapAndLiquifyEnabled(true, { from: operator }), 'operator: caller is not the operator');
        await expectRevert(this.Gator.setExcludedFromAntiWhale(operator, { from: operator }), 'operator: caller is not the operator');
        await expectRevert(this.Gator.updateGatorSwapRouter(operator, { from: operator }), 'operator: caller is not the operator');
        await expectRevert(this.Gator.updateMinAmountToLiquify(100, { from: operator }), 'operator: caller is not the operator');
        await expectRevert(this.Gator.transferOperator(alice, { from: operator }), 'operator: caller is not the operator');
    });

    it('transfer operator', async () => {
        await expectRevert(this.Gator.transferOperator(operator, { from: operator }), 'operator: caller is not the operator');
        await this.Gator.transferOperator(operator, { from: owner });
        assert.equal((await this.Gator.operator()), operator);

        await expectRevert(this.Gator.transferOperator(this.zeroAddress, { from: operator }), 'Gator::transferOperator: new operator is the zero address');
    });

    it('update transfer tax rate', async () => {
        await this.Gator.transferOperator(operator, { from: owner });
        assert.equal((await this.Gator.operator()), operator);

        assert.equal((await this.Gator.transferTaxRate()).toString(), '700');
        assert.equal((await this.Gator.burnRate()).toString(), '20');

        await this.Gator.updateTransferTaxRate(0, { from: operator });
        assert.equal((await this.Gator.transferTaxRate()).toString(), '0');
        await this.Gator.updateTransferTaxRate(1000, { from: operator });
        assert.equal((await this.Gator.transferTaxRate()).toString(), '1000');
        await expectRevert(this.Gator.updateTransferTaxRate(1001, { from: operator }), 'Gator::updateTransferTaxRate: Transfer tax rate must not exceed the maximum rate.');

        await this.Gator.updateBurnRate(0, { from: operator });
        assert.equal((await this.Gator.burnRate()).toString(), '0');
        await this.Gator.updateBurnRate(100, { from: operator });
        assert.equal((await this.Gator.burnRate()).toString(), '100');
        await expectRevert(this.Gator.updateBurnRate(101, { from: operator }), 'Gator::updateBurnRate: Burn rate must not exceed the maximum rate.');
    });

    it('transfer', async () => {
        await this.Gator.transferOperator(operator, { from: owner });
        assert.equal((await this.Gator.operator()), operator);

        await this.Gator.mint(alice, 10000000, { from: owner }); // max transfer amount 25,000
        assert.equal((await this.Gator.balanceOf(alice)).toString(), '10000000');
        assert.equal((await this.Gator.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.Gator.balanceOf(this.Gator.address)).toString(), '0');

        await this.Gator.transfer(bob, 12345, { from: alice });
        assert.equal((await this.Gator.balanceOf(alice)).toString(), '9987655');
        assert.equal((await this.Gator.balanceOf(bob)).toString(), '11728');
        assert.equal((await this.Gator.balanceOf(this.burnAddress)).toString(), '123');
        assert.equal((await this.Gator.balanceOf(this.Gator.address)).toString(), '494');

        await this.Gator.approve(carol, 22345, { from: alice });
        await this.Gator.transferFrom(alice, carol, 22345, { from: carol });
        assert.equal((await this.Gator.balanceOf(alice)).toString(), '9965310');
        assert.equal((await this.Gator.balanceOf(carol)).toString(), '21228');
        assert.equal((await this.Gator.balanceOf(this.burnAddress)).toString(), '346');
        assert.equal((await this.Gator.balanceOf(this.Gator.address)).toString(), '1388');
    });

    it('transfer small amount', async () => {
        await this.Gator.transferOperator(operator, { from: owner });
        assert.equal((await this.Gator.operator()), operator);

        await this.Gator.mint(alice, 10000000, { from: owner });
        assert.equal((await this.Gator.balanceOf(alice)).toString(), '10000000');
        assert.equal((await this.Gator.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.Gator.balanceOf(this.Gator.address)).toString(), '0');

        await this.Gator.transfer(bob, 19, { from: alice });
        assert.equal((await this.Gator.balanceOf(alice)).toString(), '9999981');
        assert.equal((await this.Gator.balanceOf(bob)).toString(), '19');
        assert.equal((await this.Gator.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.Gator.balanceOf(this.Gator.address)).toString(), '0');
    });

    it('transfer without transfer tax', async () => {
        await this.Gator.transferOperator(operator, { from: owner });
        assert.equal((await this.Gator.operator()), operator);

        assert.equal((await this.Gator.transferTaxRate()).toString(), '700');
        assert.equal((await this.Gator.burnRate()).toString(), '20');

        await this.Gator.updateTransferTaxRate(0, { from: operator });
        assert.equal((await this.Gator.transferTaxRate()).toString(), '0');

        await this.Gator.mint(alice, 10000000, { from: owner });
        assert.equal((await this.Gator.balanceOf(alice)).toString(), '10000000');
        assert.equal((await this.Gator.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.Gator.balanceOf(this.Gator.address)).toString(), '0');

        await this.Gator.transfer(bob, 10000, { from: alice });
        assert.equal((await this.Gator.balanceOf(alice)).toString(), '9990000');
        assert.equal((await this.Gator.balanceOf(bob)).toString(), '10000');
        assert.equal((await this.Gator.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.Gator.balanceOf(this.Gator.address)).toString(), '0');
    });

    it('transfer without burn', async () => {
        await this.Gator.transferOperator(operator, { from: owner });
        assert.equal((await this.Gator.operator()), operator);

        assert.equal((await this.Gator.transferTaxRate()).toString(), '700');
        assert.equal((await this.Gator.burnRate()).toString(), '20');

        await this.Gator.updateBurnRate(0, { from: operator });
        assert.equal((await this.Gator.burnRate()).toString(), '0');

        await this.Gator.mint(alice, 10000000, { from: owner });
        assert.equal((await this.Gator.balanceOf(alice)).toString(), '10000000');
        assert.equal((await this.Gator.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.Gator.balanceOf(this.Gator.address)).toString(), '0');

        await this.Gator.transfer(bob, 1234, { from: alice });
        assert.equal((await this.Gator.balanceOf(alice)).toString(), '9998766');
        assert.equal((await this.Gator.balanceOf(bob)).toString(), '1173');
        assert.equal((await this.Gator.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.Gator.balanceOf(this.Gator.address)).toString(), '61');
    });

    it('transfer all burn', async () => {
        await this.Gator.transferOperator(operator, { from: owner });
        assert.equal((await this.Gator.operator()), operator);

        assert.equal((await this.Gator.transferTaxRate()).toString(), '700');
        assert.equal((await this.Gator.burnRate()).toString(), '20');

        await this.Gator.updateBurnRate(100, { from: operator });
        assert.equal((await this.Gator.burnRate()).toString(), '100');

        await this.Gator.mint(alice, 10000000, { from: owner });
        assert.equal((await this.Gator.balanceOf(alice)).toString(), '10000000');
        assert.equal((await this.Gator.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.Gator.balanceOf(this.Gator.address)).toString(), '0');

        await this.Gator.transfer(bob, 1234, { from: alice });
        assert.equal((await this.Gator.balanceOf(alice)).toString(), '9998766');
        assert.equal((await this.Gator.balanceOf(bob)).toString(), '1173');
        assert.equal((await this.Gator.balanceOf(this.burnAddress)).toString(), '61');
        assert.equal((await this.Gator.balanceOf(this.Gator.address)).toString(), '0');
    });

    it('max transfer amount', async () => {
        assert.equal((await this.Gator.maxTransferAmountRate()).toString(), '50');
        assert.equal((await this.Gator.maxTransferAmount()).toString(), '0');

        await this.Gator.mint(alice, 1000000, { from: owner });
        assert.equal((await this.Gator.maxTransferAmount()).toString(), '5000');

        await this.Gator.mint(alice, 1000, { from: owner });
        assert.equal((await this.Gator.maxTransferAmount()).toString(), '5005');

        await this.Gator.transferOperator(operator, { from: owner });
        assert.equal((await this.Gator.operator()), operator);

        await this.Gator.updateMaxTransferAmountRate(100, { from: operator }); // 1%
        assert.equal((await this.Gator.maxTransferAmount()).toString(), '10010');
    });

    it('anti whale', async () => {
        await this.Gator.transferOperator(operator, { from: owner });
        assert.equal((await this.Gator.operator()), operator);

        assert.equal((await this.Gator.isExcludedFromAntiWhale(operator)), false);
        await this.Gator.setExcludedFromAntiWhale(operator, true, { from: operator });
        assert.equal((await this.Gator.isExcludedFromAntiWhale(operator)), true);

        await this.Gator.mint(alice, 10000, { from: owner });
        await this.Gator.mint(bob, 10000, { from: owner });
        await this.Gator.mint(carol, 10000, { from: owner });
        await this.Gator.mint(operator, 10000, { from: owner });
        await this.Gator.mint(owner, 10000, { from: owner });

        // total supply: 50,000, max transfer amount: 250
        assert.equal((await this.Gator.maxTransferAmount()).toString(), '250');
        await expectRevert(this.Gator.transfer(bob, 251, { from: alice }), 'Gator::antiWhale: Transfer amount exceeds the maxTransferAmount');
        await this.Gator.approve(carol, 251, { from: alice });
        await expectRevert(this.Gator.transferFrom(alice, carol, 251, { from: carol }), 'Gator::antiWhale: Transfer amount exceeds the maxTransferAmount');

        //
        await this.Gator.transfer(bob, 250, { from: alice });
        await this.Gator.transferFrom(alice, carol, 250, { from: carol });

        await this.Gator.transfer(this.burnAddress, 251, { from: alice });
        await this.Gator.transfer(operator, 251, { from: alice });
        await this.Gator.transfer(owner, 251, { from: alice });
        await this.Gator.transfer(this.Gator.address, 251, { from: alice });

        await this.Gator.transfer(alice, 251, { from: operator });
        await this.Gator.transfer(alice, 251, { from: owner });
        await this.Gator.transfer(owner, 251, { from: operator });
    });

    it('update SwapAndLiquifyEnabled', async () => {
        await expectRevert(this.Gator.updateSwapAndLiquifyEnabled(true, { from: operator }), 'operator: caller is not the operator');
        assert.equal((await this.Gator.swapAndLiquifyEnabled()), false);

        await this.Gator.transferOperator(operator, { from: owner });
        assert.equal((await this.Gator.operator()), operator);

        await this.Gator.updateSwapAndLiquifyEnabled(true, { from: operator });
        assert.equal((await this.Gator.swapAndLiquifyEnabled()), true);
    });

    it('update min amount to liquify', async () => {
        await expectRevert(this.Gator.updateMinAmountToLiquify(100, { from: operator }), 'operator: caller is not the operator');
        assert.equal((await this.Gator.minAmountToLiquify()).toString(), '500000000000000000000');

        await this.Gator.transferOperator(operator, { from: owner });
        assert.equal((await this.Gator.operator()), operator);

        await this.Gator.updateMinAmountToLiquify(100, { from: operator });
        assert.equal((await this.Gator.minAmountToLiquify()).toString(), '100');
    });
});
