"use server";

import {
  ACHClass,
  CountryCode,
  TransferAuthorizationCreateRequest,
  TransferCreateRequest,
  TransferNetwork,
  TransferType,
} from "plaid";

import { plaidClient } from "../plaid";
import { parseStringify } from "../utils";

import { getTransactionsByBankId } from "./transaction.actions";
import { getBanks, getBank } from "./user.actions";

// Get multiple bank accounts
export const getAccounts = async ({ userId }: getAccountsProps) => {
  try {
    console.log("Getting banks for userId:", userId);
    const banks = await getBanks({ userId });

    if (!banks || banks.length === 0) {
      console.error("No banks found for user:", userId);
      return null;
    }

    const accounts = await Promise.all(
      banks?.map(async (bank: Bank) => {
        console.log("Fetching account info for bank:", bank.$id);
        const accountsResponse = await plaidClient.accountsGet({
          access_token: bank.accessToken,
        });

        console.log("Accounts response for bank:", bank.$id, accountsResponse.data);

        if (!accountsResponse.data.accounts || accountsResponse.data.accounts.length === 0) {
          console.error("No accounts found for access token:", bank.accessToken);
          return null;
        }

        const accountData = accountsResponse.data.accounts[0];

        console.log("Fetching institution info for institutionId:", accountsResponse.data.item.institution_id);
        const institution = await getInstitution({
          institutionId: accountsResponse.data.item.institution_id!,
        });

        const account = {
          id: accountData.account_id,
          availableBalance: accountData.balances.available!,
          currentBalance: accountData.balances.current!,
          institutionId: institution.institution_id,
          name: accountData.name,
          officialName: accountData.official_name,
          mask: accountData.mask!,
          type: accountData.type as string,
          subtype: accountData.subtype! as string,
          appwriteItemId: bank.$id,
          shareableId: bank.shareableId,
        };

        console.log("Returning account data:", account);
        return account;
      })
    );

    const totalBanks = accounts.length;
    const totalCurrentBalance = accounts.reduce((total, account) => {
      return total + (account?.currentBalance || 0);
    }, 0);

    console.log("Total accounts fetched:", totalBanks, "Total current balance:", totalCurrentBalance);
    return parseStringify({ data: accounts, totalBanks, totalCurrentBalance });
  } catch (error) {
    console.error("An error occurred while getting the accounts:", error);
  }
};

