// src/appwrite/config.js

import { Client, Account, Databases, ID } from "appwrite";

const client = new Client();

client
  .setEndpoint("https://sfo.cloud.appwrite.io/v1")
  .setProject("699c72100006af2bc57c");

export const account = new Account(client);
export const databases = new Databases(client);
export { ID };