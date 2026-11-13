import { network } from "hardhat";

const { viem } = await network.create();

const client = await viem.getPublicClient();
const [wallet] = await viem.getWalletClients();

const balance = await client.getBalance({
  address: wallet.account.address,
});

console.log(balance);
