// import
// save
// analyze
/*eslint-disable*/
var _ = require('lodash');
var async = require('async');
var express = require('express');

var app = express();

var serviceLocator = require('./ws.service-locator')(app);

require('./ws.config')(app);
require('./ws.repository')(serviceLocator);
require('./ws.plugins')(serviceLocator, function () {
  /** @type GoogleSpreadSheetPlugin */
  var gs = serviceLocator.plugins.get('google-spread-sheets');

  var uid = '1H3nzTwbn8z4lJ5gJ_WfDgCeGEXK3PVGcNjQ_U5og8eo';
  var indicatorName = 'some-indicator';
  var indicatorTitle = 'Awesome stats here!'
  var optionsList = [
    {
      uid: "http://spreadsheets.google.com/pub?key=phAwcNAVuyj0TAlJeCEzcGQ",
      indicator: {
        name: "Children_per_woman_total_fertility",
        title: "Children per woman (total fertility)"
      }
    },{
      uid: "http://spreadsheets.google.com/pub?key=phAwcNAVuyj1gkNuUEXOGag",
      indicator: {
        name: "CO2_emissions_tonnes_per_person",
        title: "CO2 emissions (tonnes per person)"
      }
    },{
      uid: "http://spreadsheets.google.com/pub?key=phAwcNAVuyj1gkNuUEXOGag",
      indicator: {
        name: "CO2_emissions_tonnes_per_person",
        title: "CO2 emissions (tonnes per person)"
      }
    },{
      uid: "http://spreadsheets.google.com/pub?key=phAwcNAVuyj1jiMAkmq1iMg",
      indicator: {
        name: "Income_per_person_GDPpercapita_PPP_inflation_adjusted",
        title: "Income per person (GDP/capita, PPP$ inflation-adjusted)"
      }
    },{
      uid: "http://spreadsheets.google.com/pub?key=0ArfEDsV3bBwCcGhBd2NOQVZ1eWowNVpSNjl1c3lRSWc",
      indicator: {
        name: "Child_mortality_0_5_year_olds_dying_per_1000_born",
        title: "Child mortality (0-5 year-olds dying per 1,000 born)"
      }
    },{
      uid: "http://spreadsheets.google.com/pub?key=phAwcNAVuyj2tPLxKvvnNPA",
      indicator: {
        name: "Life_expectancy_years",
        title: "Life expectancy (years)"
      }
    },{
      uid: "http://spreadsheets.google.com/pub?key=tFOn62dEO9QCyIKK6kgSYRQ",
      indicator: {
        name: "Aid_given_2007_US",
        title: "Aid given (2007 US$)"
      }
    },{
      uid: "http://spreadsheets.google.com/pub?key=tGTst0WEm8V8zI9LOYvGmTg",
      indicator: {
        name: "Aid_given_per_person_2007_US",
        title: "Aid given per person (2007 US$)"
      }
    },{
      uid: "http://spreadsheets.google.com/pub?key=tXn3DSfvsYujaBP9bvH6acg",
      indicator: {
        name: "Water_and_sanitation_aid_given_percent_of_aid",
        title: "Water and sanitation aid given (% of aid)"
      }
    },{
      uid: "http://spreadsheets.google.com/pub?key=tMxqFNS7BC5QyLrhBO8DXqQ",
      indicator: {
        name: "Economical_infrastructure_aid_given_percent_of_aid",
        title: "Economical infrastructure aid given (% of aid)"
      }
    },{
      uid: "http://spreadsheets.google.com/pub?key=tMjW0fdVf9VJaxVk_VFSUhg",
      indicator: {
        name: "Production_sector_aid_given_percent_of_aid",
        title: "Production sector aid given (% of aid)"
      }
    },{
      uid: "http://spreadsheets.google.com/pub?key=tBJ1rYQ-nA6fqI6_Gn3mBNg",
      indicator: {
        name: "Multisector_cross_cutting_aid_given_percent_of_aid",
        title: "Multisector cross-cutting aid given (% of aid)"
      }
    },{
      uid: "http://spreadsheets.google.com/pub?key=tQQaILpdu-vGtSkJLr2VQCw",
      indicator: {
        name: "Education_aid_given_percent_of_aid",
        title: "Education aid given (% of aid)"
      }
    },{
      uid: "http://spreadsheets.google.com/pub?key=tRybjVoG5Ah9yhKcEx16u5Q",
      indicator: {
        name: "Health_aid_given_percent_of_aid",
        title: "Health aid given (% of aid)"
      }
    },{
      uid: "http://spreadsheets.google.com/pub?key=tjFf_YqwB6tgSG9L0r0Ywdg",
      indicator: {
        name: "Population_policies_aid_given_percent_of_aid",
        title: "Population policies aid given (% of aid)"
      }
    },{
      uid: "http://spreadsheets.google.com/pub?key=t3IAEOsfHK-z6rvGLCDR74g",
      indicator: {
        name: "Government_and_society_aid_given_percent_of_aid",
        title: "Government and society aid given (% of aid)"
      }
    },{
      uid: "http://spreadsheets.google.com/pub?key=tqjUijP4mi_dHKkCZjOn0oA",
      indicator: {
        name: "Other_social_services_aid_given_percent_of_aid",
        title: "Other social services aid given (% of aid)"
      }
    },{
      uid: "https://docs.google.com/spreadsheet/pub?key=0AkBd6lyS3EmpdHVuNVpKdnNCa08yV3NOd0Zsal9JaWc",
      indicator: {
        name: "Aid_received_total_US_inflation_adjusted",
        title: "Aid received, total (US$, inflation-adjusted)"
      }
    },{
      uid: "http://spreadsheets.google.com/pub?key=t9GL1nIZdtxszJbjKErN2Hg",
      indicator: {
        name: "Aid_received_per_person_current_US",
        title: "Aid received per person (current US$)"
      }
    },{
      uid: "http://spreadsheets.google.com/pub?key=tzK6dx2JltRfVXFI1ADh84w",
      indicator: {
        name: "Aid_received_percent_of_GNI",
        title: "Aid received (% of GNI)"
      }
    },{
      uid: "http://spreadsheets.google.com/pub?key=tAQpQeQkuyA1-ZovdDJ7JAw",
      indicator: {
        name: "Dollar_billionaires_per_million_people",
        title: "Dollar billionaires per million people"
      }
    },{
      uid: "http://spreadsheets.google.com/pub?key=t_KhYe1qTGh4c90N61AUDSg",
      indicator: {
        name: "Average_age_of_dollar_billionaires_years",
        title: "Average age of dollar billionaires (years)"
      }
    },{
      uid: "http://spreadsheets.google.com/pub?key=tNWhbu-1UIPPxtmRHtnINOQ",
      indicator: {
        name: "Total_number_of_dollar_billionaires",
        title: "Total number of dollar billionaires"
      }
    },{
      uid: "https://docs.google.com/spreadsheet/pub?key=0AkBd6lyS3EmpdDlSTTVWUkU3Z254aEhERmVuQWZaeWc",
      indicator: {
        name: "Debt_to_foreigners_by_public_and_private_percent_of_GNI",
        title: "Debt to foreigners by public & private (% of GNI)"
      }
    },{
      uid: "https://docs.google.com/spreadsheet/pub?key=0AkBd6lyS3EmpdC1iMVRuVUFUd08tVDM0ZDF0cnFtekE",
      indicator: {
        name: "Total_reserves_percent_of_debt_to_foreigners",
        title: "Total reserves (% of debt to foreigners)"
      }
    },{
      uid: "http://spreadsheets.google.com/pub?key=pyj6tScZqmEfI4sLVvEQtHw",
      indicator: {
        name: "Total_GDP_US_inflation_adjusted",
        title: "Total GDP (US$, inflation-adjusted)"
      }
    },{
      uid: "https://docs.google.com/spreadsheet/pub?key=0AkBd6lyS3EmpdHo5S0J6ekhVOF9QaVhod05QSGV4T3c",
      indicator: {
        name: "GDPpercapita_US_inflation_adjusted",
        title: "GDP/capita (US$, inflation-adjusted)"
      }
    },{
      uid: "http://spreadsheets.google.com/pub?key=rcTO3doih5lvJCjgLSvlajA",
      indicator: {
        name: "GDPperemployee_US_inflation_adjusted",
        title: "GDP/employee (US$, inflation-adjusted)"
      }
    }
  ];
  console.time('All imported!');
  async.eachLimit(optionsList, 1, function (options, cb) {
    console.time('importing: ' + options.uid);
    gs.importer.importData(options.uid, function (err, opts) {
      console.timeEnd('importing: ' + options.uid);
      if (err) {
        return cb(err);
      }

      console.time('analysing: ' + options.uid);
      _.merge(options, opts);
      gs.analysis(options, function (err) {
        if (err) {
          return cb(err);
        }
        console.timeEnd('analysing: ' + options.uid);
        return cb();
      });
    });
  }, function (err) {
    console.timeEnd('All imported!');
    // export to neo4j
  });

});

/**
 * @callback ErrorOnlyCallback
 * @param {Error} [err] - error if any
 */
