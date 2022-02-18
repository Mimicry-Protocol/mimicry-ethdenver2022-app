pragma solidity >=0.4.24;

import "./IERC20.sol";

interface ISynthRedeemer {
    // Rate of redemption - 0 for none
    function redemptions(address synthProxy) external view returns (uint redeemRate);

    // mUSD balance of deprecated token holder
    function balanceOf(IERC20 synthProxy, address account) external view returns (uint balanceOfInmUSD);

    // Full mUSD supply of token
    function totalSupply(IERC20 synthProxy) external view returns (uint totalSupplyInmUSD);

    function redeem(IERC20 synthProxy) external;

    function redeemAll(IERC20[] calldata synthProxies) external;

    function redeemPartial(IERC20 synthProxy, uint amountOfSynth) external;

    // Restricted to Issuer
    function deprecate(IERC20 synthProxy, uint rateToRedeem) external;
}
