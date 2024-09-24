'use server';

import { ID, Query } from "node-appwrite";
import { createAdminClient, createSessionClient } from "../appwrite";
import { cookies } from "next/headers";
import { encryptId, extractCustomerIdFromUrl, parseStringify } from "../utils";
import { CountryCode, ProcessorTokenCreateRequest, ProcessorTokenCreateRequestProcessorEnum, Products } from "plaid";
import { plaidClient } from '@/lib/plaid';
import { revalidatePath } from "next/cache";
import { addFundingSource, createDwollaCustomer } from "./dwolla.actions";

const {
  APPWRITE_DATABASE_ID: DATABASE_ID,
  APPWRITE_USER_COLLECTION_ID: USER_COLLECTION_ID,
  APPWRITE_BANK_COLLECTION_ID: BANK_COLLECTION_ID,
} = process.env;

export const getUserInfo = async ({ userId }: getUserInfoProps) => {
  try {
    console.log("Fetching user info for userId:", userId);
    const { database } = await createAdminClient();

    const user = await database.listDocuments(
      DATABASE_ID!,
      USER_COLLECTION_ID!,
      [Query.equal("userId", [userId])]
    );

    console.log("Fetched user data:", user.documents[0]);
    return parseStringify(user.documents[0]);
  } catch (error) {
    console.error("Error fetching user info:", error);
    return null;
  }
};

export const signIn = async ({ email, password }: signInProps) => {
  try {
    console.log("Signing in with email:", email);
    const { account } = await createAdminClient();

    const session = await account.createEmailPasswordSession(email, password);
    console.log("Session created:", session);

    cookies().set("appwrite-session", session.secret, {
      path: "/",
      httpOnly: true,
      sameSite: "strict",
      secure: true,
    });

    const user = await getUserInfo({ userId: session.userId });
    console.log("User info after sign in:", user);

    return parseStringify(user);
  } catch (error) {
    console.error("Error signing in:", error);
  }
};

export const signUp = async ({ password, ...userData }: SignUpParams) => {
  let newUserAccount;

  try {
    console.log("Signing up with data:", userData);
    const { email, firstName, lastName } = userData;

    const { account, database } = await createAdminClient();

    newUserAccount = await account.create(
      ID.unique(),
      email,
      password,
      `${firstName} ${lastName}`
    );

    console.log("New user account created:", newUserAccount);
    if (!newUserAccount) throw new Error('Error creating user');

    const dwollaCustomerUrl = await createDwollaCustomer({
      ...userData,
      type: 'personal',
    });

    console.log("Dwolla customer created:", dwollaCustomerUrl);
    if (!dwollaCustomerUrl) throw new Error('Error creating Dwolla Customer');

    const dwollaCustomerId = extractCustomerIdFromUrl(dwollaCustomerUrl);

    const newUser = await database.createDocument(
      DATABASE_ID!,
      USER_COLLECTION_ID!,
      ID.unique(),
      {
        ...userData,
        userId: newUserAccount.$id,
        dwollaCustomerId,
        dwollaCustomerUrl,
      }
    );

    console.log("New user document created in the database:", newUser);

    const session = await account.createEmailPasswordSession(email, password);
    console.log("New session created:", session);

    cookies().set("appwrite-session", session.secret, {
      path: "/",
      httpOnly: true,
      sameSite: "strict",
      secure: true,
    });

    return parseStringify(newUser);
  } catch (error) {
    console.error("Error during sign-up:", error);
  }
};

export async function getLoggedInUser() {
  try {
    console.log("Fetching logged-in user data...");
    const { account } = await createSessionClient();

    const result = await account.get();
    console.log("Logged-in user fetched:", result);

    const user = await getUserInfo({ userId: result.$id });
    console.log("User info after fetching logged-in user:", user);

    return parseStringify(user);
  } catch (error) {
    console.error("Error fetching logged-in user:", error);
    return null;
  }
}

export const logoutAccount = async () => {
  try {
    console.log("Logging out...");
    const { account } = await createSessionClient();
    cookies().delete("appwrite-session");

    await account.deleteSession("current");
    console.log("User logged out successfully");

    return true; // Return true on success
  } catch (error) {
    console.error("Logout error:", error); // Log the error
    return null;
  }
};

