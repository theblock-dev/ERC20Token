const ERCToken = artifacts.require('ERC20Token.sol');
const { expectRevert, time} = require('@openzeppelin/test-helpers');
const expectEvent = require('@openzeppelin/test-helpers/src/expectEvent');
const { web3 } = require('@openzeppelin/test-helpers/src/setup');

contract('ERC20Token', function(accounts){
    let tokenInstance;
    let initialBalance = web3.utils.toBN(web3.utils.toWei('1000000','ether'));
    beforeEach(async()=>{
        tokenInstance = await ERCToken.new();
    });

    it('should give the name, symbol, total supply correctly', async()=>{
        let name = await tokenInstance.name();
        let symbol = await tokenInstance.symbol();
        let totalSupply = await tokenInstance.totalSupply();

        assert(name === 'ERC20Token');
        assert(symbol === 'ERT');
        // console.log(initialBalance);
        // console.log(totalSupply);
        assert(totalSupply.eq(initialBalance));
    });

    it('should return the correct initial balance of the owner', async()=>{
        let balance = await tokenInstance.balanceOf(accounts[0]);
        assert(balance.eq(initialBalance));
    });

    it('should transfer token', async()=>{
        let amount = web3.utils.toBN(1000);
        const receipt = await tokenInstance.transfer(accounts[1],amount);        
        let bal = await tokenInstance.balanceOf(accounts[1]);
        assert(bal.eq(amount));
        expectEvent(receipt,'Transfer',{
            from:accounts[0],
            to: accounts[1],
            value: amount
        });
    });

    it('should not transfer if balance is low', async()=>{
        await expectRevert(
            tokenInstance.transfer(accounts[2],1500,{from:accounts[1]}),
            'not enough tokens for transfer'
        );
    });

    it('should not transfer token if on behalf approval is not given', async()=>{
        await expectRevert(
            tokenInstance.transferFrom(accounts[1],accounts[2],1000,{from:accounts[3]}),
            'allowance too low'
        );
    });

    it('should transfer tokens using transfer from function if approval is given', async()=>{
        //approve, from account1, to account3, spender account 0
        let amount = web3.utils.toBN(1000);
        await tokenInstance.transfer(accounts[1],amount,{from:accounts[0]}); 
        let bal1 = await tokenInstance.balanceOf(accounts[1]);
        
        let bal3 = await tokenInstance.balanceOf(accounts[3]);
        assert(bal1.eq(amount));
        assert(bal3.isZero());
        
        let initialAllow = await tokenInstance.allowances(accounts[1],accounts[0]);
        assert(initialAllow.isZero());

        let txHash = await tokenInstance.approve(accounts[0],amount,{from: accounts[1]});
        expectEvent(txHash, 'Approval',{//  event Approval(address indexed owner, address indexed spender, uint value);
            owner: accounts[1],
            spender: accounts[0],
            value: amount
        });

        let finalAllow = await tokenInstance.allowances(accounts[1],accounts[0]);
        assert(finalAllow.eq(amount));
        
        //transfer from

        let txHash2 = await tokenInstance.transferFrom(accounts[1],accounts[3],amount,{from:accounts[0]});
        expectEvent(txHash2,'Transfer',{ //(address indexed from, address indexed to, uint value);
            from: accounts[1],
            to: accounts[3],
            value:amount
        });

        let afterBalance1 = await tokenInstance.balanceOf(accounts[1]);
        let afterBalance3 = await tokenInstance.balanceOf(accounts[3]);

        assert(afterBalance1.isZero());
        assert(afterBalance3.eq(amount));

        let afterAllow = await tokenInstance.allowances(accounts[1],accounts[0]);
        assert(afterAllow.isZero());
        //error
    });
})
