const { BigQuery } = require('@google-cloud/bigquery');
const bigquery = new BigQuery();

const cheerio = require('cheerio')
const axios = require("axios");

const fetchData = async (siteUrl, name) => {
    const result = await axios.get(siteUrl);
    return {
        html: cheerio.load(result.data),
        name: name,
        url: siteUrl
        };
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
                    term_number: i + 1,
                    start: startEnd[0],
                    end: startEnd[1]
                }
            });
        }
    }

    const homepage = $('#ctl00_PlaceHolderMain_MOPInformation_HomePagePanel a').attr('href');

    const cv = [];
    const cvEl = $('#ctl00_PlaceHolderMain_MOPInformation_CvPanel ul.sub-menu > li');
    cvEl.each(function(i, elem) {
        const section = $(this).find('div.mop-title-label').text().trim();

        const liValues = [];
        $(this).find('div.mop-info-value ul li').each(function(j, liEl) {
            liValues.push($(this).text().trim())
        });

        const textValue = $(this).find('div.mop-info-value').text().trim();

        const value = liValues.length > 0 ? liValues.join('|') : textValue;

        if (section && value) {
            const sectionClean = section.replace(/[:\/-]/g, '').replace(/\s/g, '_').toLowerCase();
            const valueClean = value.replace(/[\t\n]/g, '');

            cv.push({
                section: sectionClean,
                text: valueClean
            });
        }
    });

    return {
        terms: terms,
        homepage, homepage,
        cv: cv
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
            const mepHtml = fetchData(mep.url, mep.name);
            fetchPromises.push(mepHtml);
        });

        Promise.all(fetchPromises)
            .then(results => {
                const mepsInfo = [];

                results.forEach((result) => {
                    let details = collectDetails(result.html);
                    details['name'] = result.name;
                    details['url'] = result.url;

                    mepsInfo.push(details);
                });

                console.log(JSON.stringify(mepsInfo, undefined, 2));
            })
            .catch((err) => {
                console.log(JSON.stringify(err));
            });
    }
}

scrapeMepDetails()