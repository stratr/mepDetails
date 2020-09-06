const { BigQuery } = require('@google-cloud/bigquery');
const bigquery = new BigQuery();

const cheerio = require('cheerio')
const axios = require("axios");

const fetchData = async (siteUrl) => {
    const result = await axios.get(siteUrl);
    return cheerio.load(result.data);
};

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

        // const $ = await fetchData(mepList[0].url);
        //     console.log($);

        const fetchPromises = [];
        mepList.forEach((mep) => {
            const $ = fetchData(mep.url);
            fetchPromises.push($);
        });

        Promise.all(fetchPromises)
            .then(results => {
                results.forEach(($) => {
                    console.log($.html());
                });
            })
            .catch((err) => {
                console.log(JSON.stringify(err));
            });
    }
}

scrapeMepDetails()