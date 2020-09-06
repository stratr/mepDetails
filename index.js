const { BigQuery } = require('@google-cloud/bigquery');
const bigquery = new BigQuery();

function getMepURLs() {
    // latestTweetsTable is a view in bigQuery that returns the id of the latest already collected tweet for each of the user names
    // insert options, raw: true means that the same rows format is used as in the API documentation
    const options = {
        maxResults: 1000,
    };

    const view = 'tanelis.meps.all_meps';

    const query = `SELECT name, url FROM ${view} WHERE is_active = TRUE LIMIT 1`;

    console.log(query);

    return bigquery.query(query, options);
}

async function scrapeMepDetails() {
    const bqQuery = await getMepURLs();
    if (bqQuery && bqQuery.length > 0) {
        const mepList = bqQuery[0];
        console.log(mepList);

        mepList.forEach((mep) => {
            
        });
    }
}

scrapeMepDetails()