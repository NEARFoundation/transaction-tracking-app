/* eslint-disable canonical/sort-keys */
/* eslint no-use-before-define: "error"*/

const { DBSQLClient } = require('@databricks/sql');


const host = process.env.DATABRICKS_SERVER_HOSTNAME ?? "HOST";
const path = process.env.DATABRICKS_HTTP_PATH ?? "PATH";
const token = process.env.DATABRICKS_TOKEN ?? "TOKEN";

async function execute(session, statement) {
    const utils = DBSQLClient.utils;
    const operation = await session.executeStatement(statement, { runAsync: true });
    await DBSQLClient.utils.waitUntilReady(operation);
    await DBSQLClient.utils.fetchAll(operation);
    await operation.close();
    return utils.getResult(operation).getValue();
}

const client = new DBSQLClient();

client.connect({ host, path, token }).then(async client => {
    const session = await client.openSession();

    const result = await execute(session, "SELECT * FROM mainnet_explorer_public.accounts WHERE account_id = 'kenjon.near'");
    console.table(result);

    await session.close();
    client.close();
}).catch(error => {
    console.log(error);
});