// Get one bank account
export const getAccount = async ({ appwriteItemId }: getAccountProps) => {
  try {
    console.log("Fetching bank info for appwriteItemId:", appwriteItemId);
    const bank = await getBank({ documentId: appwriteItemId });

    if (!bank || !bank.accessToken) {
      console.error("Bank or access token is missing for appwriteItemId:", appwriteItemId);
      return null;
    }

    console.log("Fetching account info from Plaid for access token:", bank.accessToken);
    const accountsResponse = await plaidClient.accountsGet({
      access_token: bank.accessToken,
    });

    console.log("Accounts response from Plaid:", accountsResponse.data);

    if (!accountsResponse.data.accounts || accountsResponse.data.accounts.length === 0) {
      console.error("No accounts found for access token:", bank.accessToken);
      return null;
    }

    const accountData = accountsResponse.data.accounts[0];

    console.log("Fetching transfer transactions for bankId:", bank.$id);
    const transferTransactionsData = await getTransactionsByBankId({
      bankId: bank.$id,
    });

    const transferTransactions = transferTransactionsData.documents.map(
      (transferData: Transaction) => ({
        id: transferData.$id,
        name: transferData.name!,
        amount: transferData.amount!,
        date: transferData.$createdAt,
        paymentChannel: transferData.channel,
        category: transferData.category,
        type: transferData.senderBankId === bank.$id ? "debit" : "credit",
      })
    );

    console.log("Fetching institution info for institutionId:", accountsResponse.data.item.institution_id);
    const institution = await getInstitution({
      institutionId: accountsResponse.data.item.institution_id!,
    });

    console.log("Fetching transactions for bank account");
    const transactions = await getTransactions({
      accessToken: bank?.accessToken,
    });

    const account = {
      id: accountData.account_id,
      availableBalance: accountData.balances.available!,
      currentBalance: accountData.balances.current!,
      institutionId: institution.institution_id,
      name: accountData.name,
      officialName: accountData.official_name,
      mask: accountData.mask!,
      type: accountData.type as string,
      subtype: accountData.subtype! as string,
      appwriteItemId: bank.$id,
    };

    const allTransactions = [...transactions, ...transferTransactions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    console.log("Returning account and transactions data:", account, allTransactions);
    return parseStringify({
      data: account,
      transactions: allTransactions,
    });
  } catch (error) {
    console.error("An error occurred while getting the account:", error);
  }
};

// Get bank info
export const getInstitution = async ({ institutionId }: getInstitutionProps) => {
  try {
    console.log("Fetching institution info for institutionId:", institutionId);
    const institutionResponse = await plaidClient.institutionsGetById({
      institution_id: institutionId,
      country_codes: ["US"] as CountryCode[],
    });

    console.log("Institution response:", institutionResponse.data.institution);
    const institution = institutionResponse.data.institution;

    return parseStringify(institution);
  } catch (error) {
    console.error("An error occurred while getting the institution info:", error);
  }
};

// Get transactions
export const getTransactions = async ({ accessToken }: getTransactionsProps) => {
  let hasMore = true;
  let transactions: any = [];

  try {
    console.log("Fetching transactions for access token:", accessToken);
    while (hasMore) {
      const response = await plaidClient.transactionsSync({
        access_token: accessToken,
      });

      const data = response.data;

      const newTransactions = data.added.map((transaction) => ({
        id: transaction.transaction_id,
        name: transaction.name,
        paymentChannel: transaction.payment_channel,
        type: transaction.payment_channel,
        accountId: transaction.account_id,
        amount: transaction.amount,
        pending: transaction.pending,
        category: transaction.category ? transaction.category[0] : "",
        date: transaction.date,
        image: transaction.logo_url,
      }));

      console.log("New transactions fetched:", newTransactions);
      transactions = [...transactions, ...newTransactions];
      hasMore = data.has_more;
    }

    console.log("Returning transactions:", transactions);
    return parseStringify(transactions);
  } catch (error) {
    console.error("An error occurred while getting the transactions:", error);
  }
};

// Create Transfer
export const createTransfer = async () => {
  const transferAuthRequest: TransferAuthorizationCreateRequest = {
    access_token: "access-sandbox-cddd20c1-5ba8-4193-89f9-3a0b91034c25",
    account_id: "Zl8GWV1jqdTgjoKnxQn1HBxxVBanm5FxZpnQk",
    funding_account_id: "442d857f-fe69-4de2-a550-0c19dc4af467",
    type: "credit" as TransferType,
    network: "ach" as TransferNetwork,
    amount: "10.00",
    ach_class: "ppd" as ACHClass,
    user: {
      legal_name: "Anne Charleston",
    },
  };
  try {
    console.log("Creating transfer authorization with request:", transferAuthRequest);
    const transferAuthResponse = await plaidClient.transferAuthorizationCreate(transferAuthRequest);
    const authorizationId = transferAuthResponse.data.authorization.id;
    console.log("Transfer authorization created with id:", authorizationId);

    const transferCreateRequest: TransferCreateRequest = {
      access_token: "access-sandbox-cddd20c1-5ba8-4193-89f9-3a0b91034c25",
      account_id: "Zl8GWV1jqdTgjoKnxQn1HBxxVBanm5FxZpnQk",
      description: "payment",
      authorization_id: authorizationId,
    };

    console.log("Creating transfer with request:", transferCreateRequest);
    const responseCreateResponse = await plaidClient.transferCreate(transferCreateRequest);

    const transfer = responseCreateResponse.data.transfer;
    console.log("Transfer created:", transfer);
    return parseStringify(transfer);
  } catch (error) {
    console.error("An error occurred while creating transfer authorization:", error);
  }
};
