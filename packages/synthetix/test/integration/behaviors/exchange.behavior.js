const ethers = require('ethers');
const chalk = require('chalk');
const { assert } = require('../../contracts/common');
const { toBytes32 } = require('../../../index');
const { ensureBalance } = require('../utils/balances');
const { skipWaitingPeriod } = require('../utils/skip');
const { updateCache } = require('../utils/rates');

function itCanExchange({ ctx }) {
	describe('exchanging and settling', () => {
		const mUSDAmount = ethers.utils.parseEther('100');

		let owner;
		let balancemETH, originialPendingSettlements;
		let Synthetix, Exchanger, SynthmETH;

		before('target contracts and users', () => {
			({ Synthetix, Exchanger, SynthmETH } = ctx.contracts);

			owner = ctx.users.owner;
		});

		before('ensure the owner has mUSD', async () => {
			await ensureBalance({ ctx, symbol: 'mUSD', user: owner, balance: mUSDAmount });
		});

		describe('when the owner exchanges mUSD to mETH', () => {
			before('record balances', async () => {
				balancemETH = await SynthmETH.balanceOf(owner.address);
			});

			before('record pending settlements', async () => {
				const { numEntries } = await Exchanger.settlementOwing(owner.address, toBytes32('mETH'));

				originialPendingSettlements = numEntries;
			});

			before('perform the exchange', async () => {
				Synthetix = Synthetix.connect(owner);

				await updateCache({ ctx });

				const tx = await Synthetix.exchange(toBytes32('mUSD'), mUSDAmount, toBytes32('mETH'));
				const { gasUsed } = await tx.wait();
				console.log(`exchange() gas used: ${Math.round(gasUsed / 1000).toString()}k`);
			});

			it('receives the expected amount of mETH', async () => {
				const [expectedAmount, ,] = await Exchanger.getAmountsForExchange(
					mUSDAmount,
					toBytes32('mUSD'),
					toBytes32('mETH')
				);

				assert.bnEqual(await SynthmETH.balanceOf(owner.address), balancemETH.add(expectedAmount));
			});

			before('skip if waiting period is zero', async function() {
				const waitingPeriodSecs = await Exchanger.waitingPeriodSecs();
				if (waitingPeriodSecs.toString() === '0') {
					console.log(
						chalk.yellow('> Skipping pending settlement checks because waiting period is zero.')
					);
					this.skip();
				}
			});

			it('shows that the user now has pending settlements', async () => {
				const { numEntries } = await Exchanger.settlementOwing(owner.address, toBytes32('mETH'));

				assert.bnEqual(numEntries, originialPendingSettlements.add(ethers.constants.One));
			});

			describe('when settle is called', () => {
				before('skip waiting period', async () => {
					await skipWaitingPeriod({ ctx });
				});

				before('settle', async () => {
					const tx = await Synthetix.settle(toBytes32('mETH'));
					const { gasUsed } = await tx.wait();
					console.log(`settle() gas used: ${Math.round(gasUsed / 1000).toString()}k`);
				});

				it('shows that the user no longer has pending settlements', async () => {
					const { numEntries } = await Exchanger.settlementOwing(owner.address, toBytes32('mETH'));

					assert.bnEqual(numEntries, ethers.constants.Zero);
				});
			});
		});
	});
}

module.exports = {
	itCanExchange,
};