export const createLinkToken = async (user: User) => {
  try {
    console.log("Creating link token for user:", user);

    const tokenParams = {
      user: {
        client_user_id: user.$id,
      },
      client_name: `${user.firstName} ${user.lastName}`,
      products: ['auth'] as Products[],
      language: 'en',
      country_codes: ['US'] as CountryCode[],
    };

    const response = await plaidClient.linkTokenCreate(tokenParams);
    console.log("Link token created:", response.data.link_token);

    return parseStringify({ linkToken: response.data.link_token });
  } catch (error) {
    console.error("Error creating link token:", error);
  }
};

export const createBankAccount = async ({
  userId,
  bankId,
  accountId,
  accessToken,
  fundingSourceUrl,
  shareableId,
}: createBankAccountProps) => {
  try {
    console.log("Creating bank account with userId:", userId);
    const { database } = await createAdminClient();

    const bankAccount = await database.createDocument(
      DATABASE_ID!,
      BANK_COLLECTION_ID!,
      ID.unique(),
      {
        userId,
        bankId,
        accountId,
        accessToken,
        fundingSourceUrl,
        shareableId,
      }
    );
    console.log("Bank account created:", bankAccount);

    return parseStringify(bankAccount);
  } catch (error) {
    console.error("Error creating bank account:", error);
  }
};

export const exchangePublicToken = async ({
  publicToken,
  user,
}: exchangePublicTokenProps) => {
  try {
    console.log("Exchanging public token for access token...");
    const response = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    });
    console.log("Public token exchanged:", response.data);

    const accessToken = response.data.access_token;
    const itemId = response.data.item_id;

    console.log("Fetching account info with access token...");
    const accountsResponse = await plaidClient.accountsGet({
      access_token: accessToken,
    });
    const accountData = accountsResponse.data.accounts[0];
    console.log("Account info fetched:", accountData);

    console.log("Creating processor token...");
    const request: ProcessorTokenCreateRequest = {
      access_token: accessToken,
      account_id: accountData.account_id,
      processor: "dwolla" as ProcessorTokenCreateRequestProcessorEnum,
    };
    const processorTokenResponse = await plaidClient.processorTokenCreate(request);
    const processorToken = processorTokenResponse.data.processor_token;
    console.log("Processor token created:", processorToken);

    console.log("Creating funding source with Dwolla...");
    const fundingSourceUrl = await addFundingSource({
      dwollaCustomerId: user.dwollaCustomerId,
      processorToken,
      bankName: accountData.name,
    });
    if (!fundingSourceUrl) throw new Error("Failed to create funding source");
    console.log("Funding source created:", fundingSourceUrl);

    console.log("Creating bank account...");
    await createBankAccount({
      userId: user.$id,
      bankId: itemId,
      accountId: accountData.account_id,
      accessToken,
      fundingSourceUrl,
      shareableId: encryptId(accountData.account_id),
    });

    console.log("Revalidating path...");
    revalidatePath("/");

    return parseStringify({
      publicTokenExchange: "complete",
    });
  } catch (error) {
    console.error("Error occurred while exchanging token:", error);
  }
};

export const getBanks = async ({ userId }: getBanksProps) => {
  try {
    console.log("Fetching banks for userId:", userId);
    const { database } = await createAdminClient();

    const banks = await database.listDocuments(
      DATABASE_ID!,
      BANK_COLLECTION_ID!,
      [Query.equal("userId", [userId])]
    );
    console.log("Fetched banks:", banks.documents);

    return parseStringify(banks.documents);
  } catch (error) {
    console.error("Error fetching banks:", error);
    return null;
  }
};

export const getBank = async ({ documentId }: getBankProps) => {
  try {
    console.log("Fetching bank for documentId:", documentId);
    const { database } = await createAdminClient();

    const bank = await database.listDocuments(
      DATABASE_ID!,
      BANK_COLLECTION_ID!,
      [Query.equal("$id", [documentId])]
    );
    console.log("Fetched bank:", bank.documents[0]);

    return parseStringify(bank.documents[0]);
  } catch (error) {
    console.error("Error fetching bank:", error);
    return null;
  }
};

export const getBankByAccountId = async ({ accountId }: getBankByAccountIdProps) => {
  try {
    console.log("Fetching bank for accountId:", accountId);
    const { database } = await createAdminClient();

    const bank = await database.listDocuments(
      DATABASE_ID!,
      BANK_COLLECTION_ID!,
      [Query.equal("accountId", [accountId])]
    );

    if (bank.total !== 1) {
      console.log("No matching bank found for accountId:", accountId);
      return null;
    }

    console.log("Fetched bank:", bank.documents[0]);
    return parseStringify(bank.documents[0]);
  } catch (error) {
    console.error("Error fetching bank by accountId:", error);
    return null;
  }
};
