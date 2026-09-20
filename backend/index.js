/* ===========================================================================
   Azure Function `words` — Node.js, model programowania v3.

   To jest TWÓJ działający kod z dwoma dodatkami:
     • POST zapisuje dodatkowo `payload` (cała karta jako JSON string)
       oraz `updatedAt` (znacznik czasu do rozstrzygania konfliktów),
     • GET zwraca te pola z powrotem.

   Reszta została celowo nietknięta:
     • TableClient tworzony raz, poza handlerem (szybszy zimny start),
     • ten sam wzór RowKey,
     • upsert w trybie "Replace",
     • ŻADNYCH nagłówków CORS w kodzie — obsługuje je platforma
       (Portal Azure → Function App → API → CORS). Ustawianie ich w obu
       miejscach naraz daje zdublowany Access-Control-Allow-Origin,
       a przeglądarka taką odpowiedź odrzuca.

   Stary kontrakt działa bez zmian: POST { english, polishDefinition }
   nadal zapisze słowo, tylko bez dodatkowych pól.
   =========================================================================== */

const { TableClient } = require("@azure/data-tables");

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
const tableName = "wordsTable";
const tableClient = TableClient.fromConnectionString(connectionString, tableName);

module.exports = async function (context, req) {
    if (req.method === "GET") {
        const entities = [];
        for await (const entity of tableClient.listEntities({ queryOptions: { filter: `PartitionKey eq 'Words'` } })) {
            entities.push({
                rowKey: entity.rowKey,
                english: entity.english,
                polishDefinition: entity.polishDefinition || "",
                payload: entity.payload || null,
                updatedAt: entity.updatedAt || 0
            });
        }
        context.res = { status: 200, body: entities };
        return;
    }

    if (req.method === "POST") {
        const data = req.body || {};

        if (!data.english) {
            context.res = { status: 400, body: { success: false, error: "Pole english jest wymagane" } };
            return;
        }

        const rowKey = data.english.toLowerCase().trim().replace(/\s+/g, '');

        const entity = {
            partitionKey: "Words",
            rowKey: rowKey,
            english: data.english,
            polishDefinition: data.polishDefinition || "",
            updatedAt: Number(data.updatedAt) || Date.now()
        };

        // Cała karta (zdania, zasady, skojarzenia, stan powtórek) jako jeden
        // string JSON. Nie rozbijamy jej na kolumny — Table Storage i tak nie
        // obsługuje zagnieżdżonych obiektów.
        if (typeof data.payload === "string") {
            entity.payload = data.payload;
        } else if (data.payload) {
            entity.payload = JSON.stringify(data.payload);
        }

        await tableClient.upsertEntity(entity, "Replace");
        context.res = { status: 200, body: { success: true, data: { rowKey: rowKey } } };
        return;
    }

    context.res = { status: 405, body: { success: false, error: "Metoda nieobsługiwana" } };
};
