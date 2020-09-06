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

function splitAndTrim(text, delim) {
    return text.split(delim).map((el) => {
        return el.trim();
    })
}

function collectDetails($) {
    // get membership terms
    let terms = null;
    const mpTermsEl = $('h3.mopTerms').text();
    if (mpTermsEl) {
        const datesString = splitAndTrim(mpTermsEl, '\n').find((el) => {
            return /^\d/.test(el)
        });
        if (datesString) {
            terms = splitAndTrim(datesString, ',').map((term, i) => {
                const startEnd = splitAndTrim(term, '–');
                return {
                    term_number: i+1,
                    start: startEnd[0],
                    end: startEnd[1]
                }
            });
        }
    }

    const homepage = $('#ctl00_PlaceHolderMain_MOPInformation_HomePagePanel a').attr('href');

    const currentParlInformation = $('#ctl00_PlaceHolderMain_MOPInformation_CurrentParliamentaryInformationPanel MOPContainer');
    // TODO: loop whatever comes from here into a STRUCT format: keyname, keyvalue

    return {
        terms: terms,
        homepage, homepage
    }
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
                const mepsInfo = [];

                results.forEach(($) => {
                    mepsInfo.push(collectDetails($));
                });

                console.log(JSON.stringify(mepsInfo));
            })
            .catch((err) => {
                console.log(JSON.stringify(err));
            });
    }
}

scrapeMepDetails()