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

  var exclude = [
    'https://docs.google.com/spreadsheets/d/1aYzLwblTgPVT6Zbexq-V8coTzKr54Fg9JB7rhkzfLbU/pub',
    'https://docs.google.com/spreadsheets/d/1ZMmT3Lj2BCu8AYODni-sbv0Ibeh6mkSsn3DRmJo4rNg/pub',
    'https://docs.google.com/spreadsheets/d/1wQj8YxaeP4MAoMeRh6xZ5AnJkABhufT1UAuE_M5LeB0/pub',
    'https://docs.google.com/spreadsheets/d/1clUeOPK_Rs-ASt2Wl0NWXo-KhOrszkJJ19he7ID4YWY/pub',
    'https://docs.google.com/spreadsheets/d/1tt2bb3fpvOdBaRp1fv39pQ8RjkOb_VbjTi0XdVQEVpI/pub',
    'https://docs.google.com/spreadsheets/d/1erdUA9SDUzZw5M8KfbRL7fgda2XqoAkuvZ1XgGnQ-sY/pub',
    'https://docs.google.com/spreadsheets/d/1bOnlJd00Ygl1nxKrfnmOvkrJ4ruJ_md7WWdrdWYixr0/pub',
    'https://docs.google.com/spreadsheets/d/1FIfJRjfPJSC0S3q5fNUiASC0Xo3j-FlN_kMTPL7FXI0/pub',
    'https://docs.google.com/spreadsheets/d/1MYOjKDFE2z5JBAu5-UhCEjpgxDQF8-0zdReX8BFaPGU/pub',
    'https://docs.google.com/spreadsheets/d/1tj6e75vcdYfDWjz7dNVN-6C8QBJT5OH_OKCTCu2VmjE/pub',
    'https://docs.google.com/spreadsheets/d/1WMpJl70z4epmKyEkqwKDnCJ-_8NcF1WAe18JINslWww/pub',
    'https://docs.google.com/spreadsheets/d/1kB4PFkvhQu2emRcFBMu368wCjVhZzEcbWsXFgFfikJU/pub',
    'https://docs.google.com/spreadsheets/d/1oDVONphUheFEDSlNgaBZsP36KblRXPAG0q1O3vdALsg/pub'
  ];

  //generateList(serviceLocator);
  //return ;

  var optionsList = [
    { uid: 'phAwcNAVuyj0TAlJeCEzcGQ',
    indicator:
    { name: 'Children_per_woman_total_fertility',
      title: 'Children per woman (total fertility)' } },
    { uid: 'phAwcNAVuyj1gkNuUEXOGag',
      indicator:
      { name: 'CO2_emissions_tonnes_per_person',
        title: 'CO2 emissions (tonnes per person)' } },
    { uid: 'phAwcNAVuyj1jiMAkmq1iMg',
      indicator:
      { name: 'Income_per_person_GDPpercapita_PPP_inflation_adjusted',
        title: 'Income per person (GDP/capita, PPP$ inflation-adjusted)' } },
    { uid: '0ArfEDsV3bBwCcGhBd2NOQVZ1eWowNVpSNjl1c3lRSWc',
      indicator:
      { name: 'Child_mortality_0_5_year_olds_dying_per_1000_born',
        title: 'Child mortality (0-5 year-olds dying per 1,000 born)' } },
    { uid: 'phAwcNAVuyj2tPLxKvvnNPA',
      indicator:
      { name: 'Life_expectancy_years',
        title: 'Life expectancy (years)' } },
    { uid: 'tFOn62dEO9QCyIKK6kgSYRQ',
      indicator: { name: 'Aid_given_2007_US', title: 'Aid given (2007 US$)' } },
    { uid: 'tGTst0WEm8V8zI9LOYvGmTg',
      indicator:
      { name: 'Aid_given_per_person_2007_US',
        title: 'Aid given per person (2007 US$)' } },
    { uid: 'tQR7RhlZdPjBkVCDPPF4zUg',
      indicator:
      { name: 'Aid_given_percent_of_GNI',
        title: 'Aid given (% of GNI)' } },
    { uid: 'tnDimTzGwU_BbmtOMHOUFFQ',
      indicator:
      { name: '———————————————————————',
        title: '———————————————————————' } },
    { uid: 'tXn3DSfvsYujaBP9bvH6acg',
      indicator:
      { name: 'Water_and_sanitation_aid_given_percent_of_aid',
        title: 'Water and sanitation aid given (% of aid)' } },
    { uid: 'tMxqFNS7BC5QyLrhBO8DXqQ',
      indicator:
      { name: 'Economical_infrastructure_aid_given_percent_of_aid',
        title: 'Economical infrastructure aid given (% of aid)' } },
    { uid: 'tMjW0fdVf9VJaxVk_VFSUhg',
      indicator:
      { name: 'Production_sector_aid_given_percent_of_aid',
        title: 'Production sector aid given (% of aid)' } },
    { uid: 'tBJ1rYQ-nA6fqI6_Gn3mBNg',
      indicator:
      { name: 'Multisector_cross_cutting_aid_given_percent_of_aid',
        title: 'Multisector cross-cutting aid given (% of aid)' } },
    { uid: 'tQQaILpdu-vGtSkJLr2VQCw',
      indicator:
      { name: 'Education_aid_given_percent_of_aid',
        title: 'Education aid given (% of aid)' } },
    { uid: 'tRybjVoG5Ah9yhKcEx16u5Q',
      indicator:
      { name: 'Health_aid_given_percent_of_aid',
        title: 'Health aid given (% of aid)' } },
    { uid: 'tjFf_YqwB6tgSG9L0r0Ywdg',
      indicator:
      { name: 'Population_policies_aid_given_percent_of_aid',
        title: 'Population policies aid given (% of aid)' } },
    { uid: 't3IAEOsfHK-z6rvGLCDR74g',
      indicator:
      { name: 'Government_and_society_aid_given_percent_of_aid',
        title: 'Government and society aid given (% of aid)' } },
    { uid: 'tqjUijP4mi_dHKkCZjOn0oA',
      indicator:
      { name: 'Other_social_services_aid_given_percent_of_aid',
        title: 'Other social services aid given (% of aid)' } },
    { uid: '0AkBd6lyS3EmpdHVuNVpKdnNCa08yV3NOd0Zsal9JaWc',
      indicator:
      { name: 'Aid_received_total_US_inflation_adjusted',
        title: 'Aid received, total (US$, inflation-adjusted)' } },
    { uid: 't9GL1nIZdtxszJbjKErN2Hg',
      indicator:
      { name: 'Aid_received_per_person_current_US',
        title: 'Aid received per person (current US$)' } },
    { uid: 'tzK6dx2JltRfVXFI1ADh84w',
      indicator:
      { name: 'Aid_received_percent_of_GNI',
        title: 'Aid received (% of GNI)' } },
    { uid: 'tAQpQeQkuyA1-ZovdDJ7JAw',
      indicator:
      { name: 'Dollar_billionaires_per_million_people',
        title: 'Dollar billionaires per million people' } },
    { uid: 't_KhYe1qTGh4c90N61AUDSg',
      indicator:
      { name: 'Average_age_of_dollar_billionaires_years',
        title: 'Average age of dollar billionaires (years)' } },
    { uid: 'tNWhbu-1UIPPxtmRHtnINOQ',
      indicator:
      { name: 'Total_number_of_dollar_billionaires',
        title: 'Total number of dollar billionaires' } },
    { uid: '0AkBd6lyS3EmpdDlSTTVWUkU3Z254aEhERmVuQWZaeWc',
      indicator:
      { name: 'Debt_to_foreigners_by_public_and_private_percent_of_GNI',
        title: 'Debt to foreigners by public & private (% of GNI)' } },
    { uid: '0AkBd6lyS3EmpdC1iMVRuVUFUd08tVDM0ZDF0cnFtekE',
      indicator:
      { name: 'Total_reserves_percent_of_debt_to_foreigners',
        title: 'Total reserves (% of debt to foreigners)' } },
    { uid: 'pyj6tScZqmEfI4sLVvEQtHw',
      indicator:
      { name: 'Total_GDP_US_inflation_adjusted',
        title: 'Total GDP (US$, inflation-adjusted)' } },
    { uid: '0AkBd6lyS3EmpdHo5S0J6ekhVOF9QaVhod05QSGV4T3c',
      indicator:
      { name: 'GDPpercapita_US_inflation_adjusted',
        title: 'GDP/capita (US$, inflation-adjusted)' } },
    { uid: 'rcTO3doih5lvJCjgLSvlajA',
      indicator:
      { name: 'GDPperemployee_US_inflation_adjusted',
        title: 'GDP/employee (US$, inflation-adjusted)' } },
    { uid: 'r6kTHMinnVedj8gPsUtfZ0g',
      indicator:
      { name: 'GDPperworking_hour_US_inflation_adjusted',
        title: 'GDP/working hour (US$, inflation-adjusted)' } },
    { uid: 'tvllZwGIbhwxLD7EXFhPeXQ',
      indicator:
      { name: 'GDPpercapita_growth_over_next_10_years',
        title: 'GDP/capita growth over next 10 years' } },
    { uid: '0AkBd6lyS3EmpdEdDWHhBcFpjMUo4MGE2X2Q4WXFQRGc',
      indicator:
      { name: 'GDPpercapita_growth_percent_per_year',
        title: 'GDP/capita growth (% per year)' } },
    { uid: '0ArfEDsV3bBwCdFl6cDkxcmZxM0pVNXBUYjE1ZmNqVUE',
      indicator:
      { name: 'Total_GNI_PPP_current_international',
        title: 'Total GNI (PPP, current international $)' } },
    { uid: '0ArfEDsV3bBwCdFdqZ0NOdjluMmoyUTBTWTRjWWQzQVE',
      indicator:
      { name: 'GNIpercapita_constant_2000_US',
        title: 'GNI/capita (constant 2000 US$)' } },
    { uid: '0ArfEDsV3bBwCdFVrVDZQUnRwZ2lqT2lPMXcySXZwRmc',
      indicator:
      { name: 'GNIpercapita_atlasmethod_current_US',
        title: 'GNI/capita (Atlas method, current US$)' } },
    { uid: '0ArfEDsV3bBwCdGhJcHAwanc2aFdZeXl1WTVZQnJjb1E',
      indicator:
      { name: 'GNIpercapita_PPP_current_international',
        title: 'GNI/per capita (PPP, current international $)' } },
    { uid: 'pyj6tScZqmEcjeKHnZq6RIg',
      indicator:
      { name: 'Inequality_index_Gini',
        title: 'Inequality index (Gini)' } },
    { uid: 'tmKvydPl_roGIQBrMYA6C4g',
      indicator:
      { name: 'Income_share_of_richest_10percent',
        title: 'Income share of richest 10%' } },
    { uid: 'tLnCxItXzRSu9gH-5PyEFDw',
      indicator:
      { name: 'Income_share_of_richest_20percent',
        title: 'Income share of richest 20%' } },
    { uid: 'twSOUYrIFh2W2snDUt7VaQg',
      indicator:
      { name: 'Income_share_of_2nd_richest_20percent',
        title: 'Income share of 2nd richest 20%' } },
    { uid: 't_-14NtXH6xZX48xHG75z5w',
      indicator:
      { name: 'Income_share_of_middle_20percent',
        title: 'Income share of middle 20%' } },
    { uid: 'tXRyZGCfHsWMmr53VFxrqTw',
      indicator:
      { name: 'Income_share_of_2nd_poorest_20percent',
        title: 'Income share of 2nd poorest 20%' } },
    { uid: 'pyj6tScZqmEdIyrBS31XAaw',
      indicator:
      { name: 'Income_share_of_poorest_20percent',
        title: 'Income share of poorest 20%' } },
    { uid: 'trzLWJQU4SZMDpeVg3XnL5A',
      indicator:
      { name: 'Income_share_of_poorest_10percent',
        title: 'Income share of poorest 10%' } },
    { uid: '0AkBd6lyS3EmpdGJoOUJXalk3STFYUG85MkxlbnQxMmc',
      indicator:
      { name: 'Inflation_annual_percent',
        title: 'Inflation (annual %)' } },
    { uid: 'pyj6tScZqmEejn8qHNmm4LQ',
      indicator:
      { name: 'Central_bank_discount_rate_annual_percent',
        title: 'Central bank discount rate (annual %)' } },
    { uid: '0AkBd6lyS3EmpdG9sVVF6dHpGdnhQU3BkMlAtNHFwVkE',
      indicator:
      { name: 'Investments_percent_of_GDP',
        title: 'Investments (% of GDP)' } },
    { uid: '0AkBd6lyS3EmpdFgzT1ZJWW4tdDB4Q2NETTVoTG1ZYlE',
      indicator:
      { name: 'Tax_revenue_percent_of_GDP',
        title: 'Tax revenue (% of GDP)' } },
    { uid: '0AkBd6lyS3EmpdE03VFhRMnBpMGZhQ19Vbk9pMGU5VUE',
      indicator:
      { name: 'Foreign_direct_investment_net_inflows_percent_of_GDP',
        title: 'Foreign direct investment, net inflows (% of GDP)' } },
    { uid: '0AkBd6lyS3EmpdHQtSzBhVXA2WTNrVDFleUZvZ0doTUE',
      indicator:
      { name: 'Foreign_direct_investment_net_outflows_percent_of_GDP',
        title: 'Foreign direct investment, net outflows (% of GDP)' } },
    { uid: 'pyj6tScZqmEd5FA9xlfO9eA',
      indicator:
      { name: 'Patent_applications_total',
        title: 'Patent applications (total)' } },
    { uid: 'pyj6tScZqmEdMioz5VJKXHw',
      indicator:
      { name: 'Patents_granted_total',
        title: 'Patents granted (total)' } },
    { uid: 'pyj6tScZqmEe371ZVZl73eA',
      indicator:
      { name: 'Patents_in_force_total',
        title: 'Patents in force (total)' } },
    { uid: 'tBrbR3BlR_12WlTIlSTpu6g',
      indicator:
      { name: 'Poverty_percent_people_below_2_a_day',
        title: 'Poverty (% people below $2 a day)' } },
    { uid: 'trbzCrl1eb6QJG5D8j1-qQw',
      indicator:
      { name: 'Rural_poverty_percent_rural_people_below_national_rural',
        title: 'Rural poverty (% rural people below national rural poverty line)' } },
    { uid: 'tublssyj-uqIY25OoRupbCw',
      indicator:
      { name: 'Urban_poverty_percent_urban_people_below_national_urban',
        title: 'Urban poverty (% urban people below national urban poverty line)' } },
    { uid: 't1YAVXUoD3iJKy2mSq2Padw',
      indicator:
      { name: 'Extreme_poverty_percent_people_below_125_a_day',
        title: 'Extreme poverty (% people below $1.25 a day)' } },
    { uid: '0AkBd6lyS3EmpdFhPbDdCTTYxM1dGc21UdE9sSkp1WEE',
      indicator:
      { name: 'Agriculture_percent_of_GDP',
        title: 'Agriculture (% of GDP)' } },
    { uid: '0AkBd6lyS3EmpdHA2UEFOYTlUTWtzV29xbHFuMU00SFE',
      indicator:
      { name: 'Industry_percent_of_GDP',
        title: 'Industry (% of GDP)' } },
    { uid: '0AkBd6lyS3EmpdHk4eXd4RG5Rb1gtUTB0cUJ3M21qdGc',
      indicator:
      { name: 'Services_percent_of_GDP',
        title: 'Services (% of GDP)' } },
    { uid: '0AkBd6lyS3EmpdHZSTVMxaVdxQlFLR3NMbnBEWnVuTXc',
      indicator: { name: 'Exports_percent_of_GDP', title: 'Exports (% of GDP)' } },
    { uid: '0AkBd6lyS3EmpdEhLMVdnUjZ0d05WWkhjT0FjSDIwQmc',
      indicator: { name: 'Imports_percent_of_GDP', title: 'Imports (% of GDP)' } },
    { uid: '0AkBd6lyS3EmpdGpkU3BSVmw5UXhTMWd6UFc1eXI3Rnc',
      indicator:
      { name: 'Arms_exports_US_inflation_adjusted',
        title: 'Arms exports (US$, inflation-adjusted)' } },
    { uid: '0AkBd6lyS3EmpdEljeENrOXlFXzR3Rm8xT0drTV9YclE',
      indicator:
      { name: 'Arms_imports_US_inflation_adjusted',
        title: 'Arms imports (US$, inflation adjusted)' } },
    { uid: '0Asm_G8nr4TCSdDh2NWQtVDJhYlVsTElFRjJIYkNlSnc',
      indicator:
      { name: 'Total_GDP_PPP_inflation_adjusted',
        title: 'Total GDP (PPP$, inflation-adjusted)' } },
    { uid: '0AkBd6lyS3EmpdEZkTFJZR2RNMVFuRmUzbktyTkoxREE',
      indicator:
      { name: 'High_technology_exports_percent_of_manufactured_exports',
        title: 'High-technology exports (% of manufactured exports)' } },
    { uid: '0AkBd6lyS3EmpdDJFSzRHa3g1Q29BOWlla0tTOEFyVGc',
      indicator:
      { name: 'Merchandise_trade_percent_of_GDP',
        title: 'Merchandise trade (% of GDP)' } },
    { uid: '0AkBd6lyS3EmpdEF6VzlKTzNCNjRnT0ZzMDg5a1d1Z3c',
      indicator:
      { name: 'Trade_balance_US_not_inflation_adjusted',
        title: 'Trade balance (US$, not inflation-adjusted)' } },
    { uid: '0AkBd6lyS3EmpdFpGU185SkpmZ2V4ajNPZHFaaEwtU1E',
      indicator:
      { name: 'Trade_balance_percent_of_GDP',
        title: 'Trade balance (% of GDP)' } },
    { uid: 'rEF20Sw6Sy7tn4DKsKSDDMQ',
      indicator:
      { name: 'Hourly_compensation_US',
        title: 'Hourly compensation (US$)' } },
    { uid: 'rdCufG2vozTpKw7TBGbyoWw',
      indicator:
      { name: 'Working_hours_per_week',
        title: 'Working hours per week' } },
    { uid: 'pyj6tScZqmEfMkeuokDLVIQ',
      indicator:
      { name: 'Market_value_of_listed_companies_percent_of_GDP',
        title: 'Market value of listed companies (% of GDP)' } },
    { uid: '0AkBd6lyS3EmpdDNPQjFBT2s5Zko3U2V0NFQzS3owRnc',
      indicator:
      { name: 'Military_expenditure_percent_of_GDP',
        title: 'Military expenditure (% of GDP)' } },
    { uid: 'phAwcNAVuyj3Iw3kqbjJTZQ',
      indicator:
      { name: 'Math_achievement___4th_grade',
        title: 'Math achievement - 4th grade' } },
    { uid: 'phAwcNAVuyj3fwfA8XA25Eg',
      indicator:
      { name: 'Math_achievement___8th_grade',
        title: 'Math achievement - 8th grade' } },
    { uid: 'pyj6tScZqmEcWM3hb0x-BZA',
      indicator:
      { name: 'Ratio_of_girls_to_boys_in_primary_and_secondary_education_perc',
        title: 'Ratio of girls to boys in primary and secondary education (%)' } },
    { uid: '0AkBd6lyS3EmpdE8xR0dUWDI4ME02SjQ5bi1NYnFHN0E',
      indicator:
      { name: 'Ratio_of_young_literate_females_to_males_percent_ages_15_24',
        title: 'Ratio of young literate females to males (% ages 15-24)' } },
    { uid: 'pyj6tScZqmEc96gAEE60-Zg',
      indicator:
      { name: 'Literacy_rate_adult_female_percent_of_females_ages_15_above',
        title: 'Literacy rate, adult female (% of females ages 15 and above)' } },
    { uid: 'pyj6tScZqmEd4fn4YYOvuOg',
      indicator:
      { name: 'Literacy_rate_adult_male_percent_of_males_ages_15_and_above',
        title: 'Literacy rate, adult male (% of males ages 15 and above)' } },
    { uid: 'pyj6tScZqmEdrsBnj2ROXAg',
      indicator:
      { name: 'Literacy_rate_adult_total_percent_of_people_ages_15_and_above',
        title: 'Literacy rate, adult total (% of people ages 15 and above)' } },
    { uid: 'pyj6tScZqmEf96wv_abR0OA',
      indicator:
      { name: 'Literacy_rate_youth_female_percent_of_females_ages_15_24',
        title: 'Literacy rate, youth female (% of females ages 15-24)' } },
    { uid: 'pyj6tScZqmEe7OxrqKcSWfw',
      indicator:
      { name: 'Literacy_rate_youth_male_percent_of_males_ages_15_24',
        title: 'Literacy rate, youth male (% of males ages 15-24)' } },
    { uid: 'pyj6tScZqmEepmgV0TLjBag',
      indicator:
      { name: 'Literacy_rate_youth_total_percent_of_people_ages_15_24',
        title: 'Literacy rate, youth total (% of people ages 15-24)' } },
    { uid: '0AkBd6lyS3EmpdGVSdkZnZWhfMDYybzd6U2p3NkxsZ3c',
      indicator:
      { name: 'Children_out_of_school_primary',
        title: 'Children out of school, primary' } },
    { uid: '0AkBd6lyS3EmpdFNPaEhiUDJ0QWZYOEwwQlBSTmtza1E',
      indicator:
      { name: 'Children_out_of_school_primary_female',
        title: 'Children out of school, primary, female' } },
    { uid: '0AkBd6lyS3EmpdFd5cnQzNU5IYm1vTWtrTWRIX3UxbHc',
      indicator:
      { name: 'Children_out_of_school_primary_male',
        title: 'Children out of school, primary, male' } },
    { uid: '0AkBd6lyS3EmpdEhTN2hlZ05ZczVwZDdVZlF5cUxJb2c',
      indicator:
      { name: 'Primary_completion_rate_total_percent_of_relevant_age_group',
        title: 'Primary completion rate, total (% of relevant age group)' } },
    { uid: '0AkBd6lyS3EmpdGhCWnZrTGMwaTl5ek9QS0szMTIwcEE',
      indicator:
      { name: 'Primary_school_completion_percent_of_boys',
        title: 'Primary school completion (% of boys)' } },
    { uid: '0AkBd6lyS3EmpdFVxSEVZVWE1b0l6NWo5NzNTZ2IzWVE',
      indicator:
      { name: 'Primary_school_completion_percent_of_girls',
        title: 'Primary school completion (% of girls)' } },
    { uid: '0AkBd6lyS3EmpdFJTUEVleTM0cE5jTnlTMk41ajBGclE',
      indicator:
      { name: 'Expenditure_per_student_primary_percent_of_GDP_per_person',
        title: 'Expenditure per student, primary (% of GDP per person)' } },
    { uid: '0AkBd6lyS3EmpdDBuUVIzbWwtaU5helpJVG5BMmxyX1E',
      indicator:
      { name: 'Expenditure_per_student_secondary_percent_of_GDP_per_person',
        title: 'Expenditure per student, secondary (% of GDP per person)' } },
    { uid: '0AkBd6lyS3EmpdDJxdlN6cEtYMjMxdC1XdGdKOXR2bkE',
      indicator:
      { name: 'Expenditure_per_student_tertiary_percent_of_GDP_per_person',
        title: 'Expenditure per student, tertiary (% of GDP per person)' } },
    { uid: '0ArfEDsV3bBwCdHFEVVhHZElzb0VRWE9pc3JmZHg2dWc',
      indicator:
      { name: 'Mean_years_in_school_women_25_years_and_older',
        title: 'Mean years in school (women 25 years and older)' } },
    { uid: '0ArfEDsV3bBwCdC03X1ZWNGJHR3FBb0Q3VjJIdV9OSmc',
      indicator:
      { name: 'Mean_years_in_school_men_25_years_and_older',
        title: 'Mean years in school (men 25 years and older)' } },
    { uid: '0ArfEDsV3bBwCdC1MYzAtY2xPQ2xOR1lMeGhYSWlpR0E',
      indicator:
      { name: 'Mean_years_in_school_women_25_to_34_years',
        title: 'Mean years in school (women 25 to 34 years)' } },
    { uid: '0ArfEDsV3bBwCdHlYZHNWN1YtWVNudU9UbWJOd19nUVE',
      indicator:
      { name: 'Mean_years_in_school_men_25_to_34_years',
        title: 'Mean years in school (men 25 to 34 years)' } },
    { uid: '0ArfEDsV3bBwCdEttYjNNUTlkUTdrMUQ0c3BTR0dINlE',
      indicator:
      { name: 'Mean_years_in_school_women_of_reproductive_age_15_to_44',
        title: 'Mean years in school (women of reproductive age 15 to 44)' } },
    { uid: '0ArfEDsV3bBwCdG5JUDZjTHR5SzZFZjBqa2JYYUxBclE',
      indicator:
      { name: 'Mean_years_in_school_women_percent_men_25_to_34_years',
        title: 'Mean years in school (women % men, 25 to 34 years)' } },
    { uid: '0AkBd6lyS3EmpdHd2Nld0NEVFOGRiSTc0V3ZoekNuS1E',
      indicator: { name: 'Energy_use_total', title: 'Energy use, total' } },
    { uid: '0AkBd6lyS3EmpdHRmYjJWLVF0SjlQY1N5Vm9yU0xxaGc',
      indicator:
      { name: 'Energy_use_per_person',
        title: 'Energy use, per person' } },
    { uid: '0AkBd6lyS3EmpdFNZMXZwcjNPY2c3MWwxbWIwVFgyd0E',
      indicator:
      { name: 'Energy_production_total',
        title: 'Energy production, total' } },
    { uid: '0AkBd6lyS3EmpdHJ6UTV4MkEyN0NYdnJJOG1oYUxmTWc',
      indicator:
      { name: 'Energy_production_per_person',
        title: 'Energy production, per person' } },
    { uid: 'pyj6tScZqmEdz8B4njtoHPA',
      indicator:
      { name: 'Pump_price_for_gasoline_US_per_liter',
        title: 'Pump price for gasoline (US$ per liter)' } },
    { uid: '0Auk0ddvGIrGqcHlqNnRTY1pxbUVjMVRtTWlGZG1PVmc',
      indicator:
      { name: 'Coal_consumption_total',
        title: 'Coal consumption, total' } },
    { uid: '0Auk0ddvGIrGqcHlqNnRTY1pxbUVka1hObHlPbTlmUUE',
      indicator:
      { name: 'Coal_consumption_per_cap',
        title: 'Coal consumption, per person' } },
    { uid: 'tiVeyAJd7iRWorOwl_ARWEQ',
      indicator:
      { name: 'Electricity_use_per_person',
        title: 'Electricity use, per person' } },
    { uid: 'tEu78F4acf0u6MRyhg5-9qQ',
      indicator:
      { name: 'Electricity_use_total',
        title: 'Electricity use, total' } },
    { uid: 't7SFNscT9Ex0s9i3av7PxRQ',
      indicator:
      { name: 'Residential_electricity_use_per_person',
        title: 'Residential electricity use, per person' } },
    { uid: 'teUZEfKw52HewO3D0YrQ5HA',
      indicator:
      { name: 'Residential_electricity_use_total',
        title: 'Residential electricity use, total' } },
    { uid: 'tAwlNo30o6vVgDUk0EmDolQ',
      indicator:
      { name: '———————————————————————',
        title: '———————————————————————' } },
    { uid: 'pyj6tScZqmEehRG-9mMHYdg',
      indicator:
      { name: 'Electricity_generation_total',
        title: 'Electricity generation, total' } },
    { uid: 'pyj6tScZqmEeMtYNdMyLKOw',
      indicator:
      { name: 'Electricity_generation_per_person',
        title: 'Electricity generation, per person' } },
    { uid: 't1MShlv870O6LmFNEHazdEg',
      indicator:
      { name: 'Hydro_power_generation_total',
        title: 'Hydroelectric electricity production, total' } },
    { uid: 'tSjVrGemv30eCh3jPZkXYCQ',
      indicator:
      { name: 'Hydro_power_generation_per_person',
        title: 'Hydroelectric electricity production, per person' } },
    { uid: 'trRb8ZIaBOD4KzikShshZ2g',
      indicator:
      { name: 'Nuclear_power_generation_total',
        title: 'Nuclear electricity production, total' } },
    { uid: 't28UhT9IaWINamciSiJIS7w',
      indicator:
      { name: 'Nuclear_power_generation_per_person',
        title: 'Nuclear electricity production, per person' } },
    { uid: 'pyj6tScZqmEfv2K6dZmskWg',
      indicator:
      { name: 'Natural_gas_production_total',
        title: 'Natural gas production, total' } },
    { uid: 'pyj6tScZqmEf0IBo_AGrgKA',
      indicator:
      { name: 'Natural_gas_production_per_person',
        title: 'Natural gas production, per person' } },
    { uid: 'pyj6tScZqmEfZd6DbNF1MKA',
      indicator:
      { name: 'Natural_gas_proven_reserves_per_person',
        title: 'Natural gas proven reserves, per person' } },
    { uid: 'pyj6tScZqmEc5qiv87tr3NA',
      indicator:
      { name: 'Natural_gas_proved_reserves_total',
        title: 'Natural gas proved reserves, total' } },
    { uid: 'pyj6tScZqmEeUgUuvuJTONQ',
      indicator:
      { name: 'Oil_production_per_person',
        title: 'Oil production, per person' } },
    { uid: 'pyj6tScZqmEdNIa3ckVXaCQ',
      indicator: { name: 'Oil_production_total', title: 'Oil production, total' } },
    { uid: 'pyj6tScZqmEfrI4YlDJDUag',
      indicator:
      { name: 'Oil_proven_reserves_per_person',
        title: 'Oil proven reserves, per person' } },
    { uid: 'pyj6tScZqmEfJfS1WYrLeBA',
      indicator:
      { name: 'Oil_proved_reserves_total',
        title: 'Oil proved reserves, total' } },
    { uid: 'pyj6tScZqmEcm0fIa0IVtKw',
      indicator:
      { name: 'Oil_consumption_total',
        title: 'Oil consumption, total' } },
    { uid: '0ArfEDsV3bBwCdERNZmlfUGM5YVE3bmEwODdlRDFqSkE',
      indicator:
      { name: 'Oil_consumption_per_cap',
        title: 'Oil consumption, per person' } },
    { uid: 'rvRwTPi0n_94EScVA3YjLeg',
      indicator:
      { name: 'Drought___deaths_annual_number',
        title: 'Drought - deaths annual number' } },
    { uid: 'rvbbs7uxQc7swJ4RR2BcQfA',
      indicator:
      { name: 'Earthquake___deaths_annual_number',
        title: 'Earthquake - deaths annual number' } },
    { uid: 'rvtZF_JC0OI27tL66o6hiMQ',
      indicator:
      { name: 'Epidemic___deaths_annual_number',
        title: 'Epidemic - deaths annual number' } },
    { uid: 'r4WUTsck3NfccM6UsKlGF7g',
      indicator:
      { name: 'Extreme_temperature___deaths_annual_number',
        title: 'Extreme temperature - deaths annual number' } },
    { uid: 'rtESPUlrTyLEoHpURqE8RAg',
      indicator:
      { name: 'Flood___deaths_annual_number',
        title: 'Flood - deaths annual number' } },
    { uid: 'r0JePjBgBQqtuh5wh1Wz9CA',
      indicator:
      { name: 'Storm___deaths_annual_number',
        title: 'Storm - deaths annual number' } },
    { uid: 'rdBew79hTeXcIXhB1VCTPfg',
      indicator:
      { name: 'Tsunami___deaths_annual_number',
        title: 'Tsunami - deaths annual number' } },
    { uid: 'rSv5aMDwESiKg-yA__-tRFg',
      indicator:
      { name: 'Plane_crash___deaths_annual_number',
        title: 'Plane crash - deaths annual number' } },
    { uid: 'tdKPTXS1U5Jn3qAQICk4-Vw',
      indicator:
      { name: '———————————————————————',
        title: '———————————————————————' } },
    { uid: 'rAYA0bjnfYwzXnir0cigijQ',
      indicator:
      { name: 'Drought___affected_annual_number',
        title: 'Drought - affected annual number' } },
    { uid: 'rG_BjsDwyS2n7DANNH3i5vQ',
      indicator:
      { name: 'Earthquake___affected_annual_number',
        title: 'Earthquake - affected annual number' } },
    { uid: 'r6H8dfVPu2CJ2nzI8X0jurw',
      indicator:
      { name: 'Epidemic___affected_annual_number',
        title: 'Epidemic - affected annual number' } },
    { uid: 'ryPd-H6Kn3wcHC50zyImqUg',
      indicator:
      { name: 'Extreme_temperature___affected_annual_number',
        title: 'Extreme temperature - affected annual number' } },
    { uid: 'rsCDusOObseaoBUdarzw7Kw',
      indicator:
      { name: 'Flood___affected_annual_number',
        title: 'Flood - affected annual number' } },
    { uid: 'rAxnmm4ZL2HrYjIqJX0Ch-w',
      indicator:
      { name: 'Storm___affected_annual_number',
        title: 'Storm - affected annual number' } },
    { uid: 'rskN46tpbe6Iy3K_ULk1_cQ',
      indicator:
      { name: 'Tsunami___affected_annual_number',
        title: 'Tsunami - affected annual number' } },
    { uid: 'rhbS3kWOfMzvY4ofUFoeFJg',
      indicator:
      { name: 'Plane_crash___affected_annual_number',
        title: 'Plane crash - affected annual number' } },
    { uid: '0AkBd6lyS3EmpdEVUcEJVRzlFWWRRcjhveGlrQzdwdUE',
      indicator:
      { name: 'CO2_intensity_of_economic_output_kg_CO2_per_2005_PPP__of_GDP',
        title: 'CO2 intensity of economic output (kg CO2 per 2005 PPP $ of GDP)' } },
    { uid: 'pyj6tScZqmEed4UamoiNCFA',
      indicator:
      { name: 'Cumulative_CO2_emissions_tonnes',
        title: 'Cumulative CO2 emissions (tonnes)' } },
    { uid: 'phAwcNAVuyj0uBndTxZAXNQ',
      indicator:
      { name: 'Sulfur_emissions_per_person_kg',
        title: 'Sulfur emissions per person (kg)' } },
    { uid: 'phAwcNAVuyj1NHPC9MyZ9SQ',
      indicator:
      { name: 'Yearly_CO2_emissions_tonnes',
        title: 'Yearly CO2 emissions (2012 version)' } },
    { uid: 't9SYWh7siLJDzyZYN1R4HfQ',
      indicator:
      { name: 'Total_sulfur_emission_kilotonnes',
        title: 'Total sulfur emission (kilotonnes)' } },
    { uid: 'pp59adS3CHWeB1N1HlpFQVQ',
      indicator:
      { name: 'Forest_land_total_area_ha',
        title: 'Forest land, total area (ha)' } },
    { uid: 'pp59adS3CHWeECA6Gf__BNQ',
      indicator:
      { name: 'Primary_forest_area_ha',
        title: 'Primary forest area (ha)' } },
    { uid: 'pp59adS3CHWc4aJd9fV8zZg',
      indicator:
      { name: 'Planted_forest_area_ha',
        title: 'Planted forest area (ha)' } },
    { uid: 'pp59adS3CHWe8O-N9RgxzDw',
      indicator:
      { name: 'Wood_removal_cubic_meters',
        title: 'Wood removal (cubic meters)' } },
    { uid: 'pp59adS3CHWfRGgfhjf8FBQ',
      indicator:
      { name: 'Forest_coverage_percent',
        title: 'Forest coverage (%)' } },
    { uid: 'pp59adS3CHWcsSl830EklJA',
      indicator:
      { name: 'Biomass_stock_in_forest_tons',
        title: 'Biomass stock in forest (tons)' } },
    { uid: 'pp59adS3CHWdFemmS_iN5fw',
      indicator:
      { name: 'Privately_owned_forest_land_percent',
        title: 'Privately owned forest land (%)' } },
    { uid: 'pp59adS3CHWdtCylhQOQiXw',
      indicator:
      { name: 'Privately_owned_other_wooded_land_percent',
        title: 'Privately owned other wooded land (%)' } },
    { uid: 'pp59adS3CHWf66stZ2oNUAA',
      indicator:
      { name: 'Forest_products_removal_total_',
        title: 'Forest products removal, total ($)' } },
    { uid: 'pp59adS3CHWd9CVdfFx1dEw',
      indicator:
      { name: 'Forest_products_removal_per_ha_',
        title: 'Forest products removal, per ha ($)' } },
    { uid: '0AkBd6lyS3EmpdEF3alRGS0JQZVgwSW1FWUxUQmZoWXc',
      indicator:
      { name: 'Agricultural_land_percent_of_land_area',
        title: 'Agricultural land (% of land area)' } },
    { uid: '0AkBd6lyS3EmpdFRuaV91Mm9JeUhwR1hHRXJhV3ZBQkE',
      indicator: { name: 'Forest_area_sq_km', title: 'Forest area (sq. km)' } },
    { uid: '0AkBd6lyS3EmpdFFWcWdEM0RXT1lRZ0wwRVNsakZCaWc',
      indicator: { name: 'Surface_area_sq_km', title: 'Surface area (sq. km)' } },
    { uid: 'rPN9VekxwpUzwowMaxg9Ybw',
      indicator:
      { name: 'Renewable_water_cu_meters_per_person',
        title: 'Renewable water (cu meters per person)' } },
    { uid: 'riLRFECHMsTq7OTa2KYZCWA',
      indicator:
      { name: 'Internal_renewable_water_cu_meters_per_person',
        title: 'Internal renewable water (cu meters per person)' } },
    { uid: 'rezAT4nYhKc2Loe6CxWSPWw',
      indicator:
      { name: 'Water_withdrawal_cu_meters_per_person',
        title: 'Water withdrawal (cu meters per person)' } },
    { uid: 'ruUmTRBZ5xYjpOAhOT9VQbw',
      indicator:
      { name: 'Municipal_water_withdrawal_cu_meters_per_person',
        title: 'Municipal water withdrawal (cu meters per person)' } },
    { uid: 'rab3jHe_JZrU1pqlX0xnQEw',
      indicator:
      { name: 'Agricultural_water_withdrawal_percent_of_total',
        title: 'Agricultural water withdrawal (% of total)' } },
    { uid: 'rGKP-BBylLOM11iGahW1lxA',
      indicator:
      { name: 'Industrial_water_withdrawal_percent_of_total',
        title: 'Industrial water withdrawal (% of total)' } },
    { uid: 'r58mA3XNUvBov6M_1T_FiUg',
      indicator:
      { name: 'Municipal_water_withdrawal_percent_of_total',
        title: 'Municipal water withdrawal (% of total)' } },
    { uid: 'rt3BaikcRwJBNC0CvQsjDCA',
      indicator:
      { name: 'Desalinated_water_produced_billion_cu_meters',
        title: 'Desalinated water produced (billion cu meters)' } },
    { uid: 'rIG3ZWxv381t2bIL2BNaIVw',
      indicator:
      { name: 'Total_water_withdrawal_billion_cu_meters',
        title: 'Total water withdrawal (billion cu meters)' } },
    { uid: 'phAwcNAVuyj0NpF2PTov2Cw',
      indicator:
      { name: 'Infant_mortality_rate_per_1000_births',
        title: 'Infant mortality (rate per 1,000 births)' } },
    { uid: '0ArfEDsV3bBwCdDdTQUtvNEJhb0RjRjU0WUtET1R0Vnc',
      indicator: { name: 'Underweight_children', title: 'Underweight children' } },
    { uid: 'tbpc_fYEqPzaE7pDWBG84Rw',
      indicator:
      { name: 'All_causes_deaths_in_newborn_per_1000_births',
        title: 'All causes deaths in newborn (per 1,000 births)' } },
    { uid: 't_0WcTuc94YT9cJVvy1tmUg',
      indicator:
      { name: 'Birth_asphyxia_deaths_in_newborn_per_1000_births',
        title: 'Birth asphyxia deaths in newborn (per 1,000 births)' } },
    { uid: 'tneegXfZGHA0-nLG25ypnyg',
      indicator:
      { name: 'Congenital_deaths_in_newborn_per_1000_births',
        title: 'Congenital deaths in newborn (per 1,000 births)' } },
    { uid: 'tX7NQAP_5H4TOS1OEnxdxYw',
      indicator:
      { name: 'Diarrhoeal_deaths_in_newborn_per_1000_births',
        title: 'Diarrhoeal deaths in newborn (per 1,000 births)' } },
    { uid: 'tOXHWd6PcUGK3Dg-k2N8Clw',
      indicator:
      { name: 'Pneumonia_deaths_in_newborn_per_1000_births',
        title: 'Pneumonia deaths in newborn (per 1,000 births)' } },
    { uid: 'tVMPnbOfGdvTRrtbuIbRw5w',
      indicator:
      { name: 'Prematurity_deaths_in_newborn_per_1000_births',
        title: 'Prematurity deaths in newborn (per 1,000 births)' } },
    { uid: 'tGVRSoAJtdwQ30CqCSexKJA',
      indicator:
      { name: 'Sepsis_deaths_in_newborn_per_1000_births',
        title: 'Sepsis deaths in newborn (per 1,000 births)' } },
    { uid: 't1E7e32tlIxtJU9UhnR9nJg',
      indicator:
      { name: 'Tetanus_deaths_in_newborn_per_1000_births',
        title: 'Tetanus deaths in newborn (per 1,000 births)' } },
    { uid: 'tiYIen5OQP0fKiQbg6g8VyA',
      indicator:
      { name: 'Other_deaths_in_newborn_per_1000_births',
        title: 'Other deaths in newborn (per 1,000 births)' } },
    { uid: 'tLiJLI_rimqrdQRWdamPPRQ',
      indicator:
      { name: '———————————————————————',
        title: '———————————————————————' } },
    { uid: 'tBVcAKWEbc2s687q6D9yuYg',
      indicator:
      { name: 'All_causes_deaths_in_newborn_total_deaths',
        title: 'All causes deaths in newborn (total deaths)' } },
    { uid: 'twrll6eL8GeIU4P71aTakmg',
      indicator:
      { name: 'Birth_asphyxia_deaths_in_newborn_total_deaths',
        title: 'Birth asphyxia deaths in newborn (total deaths)' } },
    { uid: 'tUvFsKz2lGL-GtPmw47VLdg',
      indicator:
      { name: 'Congenital_deaths_in_newborn_total_deaths',
        title: 'Congenital deaths in newborn (total deaths)' } },
    { uid: 'tKZcnGP_XImMXRZ4tZqtjMg',
      indicator:
      { name: 'Diarrhoeal_deaths_in_newborn_total_deaths',
        title: 'Diarrhoeal deaths in newborn (total deaths)' } },
    { uid: 'tjvbVGhVx7YCk1uguLrkaag',
      indicator:
      { name: 'Pneumonia_deaths_in_newborn_total_deaths',
        title: 'Pneumonia deaths in newborn (total deaths)' } },
    { uid: 'tVyFL3CyRTuGEnRQErDeSLQ',
      indicator:
      { name: 'Prematurity_deaths_in_newborn_total_deaths',
        title: 'Prematurity deaths in newborn (total deaths)' } },
    { uid: 'tRA1VmW2ZQ7sCsoD7AHIilg',
      indicator:
      { name: 'Sepsis_deaths_in_newborn_total_deaths',
        title: 'Sepsis deaths in newborn (total deaths)' } },
    { uid: 'tB6Gkh4rLC9yB2TXfHSApIA',
      indicator:
      { name: 'Tetanus_deaths_in_newborn_total_deaths',
        title: 'Tetanus deaths in newborn (total deaths)' } },
    { uid: 'tyPO4OLCIZtK5zcdkafcHMA',
      indicator:
      { name: 'Other_deaths_in_newborn_total_deaths',
        title: 'Other deaths in newborn (total deaths)' } },
    { uid: 't9FP3_OPrE2ug_I_iNsbePg',
      indicator:
      { name: 'All_causes_deaths_in_children_1_59_months_per_1000_births',
        title: 'All causes deaths in children 1-59 months (per 1,000 births)' } },
    { uid: 'tADSStUzP0ADEPYqsIfVHMQ',
      indicator:
      { name: 'Diarrhoeal_deaths_in_children_1_59_months_per_1000_births',
        title: 'Diarrhoeal deaths in children 1-59 months (per 1,000 births)' } },
    { uid: 't4C4M_ynK9Ho8tGRj6a5U5w',
      indicator:
      { name: 'HIV_deaths_in_children_1_59_months_per_1000_births',
        title: 'HIV deaths in children 1-59 months (per 1,000 births)' } },
    { uid: 'tfOi0Ji7pJDJbxJVqwJXj9g',
      indicator:
      { name: 'Injury_deaths_in_children_1_59_months_per_1000_births',
        title: 'Injury deaths in children 1-59 months (per 1,000 births)' } },
    { uid: 'tunqKEwokfnJMDA1g7W8KwA',
      indicator:
      { name: 'Malaria_deaths_in_children_1_59_months_per_1000_births',
        title: 'Malaria deaths in children 1-59 months (per 1,000 births)' } },
    { uid: 'tfyKUbGu10P_WOgHSOHhCJg',
      indicator:
      { name: 'Measles_deaths_in_children_1_59_months_per_1000_births',
        title: 'Measles deaths in children 1-59 months (per 1,000 births)' } },
    { uid: 'tZhYsw0sliDInwowT0iWTLQ',
      indicator:
      { name: 'Meningitis_deaths_in_children_1_59_months_per_1000_births',
        title: 'Meningitis deaths in children 1-59 months (per 1,000 births)' } },
    { uid: 'tqAEpy6pMtN7ULlF6uIzEog',
      indicator:
      { name: 'NCD_deaths_in_children_1_59_months_per_1000_births',
        title: 'NCD deaths in children 1-59 months (per 1,000 births)' } },
    { uid: 't4RbfeK6Dtt2srxw4REoXxQ',
      indicator:
      { name: 'Pertussis_deaths_in_children_1_59_months_per_1000_births',
        title: 'Pertussis deaths in children 1-59 months (per 1,000 births)' } },
    { uid: 'tCe8N5KXAYCJteQokAqVM_A',
      indicator:
      { name: 'Pneumonia_deaths_in_children_1_59_months_per_1000_births',
        title: 'Pneumonia deaths in children 1-59 months (per 1,000 births)' } },
    { uid: 'tVAqgYwCDZfcq9jSCI87SAw',
      indicator:
      { name: 'Other_infections_deaths_in_children_1_59_months_per_1000_birt',
        title: 'Other infections deaths in children 1-59 months (per 1,000 births)' } },
    { uid: 'tFrUv6vnhhO4Jr1czdG_p0Q',
      indicator:
      { name: '———————————————————————',
        title: '———————————————————————' } },
    { uid: 'taYeez4Mkk8OvdH-q4QAxxQ',
      indicator:
      { name: 'All_causes_deaths_in_children_1_59_months_total_deaths',
        title: 'All causes deaths in children 1-59 months (total deaths)' } },
    { uid: 'tDzIq4iIDwNtYthN_QYZwZg',
      indicator:
      { name: 'Diarrhoeal_deaths_in_children_1_59_months_total_deaths',
        title: 'Diarrhoeal deaths in children 1-59 months (total deaths)' } },
    { uid: 'tQe6yinBBauXLvBFroZEL3Q',
      indicator:
      { name: 'HIV_deaths_in_children_1_59_months_total_deaths',
        title: 'HIV deaths in children 1-59 months (total deaths)' } },
    { uid: 'tnRIpcH0InZUFz7f2ziXKog',
      indicator:
      { name: 'Injury_deaths_in_children_1_59_months_total_deaths',
        title: 'Injury deaths in children 1-59 months (total deaths)' } },
    { uid: 't1Vf-4rkGlG20pYzuGib3hw',
      indicator:
      { name: 'Malaria_deaths_in_children_1_59_months_total_deaths',
        title: 'Malaria deaths in children 1-59 months (total deaths)' } },
    { uid: 'tYZAce4wGXEp5Jve3AI7yWQ',
      indicator:
      { name: 'Measles_deaths_in_children_1_59_months_total_deaths',
        title: 'Measles deaths in children 1-59 months (total deaths)' } },
    { uid: 'tX-vHLzEZ7mqfk1vf6SbUXA',
      indicator:
      { name: 'Meningitis_deaths_in_children_1_59_months_total_deaths',
        title: 'Meningitis deaths in children 1-59 months (total deaths)' } },
    { uid: 'tfmFGk3PIvTgimegQiHOtSQ',
      indicator:
      { name: 'NCD_deaths_in_children_1_59_months_total_deaths',
        title: 'NCD deaths in children 1-59 months (total deaths)' } },
    { uid: 'tdOlzqGxVdDnnCpfWyyGX1A',
      indicator:
      { name: 'Pertussis_deaths_in_children_1_59_months_total_deaths',
        title: 'Pertussis deaths in children 1-59 months (total deaths)' } },
    { uid: 'tcYkTk6KMHsrXzcM9WyUxbw',
      indicator:
      { name: 'Pneumonia_deaths_in_children_1_59_months_total_deaths',
        title: 'Pneumonia deaths in children 1-59 months (total deaths)' } },
    { uid: 'tiehFos6jB-lekEAH028deA',
      indicator:
      { name: 'Other_infections_deaths_in_children_1_59_months_total_deaths',
        title: 'Other infections deaths in children 1-59 months (total deaths)' } },
    { uid: 'phAwcNAVuyj0Zbn8wVYsEHQ',
      indicator:
      { name: 'Breast_cancer_new_cases_per_100000_women',
        title: 'Breast cancer, new cases per 100,000 women' } },
    { uid: 'phAwcNAVuyj3XpKHFksEPcA',
      indicator:
      { name: 'Cervical_cancer_new_cases_per_100000_women',
        title: 'Cervical cancer, new cases per 100,000 women' } },
    { uid: 'phAwcNAVuyj2P7lqZXLeZAw',
      indicator:
      { name: 'ColonandRectum_cancer_new_cases_per_100000_women',
        title: 'Colon&Rectum cancer, new cases per 100,000 women' } },
    { uid: 'phAwcNAVuyj2xhaKENmyRKw',
      indicator:
      { name: 'Liver_cancer_new_cases_per_100000_women',
        title: 'Liver cancer, new cases per 100,000 women' } },
    { uid: 'phAwcNAVuyj0UaQ2DNjK9Lg',
      indicator:
      { name: 'Lung_cancer_new_cases_per_100000_women',
        title: 'Lung cancer, new cases per 100,000 women' } },
    { uid: 'phAwcNAVuyj0je8zzeM4WXQ',
      indicator:
      { name: 'Stomach_cancer_new_cases_per_100000_women',
        title: 'Stomach cancer, new cases per 100,000 women' } },
    { uid: 'teiT4rPfnWcd5mCldIm4Zhw',
      indicator:
      { name: '———————————————————————',
        title: '———————————————————————' } },
    { uid: 'phAwcNAVuyj2fGuJ1VdTpOw',
      indicator:
      { name: 'Breast_cancer_number_of_new_female_cases',
        title: 'Breast cancer, number of new female cases' } },
    { uid: 'phAwcNAVuyj0g-SgNTI23GQ',
      indicator:
      { name: 'Cervical_cancer_number_of_new_female_cases',
        title: 'Cervical cancer, number of new female cases' } },
    { uid: 'phAwcNAVuyj2L5YHqVxRTLA',
      indicator:
      { name: 'ColonandRectum_cancer_number_of_new_female_cases',
        title: 'Colon&Rectum cancer, number of new female cases' } },
    { uid: 'phAwcNAVuyj1_IYQtrqQCKQ',
      indicator:
      { name: 'Liver_cancer_number_of_new_female_cases',
        title: 'Liver cancer, number of new female cases' } },
    { uid: 'phAwcNAVuyj2oQAW8_53cVQ',
      indicator:
      { name: 'Lung_cancer_number_of_new_female_cases',
        title: 'Lung cancer, number of new female cases' } },
    { uid: 'phAwcNAVuyj1aXfw3aV83TA',
      indicator:
      { name: 'Stomach_cancer_number_of_new_female_cases',
        title: 'Stomach cancer, number of new female cases' } },
    { uid: 'tDkfgIt5oQ_ZJQ7IBmUvsUg',
      indicator:
      { name: '———————————————————————',
        title: '———————————————————————' } },
    { uid: 'phAwcNAVuyj3wJUwXXDdiGg',
      indicator:
      { name: 'Breast_cancer_deaths_per_100000_women',
        title: 'Breast cancer, deaths per 100,000 women' } },
    { uid: 'phAwcNAVuyj0jPl21g3mqfQ',
      indicator:
      { name: 'Cervical_cancer_deaths_per_100000_women',
        title: 'Cervical cancer, deaths per 100,000 women' } },
    { uid: 'phAwcNAVuyj3bdzmKAvdUSw',
      indicator:
      { name: 'ColonandRectum_cancer_deaths_per_100000_women',
        title: 'Colon&Rectum cancer, deaths per 100,000 women' } },
    { uid: 'phAwcNAVuyj2ItBsVpK9VBA',
      indicator:
      { name: 'Liver_cancer_deaths_per_100000_women',
        title: 'Liver cancer, deaths per 100,000 women' } },
    { uid: 'phAwcNAVuyj2hZorcv6aVLA',
      indicator:
      { name: 'Lung_cancer_deaths_per_100000_women',
        title: 'Lung cancer, deaths per 100,000 women' } },
    { uid: 'phAwcNAVuyj0RpUEQPgGcZQ',
      indicator:
      { name: 'Stomach_cancer_deaths_per_100000_women',
        title: 'Stomach cancer, deaths per 100,000 women' } },
    { uid: 'ts7TQEIg0amXovCDzQxV5EA',
      indicator:
      { name: '———————————————————————',
        title: '———————————————————————' } },
    { uid: 'phAwcNAVuyj07QB-Apx8RfQ',
      indicator:
      { name: 'Breast_cancer_number_of_female_deaths',
        title: 'Breast cancer, number of female deaths' } },
    { uid: 'phAwcNAVuyj2KBU_veE9AQg',
      indicator:
      { name: 'Cervical_cancer_number_of_female_deaths',
        title: 'Cervical cancer, number of female deaths' } },
    { uid: 'phAwcNAVuyj0ndPkFlozzXQ',
      indicator:
      { name: 'ColonandRectum_cancer_number_of_female_deaths',
        title: 'Colon&Rectum cancer, number of female deaths' } },
    { uid: 'phAwcNAVuyj2LwNOwMSnJQA',
      indicator:
      { name: 'Liver_cancer_number_of_female_deaths',
        title: 'Liver cancer, number of female deaths' } },
    { uid: 'phAwcNAVuyj0RMyUI1QFfaA',
      indicator:
      { name: 'Lung_cancer_number_of_female_deaths',
        title: 'Lung cancer, number of female deaths' } },
    { uid: 'phAwcNAVuyj1o1rJNFHpQZw',
      indicator:
      { name: 'Stomach_cancer_number_of_female_deaths',
        title: 'Stomach cancer, number of female deaths' } },
    { uid: 'phAwcNAVuyj2UBFFaFy3Ebg',
      indicator:
      { name: 'ColonandRectum_cancer_new_cases_per_100000_men',
        title: 'Colon&Rectum cancer, new cases per 100,000 men' } },
    { uid: 'phAwcNAVuyj1u0KpZbsopCA',
      indicator:
      { name: 'Liver_cancer_new_cases_per_100000_men',
        title: 'Liver cancer, new cases per 100,000 men' } },
    { uid: 'phAwcNAVuyj1kCRbsnNcTVg',
      indicator:
      { name: 'Lung_cancer_new_cases_per_100000_men',
        title: 'Lung cancer, new cases per 100,000 men' } },
    { uid: 'phAwcNAVuyj3qX39HWaQjEg',
      indicator:
      { name: 'Prostate_cancer_new_cases_per_100000_men',
        title: 'Prostate cancer, new cases per 100,000 men' } },
    { uid: 'phAwcNAVuyj1XKvT6zwrMPw',
      indicator:
      { name: 'Stomach_cancer_new_cases_per_100000_men',
        title: 'Stomach cancer, new cases per 100,000 men' } },
    { uid: 'tYvQLeBTuoKsyofvwGqS-9w',
      indicator:
      { name: '———————————————————————',
        title: '———————————————————————' } },
    { uid: 'phAwcNAVuyj3nBOvEwrkMTA',
      indicator:
      { name: 'ColonandRectum_cancer_number_of_new_male_cases',
        title: 'Colon&Rectum cancer, number of new male cases' } },
    { uid: 'phAwcNAVuyj2LIYJXVW9EVw',
      indicator:
      { name: 'Liver_cancer_number_of_new_male_cases',
        title: 'Liver cancer, number of new male cases' } },
    { uid: 'phAwcNAVuyj0sd0z2MGpeeA',
      indicator:
      { name: 'Lung_cancer_number_of_new_male_cases',
        title: 'Lung cancer, number of new male cases' } },
    { uid: 'phAwcNAVuyj2vXUZJKI0XHA',
      indicator:
      { name: 'Prostate_cancer_number_of_new_male_cases',
        title: 'Prostate cancer, number of new male cases' } },
    { uid: 'phAwcNAVuyj3XF3cD2lbecA',
      indicator:
      { name: 'Stomach_cancer_number_of_new_male_cases',
        title: 'Stomach cancer, number of new male cases' } },
    { uid: 'tIL264Nlw0AlIWlXuCWWNmQ',
      indicator:
      { name: '———————————————————————',
        title: '———————————————————————' } },
    { uid: 'phAwcNAVuyj0VhkB8-rRHQg',
      indicator:
      { name: 'ColonandRectum_cancer_deaths_per_100000_men',
        title: 'Colon&Rectum cancer, deaths per 100,000 men' } },
    { uid: 'phAwcNAVuyj3rojF8TmZtOw',
      indicator:
      { name: 'Liver_cancer_deaths_per_100000_men',
        title: 'Liver cancer, deaths per 100,000 men' } },
    { uid: 'phAwcNAVuyj2_ibAjsuNgYA',
      indicator:
      { name: 'Lung_cancer_deaths_per_100000_men',
        title: 'Lung cancer, deaths per 100,000 men' } },
    { uid: 'phAwcNAVuyj2S9phBhTP3dw',
      indicator:
      { name: 'Prostate_cancer_deaths_per_100000_men',
        title: 'Prostate cancer, deaths per 100,000 men' } },
    { uid: 'phAwcNAVuyj3ky4_oAkatBw',
      indicator:
      { name: 'Stomach_cancer_deaths_per_100000_men',
        title: 'Stomach cancer, deaths per 100,000 men' } },
    { uid: 'tFc2tyrcWLcUyGhq6mTAbDg',
      indicator:
      { name: '———————————————————————',
        title: '———————————————————————' } },
    { uid: 'phAwcNAVuyj0-sqkfnD4rGA',
      indicator:
      { name: 'ColonandRectum_cancer_number_of_male_deaths',
        title: 'Colon&Rectum cancer, number of male deaths' } },
    { uid: 'phAwcNAVuyj1RD88c3w1vNg',
      indicator:
      { name: 'Liver_cancer_number_of_male_deaths',
        title: 'Liver cancer, number of male deaths' } },
    { uid: 'phAwcNAVuyj2Az43qu-dQJQ',
      indicator:
      { name: 'Lung_cancer_number_of_male_deaths',
        title: 'Lung cancer, number of male deaths' } },
    { uid: 'phAwcNAVuyj1ImYURLRHPRA',
      indicator:
      { name: 'Prostate_cancer_number_of_male_deaths',
        title: 'Prostate cancer, number of male deaths' } },
    { uid: 'phAwcNAVuyj2NmCvOcsjpag',
      indicator:
      { name: 'Stomach_cancer_number_of_male_deaths',
        title: 'Stomach cancer, number of male deaths' } },
    { uid: 'phAwcNAVuyj3XYThRy0yJMA',
      indicator:
      { name: 'Total_health_spending_percent_of_GDP',
        title: 'Total health spending (% of GDP)' } },
    { uid: 'pyj6tScZqmEcJI3KBJnrlDQ',
      indicator:
      { name: 'Government_share_of_total_health_spending_percent',
        title: 'Government share of total health spending (%)' } },
    { uid: 'pyj6tScZqmEcXBFxQw8cFaw',
      indicator:
      { name: 'Private_share_of_total_health_spending_percent',
        title: 'Private share of total health spending (%)' } },
    { uid: 'tXf6_OUYVmyEMZo0g4DQw6w',
      indicator:
      { name: 'Out_of_pocket_share_of_total_health_spending_percent',
        title: 'Out-of-pocket share of total health spending (%)' } },
    { uid: 'pyj6tScZqmEd7K-YgYOkGFQ',
      indicator:
      { name: 'Government_health_spending_of_total_gov_spending_percent',
        title: 'Government health spending of total gov. spending (%)' } },
    { uid: 'tJwP0x54AZ-X-bGL-RebrpA',
      indicator:
      { name: '———————————————————————',
        title: '———————————————————————' } },
    { uid: 'tR3MM-UTZ0B44BKxxWeAZaQ',
      indicator:
      { name: 'Total_health_spending_per_person_international_',
        title: 'Total health spending per person (international $)' } },
    { uid: 'tZ3uHUdw0H__Siyj78GXsGg',
      indicator:
      { name: 'Government_health_spending_per_person_international_',
        title: 'Government health spending per person (international $)' } },
    { uid: 'pyj6tScZqmEeL79qOoKtofQ',
      indicator:
      { name: 'Total_health_spending_per_person_US',
        title: 'Total health spending per person (US$)' } },
    { uid: 'tBwBBkViOJoycBhLnWHqwSQ',
      indicator:
      { name: 'Government_health_spending_per_person_US',
        title: 'Government health spending per person (US$)' } },
    { uid: 'phAwcNAVuyj2yo1IzJQmbZg',
      indicator:
      { name: 'Medical_Doctors_per_1000_people',
        title: 'Medical Doctors (per 1,000 people)' } },
    { uid: 'pyj6tScZqmEe1GaiYJX2qGA',
      indicator:
      { name: 'People_living_with_HIV_number_all_ages',
        title: 'People living with HIV (number, all ages)' } },
    { uid: 'pyj6tScZqmEfbZyl0qjbiRQ',
      indicator:
      { name: 'Adults_with_HIV_percent_age_15_49',
        title: 'Adults with HIV (%, age 15-49)' } },
    { uid: '0ArfEDsV3bBwCdFk2WGhwakxTQkt4NUtTdFJDSlFHQ3c',
      indicator:
      { name: 'Newly_HIV_infected_number_all_ages',
        title: 'Newly HIV infected (number, all ages)' } },
    { uid: '0ArfEDsV3bBwCdDREUkRSRDJtQmFNTE1TYmRYX1pFNEE',
      indicator:
      { name: 'Newly_HIV_infected_percent_age_15_49',
        title: 'Newly HIV infected (%, age 15-49)' } },
    { uid: '0ArfEDsV3bBwCdHZJdFBhYVlvck43d1R6ZFYzUWpiLWc',
      indicator:
      { name: 'Annual_HIV_deaths_number_all_ages',
        title: 'Annual HIV deaths (number, all ages)' } },
    { uid: '0ArfEDsV3bBwCdHMzRDA5Z1RjWkJIWkNfdWNBVFR6b1E',
      indicator:
      { name: 'ART_coverage_percent_CD4_l_350',
        title: 'ART coverage % (CD4 < 350)' } },
    { uid: 'pp59adS3CHWcGnFB9pe14OA',
      indicator:
      { name: 'Malaria_cases_per_100000___reported',
        title: 'Malaria cases per 100,000 - reported' } },
    { uid: 'pp59adS3CHWfGZUVJ2L-dCw',
      indicator:
      { name: 'Malaria_deaths_per_100000___reported',
        title: 'Malaria deaths per 100,000 - reported' } },
    { uid: 'pp59adS3CHWczfPHQMiqxCg',
      indicator:
      { name: 'Malaria_number_of_cases___reported',
        title: 'Malaria number of cases - reported' } },
    { uid: 'pp59adS3CHWfZGL9qouvTbQ',
      indicator:
      { name: 'Malaria_number_of_deaths___reported',
        title: 'Malaria number of deaths - reported' } },
    { uid: '0AkBd6lyS3EmpdF9OQ2dSSG5nNFhpS3RnRVZHUzZMb3c',
      indicator:
      { name: 'Births_attended_by_skilled_health_staff_percent_of_total',
        title: 'Births attended by skilled health staff (% of total)' } },
    { uid: '0AkBd6lyS3EmpdFp2OENYMUVKWnY1dkJLRXAtYnI3UVE',
      indicator:
      { name: 'Contraceptive_use_percent_of_women_ages_15_49',
        title: 'Contraceptive use (% of women ages 15-49)' } },
    { uid: 'pyj6tScZqmEcVezxiMlWaRw',
      indicator:
      { name: 'Maternal_mortality_ratio_per_100000_live_births',
        title: 'Maternal mortality ratio (per 100,000 live births)' } },
    { uid: 'tOJs331rbt36sNBXE8g5AUg',
      indicator:
      { name: 'Maternal_deaths_total_number',
        title: 'Maternal deaths, total number' } },
    { uid: 't2ha4jg1M70Le8CH3wHcPIQ',
      indicator:
      { name: 'Maternal_deaths_lifetime_risk_per_1000',
        title: 'Maternal deaths, lifetime risk (per 1,000)' } },
    { uid: 'tgJHpDEY4S7hxJpELGJueWA',
      indicator:
      { name: 'Stillbirths_per_1000_births',
        title: 'Stillbirths (per 1,000 births)' } },
    { uid: 'troMumuI0Y6Phpwnj6qXa_A',
      indicator:
      { name: 'Suicide_per_100000_people',
        title: 'Suicide (per 100,000 people)' } },
    { uid: '0AkBd6lyS3EmpdGhpWDY5QVlOdUxpVGhaMVlUOE9iX0E',
      indicator:
      { name: 'Malnutrition_weight_for_age_percent_of_children_under_5',
        title: 'Malnutrition, weight for age (% of children under 5)' } },
    { uid: 'phAwcNAVuyj2sdmdhX9zuKg',
      indicator:
      { name: 'Sugar_per_person_g_per_day',
        title: 'Sugar per person (g per day)' } },
    { uid: '0ArfEDsV3bBwCdGlYVVpXX20tbU13STZyVG0yNkRrZnc',
      indicator:
      { name: 'Food_supply_kilocalories_per_person_and_day',
        title: 'Food supply (kilocalories / person & day)' } },
    { uid: '0AgogXXPMARyldGJqTDRfNHBWODJMRWlZaVhNclhNZXc',
      indicator:
      { name: 'Alcohol_consumption_per_adult_15plus_litres',
        title: 'Alcohol consumption per adult 15+ (litres)' } },
    { uid: 'tRccVp7QMaCXMv19CcxERaA',
      indicator:
      { name: 'Smoking_adults_percent_of_population_over_age_15',
        title: 'Smoking adults (% of population over age 15)' } },
    { uid: 'thortPEzDn2xc_5bU255mPA',
      indicator:
      { name: 'Smoking_women_percent_of_women_over_age_15_',
        title: 'Smoking women (% of women over age 15) ' } },
    { uid: 't60tpjxpWq3Bm-nBOvSm3og',
      indicator:
      { name: 'Smoking_men_percent_of_men_over_age_15_',
        title: 'Smoking men (% of men over age 15) ' } },
    { uid: '0ArfEDsV3bBwCdF9saE1pWUNYVkVsNU1FdW1Yem81Nmc',
      indicator:
      { name: 'Body_Mass_Index_BMI_men_Kgperm2',
        title: 'Body Mass Index (BMI), men, Kg/m2' } },
    { uid: '0ArfEDsV3bBwCdGt0elo2dzJMVVQ3WmFGSmdhc09LRlE',
      indicator:
      { name: 'Body_Mass_Index_BMI_women_Kgperm2',
        title: 'Body Mass Index (BMI), women, Kg/m2' } },
    { uid: '0ArfEDsV3bBwCdHNwRm9DN1FnT3hXWWZVSncxMkZyS2c',
      indicator:
      { name: 'Blood_pressure_SBP_men_mmHg',
        title: 'Blood pressure (SBP), men, mmHg' } },
    { uid: '0ArfEDsV3bBwCdHBzUVVSMDlTX1ZCUnNJQ3ZFdkFXVFE',
      indicator:
      { name: 'Blood_pressure_SBP_women_mmHg',
        title: 'Blood pressure (SBP), women, mmHg' } },
    { uid: '0ArfEDsV3bBwCdDU5SnRoQ0xlZWhwRUZ6RFNQV042enc',
      indicator:
      { name: 'Cholesterol_fat_in_blood_men_mmolperL',
        title: 'Cholesterol (fat) in blood, men, mmol/L' } },
    { uid: '0ArfEDsV3bBwCdGJHcHZkSUdBcU56aS1OT3lLeU4tRHc',
      indicator:
      { name: 'Cholesterol_fat_in_blood_women_mmolperL',
        title: 'Cholesterol (fat) in blood, women, mmol/L' } },
    { uid: 'rVyfxaPK4dJ9B6ZdgG34F-g',
      indicator:
      { name: 'Infectious_TB_new_cases_per_100000___estimated',
        title: 'Infectious TB, new cases per 100,000 - estimated' } },
    { uid: 'r0pD5wznwEUJ0ipdxAWQjiA',
      indicator:
      { name: 'Infectious_TB_new_cases_per_100000___reported',
        title: 'Infectious TB, new cases per 100,000 - reported' } },
    { uid: 'rOPfJcbTTIyS-vxDWbkfNLA',
      indicator:
      { name: 'Infectious_TB_number_of_new_cases___estimated',
        title: 'Infectious TB, number of new cases - estimated' } },
    { uid: 'rcbx0R-TXbkqRCyvKzn08fg',
      indicator:
      { name: 'Infectious_TB_number_of_new_cases___reported',
        title: 'Infectious TB, number of new cases - reported' } },
    { uid: 'rDb6EYc4YUTBRfXlBvjHYlg',
      indicator:
      { name: 'Infectious_TB_detection_rate_percent',
        title: 'Infectious TB, detection rate (%)' } },
    { uid: 'rjGHot8B6YSt3kPYEG8nANA',
      indicator:
      { name: 'Infectious_TB_detection_rate_percent___DOTS_only',
        title: 'Infectious TB, detection rate (%) - DOTS only' } },
    { uid: 'rewICFMTvBuer8UoJIK0yUg',
      indicator:
      { name: 'Infectious_TB_treatment_DOTS_completed_percent',
        title: 'Infectious TB, treatment (DOTS) completed (%)' } },
    { uid: 'rKfjGaPxqirPDe8gnTVKuIw',
      indicator:
      { name: 'TB_programme_DOTS_population_coverage_percent',
        title: 'TB programme (DOTS) population coverage (%)' } },
    { uid: 'rMF2H57_Vd8TdobvtNhYuwg',
      indicator:
      { name: '———————————————————————',
        title: '———————————————————————' } },
    { uid: 'rMsQHawTObBb6_U2ESjKXYw',
      indicator:
      { name: 'All_forms_of_TB_new_cases_per_100000___estimated',
        title: 'All forms of TB, new cases per 100,000 - estimated' } },
    { uid: 'rZNoyaocUmUGuFyRgjJUpig',
      indicator:
      { name: 'All_forms_of_TB_existing_cases_per_100000___estimated',
        title: 'All forms of TB, existing cases per 100,000 - estimated' } },
    { uid: 'rWM9yEzjpGJvcJlUAIm35tA',
      indicator:
      { name: 'All_forms_of_TB_deaths_per_100000___estimated',
        title: 'All forms of TB, deaths per 100,000 - estimated' } },
    { uid: 'rYICvtvVz28fVyQuG_ote2w',
      indicator:
      { name: 'All_forms_of_TB_new_cases_per_100000___reported',
        title: 'All forms of TB, new cases per 100,000 - reported' } },
    { uid: 'rhZayTbvH3ZLlSN64OuRYFg',
      indicator:
      { name: 'All_forms_of_TB_number_of_new_cases___estimated',
        title: 'All forms of TB, number of new cases - estimated' } },
    { uid: 'rOCGMcGcrZs-dfeTEC792ZQ',
      indicator:
      { name: 'All_forms_of_TB_number_of_existing_cases___estimated',
        title: 'All forms of TB, number of existing cases - estimated' } },
    { uid: 'rrQ_y5fqQPlznp5mJGXWr-A',
      indicator:
      { name: 'All_forms_of_TB_number_of_deaths___estimated',
        title: 'All forms of TB, number of deaths - estimated' } },
    { uid: 'r5UikGjnZlemlelKY0NX9Pg',
      indicator:
      { name: 'All_forms_of_TB_number_of_new_cases___reported',
        title: 'All forms of TB, number of new cases - reported' } },
    { uid: 'ru195-zJ0rsx5axPIvm_bRA',
      indicator:
      { name: 'All_forms_of_TB_detection_rate_percent_',
        title: 'All forms of TB, detection rate (%) ' } },
    { uid: 'rutVwqgB14uRV_f2dRbqhUA',
      indicator:
      { name: 'All_forms_of_TB_detection_rate_percent___DOTS_only',
        title: 'All forms of TB, detection rate (%) - DOTS only' } },
    { uid: 'rj8WsGGNXkijP447qnY5RLg',
      indicator:
      { name: '———————————————————————',
        title: '———————————————————————' } },
    { uid: 'rRCxDI3hB9E9zvc8qSe11qg',
      indicator:
      { name: 'TB_with_HIVplus_new_cases_per_100000___estimated',
        title: 'TB with HIV+, new cases per 100,000 - estimated' } },
    { uid: 'rQV47xgPGa3qOPHoLiVon-w',
      indicator:
      { name: 'TB_with_HIVplus_existing_cases_per_100000___estimated',
        title: 'TB with HIV+, existing cases per 100,000 - estimated' } },
    { uid: 'rUBCConMMLm9CxPXUGm325A',
      indicator:
      { name: 'TB_with_HIVplus_deaths_per_100000___estimated',
        title: 'TB with HIV+, deaths per 100,000 - estimated' } },
    { uid: 'rERPF4iYruK0DhAw_0tb5nA',
      indicator:
      { name: 'TB_with_HIVplus_number_of_new_cases___estimated',
        title: 'TB with HIV+, number of new cases - estimated' } },
    { uid: 'reiGJwoabnMOrPeFima_9ng',
      indicator:
      { name: 'TB_with_HIVplus_number_of_existing_cases___estimated',
        title: 'TB with HIV+, number of existing cases - estimated' } },
    { uid: 'rFAkC0Ae7oXxrVqosJ4NWUA',
      indicator:
      { name: 'TB_with_HIVplus_number_of_deaths___estimated',
        title: 'TB with HIV+, number of deaths - estimated' } },
    { uid: 'phAwcNAVuyj3Os9LVO_pRDA',
      indicator:
      { name: 'Bad_teeth_per_child_12_yr',
        title: 'Bad teeth per child (12 yr)' } },
    { uid: 'txVTyScWObTBNuMmkNtLh1w',
      indicator:
      { name: 'DTP3_immunized_percent_of_one_year_olds',
        title: 'DTP3 immunized (% of one-year-olds)' } },
    { uid: 't7pU8fR9_ZzRFIMF3FX47YQ',
      indicator:
      { name: 'HepB3_immunized_percent_of_one_year_olds',
        title: 'HepB3 immunized (% of one-year-olds)' } },
    { uid: 'thClNiXoQqfJDzTv0SYIHZg',
      indicator:
      { name: 'Hib3_immunized_percent_of_one_year_olds',
        title: 'Hib3 immunized (% of one-year-olds)' } },
    { uid: 'pyj6tScZqmEenS18Yjl_SOQ',
      indicator:
      { name: 'MCV_immunized_percent_of_one_year_olds',
        title: 'MCV immunized (% of one-year-olds)' } },
    { uid: 'tnvxVX8aOAl0dwDNujbELPQ',
      indicator:
      { name: 'PAB_immunized_percent_of_newborns',
        title: 'PAB immunized (% of newborns)' } },
    { uid: '0AkBd6lyS3EmpdEpMTHBoMmNzcDVCNVRHWE5zSVJVRHc',
      indicator:
      { name: 'Broadband_subscribers',
        title: 'Broadband subscribers (total)' } },
    { uid: '0AkBd6lyS3EmpdHdmMGVNNnV1SHBONDRTdTJzTVBKQXc',
      indicator:
      { name: 'Broadband_subscribers_per_100_people',
        title: 'Broadband subscribers (per 100 people)' } },
    { uid: '0AkBd6lyS3EmpdEhWLWtqNzljbWg4ZXV6M09JQXNGaUE',
      indicator: { name: 'Cell_phones_total', title: 'Cell phones (total)' } },
    { uid: '0AkBd6lyS3EmpdG1MSjEyS0h2QjRQZ3FXRVR2dVQyeFE',
      indicator:
      { name: 'Cell_phones_per_100_people',
        title: 'Cell phones (per 100 people)' } },
    { uid: 'pyj6tScZqmEcfLoOcU6GAfg',
      indicator:
      { name: 'Fixed_line_and_mobile_phone_subscribers_per_100_people',
        title: 'Fixed line and mobile phone subscribers (per 100 people)' } },
    { uid: '0AkBd6lyS3EmpdC1PcWJUZldDelFyQXdaOEtDUG9HSUE',
      indicator:
      { name: 'Internet_users_total_number',
        title: 'Internet users (total)' } },
    { uid: '0AkBd6lyS3EmpdGwzSGV5OE9FOGhURlhTdEQtMW1TNkE',
      indicator:
      { name: 'Internet_users_per_100_people',
        title: 'Internet users (per 100 people)' } },
    { uid: 'pyj6tScZqmEfUXdC83YSzfw',
      indicator:
      { name: 'Personal_computers_total',
        title: 'Personal computers (total)' } },
    { uid: 'pyj6tScZqmEdFW4nUY4gQdA',
      indicator:
      { name: 'Personal_computers_per_100_people',
        title: 'Personal computers (per 100 people)' } },
    { uid: '0ArfEDsV3bBwCdE4tekJPYkR4WmJqYTRPWjc3OTl4WUE',
      indicator:
      { name: 'Improved_sanitation_overall_access_percent',
        title: 'Improved sanitation, overall access (%)' } },
    { uid: 'pyj6tScZqmEfLbPu48DrKfQ',
      indicator:
      { name: 'Improved_sanitation_urban_access_percent',
        title: 'Improved sanitation, urban access (%)' } },
    { uid: '0ArfEDsV3bBwCdFNPMTE3d3FHTHdYaGFMXzJyNDBGd3c',
      indicator:
      { name: 'Improved_sanitation_rural_access_percent',
        title: 'Improved sanitation, rural access (%)' } },
    { uid: '0AkBd6lyS3EmpdDBKd2V5VmxkYlJuUHAtOURzUkZzNEE',
      indicator:
      { name: 'Roads_paved_percent_of_total_roads',
        title: 'Roads, paved (% of total roads)' } },
    { uid: 'pyj6tScZqmEd98lRwrU3gIg',
      indicator:
      { name: 'Improved_water_source_overall_access_percent',
        title: 'Improved water source, overall access (%)' } },
    { uid: '0ArfEDsV3bBwCdDlJNzNjcVc5Sm9memNuVHRzY1FsOXc',
      indicator:
      { name: 'Improved_water_source_urban_access_percent',
        title: 'Improved water source, urban access (%)' } },
    { uid: '0ArfEDsV3bBwCdFhhVzhXUEh0U0hlQ3M3TTZIQTFySUE',
      indicator:
      { name: 'Improved_water_source_rural_access_percent',
        title: 'Improved water source, rural access (%)' } },
    { uid: 'rsOONWhmGBtzb4j__0MJv7Q',
      indicator:
      { name: 'Population_aged_0_4_years_both_sexes_percent',
        title: 'Population aged 0-4 years, both sexes (%)' } },
    { uid: 'rC5UskPU6PRVlmN7eXoridw',
      indicator:
      { name: 'Population_aged_5_9_years_both_sexes_percent',
        title: 'Population aged 5-9 years, both sexes (%)' } },
    { uid: 'rmViJSkPd4xZneV2Q6gzFwQ',
      indicator:
      { name: 'Population_aged_10_14_years_both_sexes_percent',
        title: 'Population aged 10-14 years, both sexes (%)' } },
    { uid: 'r4VUu4a4AaWqXXoAsFz-z-Q',
      indicator:
      { name: 'Population_aged_15_19_years_both_sexes_percent',
        title: 'Population aged 15-19 years, both sexes (%)' } },
    { uid: 'rTU20DXn0Bi7bTwW5T6J3gg',
      indicator:
      { name: 'Population_aged_20_39_years_both_sexes_percent',
        title: 'Population aged 20-39 years, both sexes (%)' } },
    { uid: 'rLwpdKbW2OykBbvVxhYKrhA',
      indicator:
      { name: 'Population_aged_40_59_years_both_sexes_percent',
        title: 'Population aged 40-59 years, both sexes (%)' } },
    { uid: 'rH6TEe8f_WNq_8x9pWZ3W0A',
      indicator:
      { name: 'Population_aged_60plus_years_both_sexes_percent',
        title: 'Population aged 60+ years, both sexes (%)' } },
    { uid: 'rovrK0Uj9JPN95P9adob0tw',
      indicator:
      { name: 'Population_aged_0_4_years_total_number',
        title: 'Population aged 0-4 years (total number)' } },
    { uid: 'r83X3yfjC6ENYWoo41yDehg',
      indicator:
      { name: 'Population_aged_5_9_years_total_number',
        title: 'Population aged 5-9 years (total number)' } },
    { uid: 'r9ztOSMb5WNHUBLwlgJqPSw',
      indicator:
      { name: 'Population_aged_10_14_years_total_number',
        title: 'Population aged 10-14 years (total number)' } },
    { uid: 'rFmJvuotJYE30q4nWEvpGJA',
      indicator:
      { name: 'Population_aged_15_19_years_total_number',
        title: 'Population aged 15-19 years (total number)' } },
    { uid: 'rHrin819tHgZudARnpsN0Mg',
      indicator:
      { name: 'Population_aged_20_39_years_total_number',
        title: 'Population aged 20-39 years (total number)' } },
    { uid: 'ri9SXMNc7TpebHucmAYepGQ',
      indicator:
      { name: 'Population_aged_40_59_years_total_number',
        title: 'Population aged 40-59 years (total number)' } },
    { uid: 'rVD6A2uAmeIE0BQNW1KSg3A',
      indicator:
      { name: 'Population_aged_60plus_years_total_number',
        title: 'Population aged 60+ years (total number)' } },
    { uid: 'roLpNPQkooNCFzpTWXQ48Dw',
      indicator:
      { name: 'Population_aged_0_4_years_female_percent',
        title: 'Population aged 0-4 years, female (%)' } },
    { uid: 're3efChATTYAT5bRqoaChXA',
      indicator:
      { name: 'Population_aged_5_9_years_female_percent',
        title: 'Population aged 5-9 years, female (%)' } },
    { uid: 'rJwVmwTFzheqVUzYWwSqXlA',
      indicator:
      { name: 'Population_aged_10_14_years_female_percent',
        title: 'Population aged 10-14 years, female (%)' } },
    { uid: 'rYEHWlJHaLjHtcsSpRRJeig',
      indicator:
      { name: 'Population_aged_15_19_years_female_percent',
        title: 'Population aged 15-19 years, female (%)' } },
    { uid: 'rWpQHQIQdntj6BEK8OIuWYw',
      indicator:
      { name: 'Population_aged_20_39_years_female_percent',
        title: 'Population aged 20-39 years, female (%)' } },
    { uid: 'rElErbmOnSM6om03a1uinKQ',
      indicator:
      { name: 'Population_aged_40_59_years_female_percent',
        title: 'Population aged 40-59 years, female (%)' } },
    { uid: 'rjhBvpeRgCxBq0EnQVN6b0w',
      indicator:
      { name: 'Population_aged_60plus_years_female_percent',
        title: 'Population aged 60+ years, female (%)' } },
    { uid: 'rIpDsoI9lVTCh_PRqm66Tcw',
      indicator:
      { name: 'Population_aged_0_4_years_male_percent',
        title: 'Population aged 0-4 years, male (%)' } },
    { uid: 'rgyZrNmSfXcPJQxJK7IxnEw',
      indicator:
      { name: 'Population_aged_5_9_years_male_percent',
        title: 'Population aged 5-9 years, male (%)' } },
    { uid: 'rmQZ_H88rIhF3315QBZpcIQ',
      indicator:
      { name: 'Population_aged_10_14_years_male_percent',
        title: 'Population aged 10-14 years, male (%)' } },
    { uid: 'rYfw4UJZSizLRtgDs73d5jA',
      indicator:
      { name: 'Population_aged_15_19_years_male_percent',
        title: 'Population aged 15-19 years, male (%)' } },
    { uid: 'rab1GmqpzJkWd4MF0hieVgA',
      indicator:
      { name: 'Population_aged_20_39_years_male_percent',
        title: 'Population aged 20-39 years, male (%)' } },
    { uid: 'rcQkob1yAm-to1scz51flgw',
      indicator:
      { name: 'Population_aged_40_59_years_male_percent',
        title: 'Population aged 40-59 years, male (%)' } },
    { uid: 'rSkhGgUVN74knEhSAhBSSKA',
      indicator:
      { name: 'Population_aged_60plus_years_male_percent',
        title: 'Population aged 60+ years, male (%)' } },
    { uid: '0AkBd6lyS3EmpdFY5Z0QzTzRRbzJ1VXdqdGVyNE0tcFE',
      indicator:
      { name: 'Population_growth_annual_percent',
        title: 'Population growth (annual %)' } },
    { uid: 'tUSeGJOQhafugwUvHvY-wLA',
      indicator:
      { name: 'Crude_birth_rate_births_per_1000_population',
        title: 'Crude birth rate (births per 1,000 population)' } },
    { uid: 'tHyj-2jRvK3CCNJOc5Vm-HQ',
      indicator:
      { name: 'Crude_death_rate_deaths_per_1000_population',
        title: 'Crude death rate (deaths per 1,000 population)' } },
    { uid: 'pyj6tScZqmEdIphYUHxcdLg',
      indicator:
      { name: 'Teen_fertility_rate_births_per_1000_women_ages_15_19',
        title: 'Teen fertility rate (births per 1,000 women ages 15-19)' } },
    { uid: '0ArfEDsV3bBwCdERQeFplM2VWczVrMTFfMXVrQkJpVXc',
      indicator:
      { name: 'New_births_total_number_estimated',
        title: 'New births (total number, estimated)' } },
    { uid: 'tAQ31_cAELrHqNc2qa13uHw',
      indicator:
      { name: 'Sex_ratio_all_age_groups',
        title: 'Sex ratio (all age groups)' } },
    { uid: 'tfWSVJPJHn3u7e_7MUaCbnw',
      indicator:
      { name: 'Sex_ratio_0_14_years',
        title: 'Sex ratio (0-14 years)' } },
    { uid: 'ta-Da73B_Z7lKOZo8o-Ykvw',
      indicator:
      { name: 'Sex_ratio_15_24_years',
        title: 'Sex ratio (15-24 years)' } },
    { uid: 'tF_P_4G0g5bR3lYmQT9Tv4w',
      indicator:
      { name: 'Sex_ratio_15_49_years',
        title: 'Sex ratio (15-49 years)' } },
    { uid: 'tQP1KnoWcjjtz3wmq0bnGNA',
      indicator:
      { name: 'Sex_ratio_above_50_years',
        title: 'Sex ratio (above 50 years)' } },
    { uid: 'pyj6tScZqmEdwXv1tqzV4Xg',
      indicator:
      { name: 'Population_in_urban_agglomerations_m_1_million_percent_of_total',
        title: 'Population in urban agglomerations > 1 million (% of total population)' } },
    { uid: 'pyj6tScZqmEfH89V6UQhpZA',
      indicator: { name: 'Urban_population', title: 'Urban population' } },
    { uid: 'phAwcNAVuyj0-LE4StzCsEw',
      indicator:
      { name: 'Urban_population_percent_of_total',
        title: 'Urban population (% of total)' } },
    { uid: 'pyj6tScZqmEcRJEN8MyV3PQ',
      indicator:
      { name: 'Urban_population_growth_annual_percent',
        title: 'Urban population growth (annual %)' } },
    { uid: 'phAwcNAVuyj2biT80zgTsYQ',
      indicator:
      { name: 'Children_and_elderly_per_100_adults',
        title: 'Children and elderly (per 100 adults)' } },
    { uid: 'tH113JLeGr5DhWgtqN2FxWg',
      indicator: { name: 'Median_age_years', title: 'Median age (years)' } },
    { uid: 'tVY51lNaCL9m9xPqf29oFAA',
      indicator:
      { name: 'Population_density_per_square_km',
        title: 'Population density (per square km)' } },
    { uid: 'phAwcNAVuyj0XOoBL_n5tAQ',
      indicator: { name: 'Population_total', title: 'Population, total' } },
    { uid: 't4eF8H_jq_xyKCUHAX6VT1g',
      indicator:
      { name: 'Age_at_1st_marriage_women',
        title: 'Age at 1st marriage (women)' } },
    { uid: 'tZgPgT_sx3VdAuyDxEzenYA',
      indicator:
      { name: 'Murder_per_100000_people',
        title: 'Murder (per 100,000 people)' } },
    { uid: 'tKOphM3UPRd94T6C6pmsuXw',
      indicator:
      { name: 'Corruption_Perception_Index_CPI',
        title: 'Corruption Perception Index (CPI)' } },
    { uid: '0ArfEDsV3bBwCdGQ2YlhDSWVIdXdpMmhLY2ZZRHdNNnc',
      indicator:
      { name: 'Democracy_score_use_as_color',
        title: 'Democracy score (use as color)' } },
    { uid: 'tyadrylIpQ1K_iHP407374Q',
      indicator:
      { name: 'HDI_Human_Development_Index',
        title: 'HDI (Human Development Index)' } },
    { uid: 'rzFD5mOuB5mR7-vLoP04LAQ',
      indicator:
      { name: 'Agriculture_workers_percent_of_labour_force',
        title: 'Agriculture workers (% of labour force)' } },
    { uid: 'rqcJTExcUqNdolB-7flqebQ',
      indicator:
      { name: 'Industry_workers_percent_of_labour_force',
        title: 'Industry workers (% of labour force)' } },
    { uid: 'r4orIwujZpT-z3Exd_9ARpQ',
      indicator:
      { name: 'Service_workers_percent_of_labour_force',
        title: 'Service workers (% of labour force)' } },
    { uid: 'rraOr_PTB0jcQ60TagEH_WQ',
      indicator:
      { name: 'Female_agriculture_workers_percent_of_female_labour_force',
        title: 'Female agriculture workers (% of female labour force)' } },
    { uid: 'rA5BvUGX_Es43DaKb3FidUg',
      indicator:
      { name: 'Female_industry_workers_percent_of_female_labour_force',
        title: 'Female industry workers (% of female labour force)' } },
    { uid: 'r1B3mjfpBItUmvrhqaRgTWQ',
      indicator:
      { name: 'Female_service_workers_percent_of_female_labour_force',
        title: 'Female service workers (% of female labour force)' } },
    { uid: 'rtt_ihBgyYafmDJpThQecoA',
      indicator:
      { name: 'Male_agriculture_workers_percent_of_male_labour_force',
        title: 'Male agriculture workers (% of male labour force)' } },
    { uid: 'rmLnlLnnm2kjBbNsBZYxqow',
      indicator:
      { name: 'Male_industry_workers_percent_of_male_labour_force',
        title: 'Male industry workers (% of male labour force)' } },
    { uid: 'ravxsZdBslM5zF5HwDsX30g',
      indicator:
      { name: 'Male_service_workers_percent_of_male_labour_force',
        title: 'Male service workers (% of male labour force)' } },
    { uid: 'rW7k_DdDKlGgJhzYRuNvguw',
      indicator:
      { name: 'Family_workers_percent_of_labour_force',
        title: 'Family workers (% of labour force)' } },
    { uid: 'rcO6CXqmEjV-wS-29qejCpw',
      indicator:
      { name: 'Salaried_workers_percent_of_labour_force',
        title: 'Salaried workers (% of labour force)' } },
    { uid: 'rSrvaPPzWvOyTMb9_dfJDtQ',
      indicator:
      { name: 'Self_employed_percent_of_labour_force',
        title: 'Self-employed (% of labour force)' } },
    { uid: 'rjFKVVoWIVbTgdtJK2xOZqQ',
      indicator:
      { name: 'Female_family_workers_percent_of_female_labour_force',
        title: 'Female family workers (% of female labour force)' } },
    { uid: 'rhuyv42EAyApMwy4tDYm3XQ',
      indicator:
      { name: 'Female_salaried_workers_percent_of_female_labour_force',
        title: 'Female salaried workers (% of female labour force)' } },
    { uid: 'rIe2Y4f4Ehde4I4BGPN2VBg',
      indicator:
      { name: 'Female_self_employed_percent_of_female_labour_force',
        title: 'Female self-employed (% of female labour force)' } },
    { uid: 'rJMlhr2YOvL2EE5NhpbfYAg',
      indicator:
      { name: 'Male_family_workers_percent_of_male_labour_force',
        title: 'Male family workers (% of male labour force)' } },
    { uid: 'riwXFQrsUhb96BT2yFC9rFw',
      indicator:
      { name: 'Male_salaried_workers_percent_of_male_labour_force',
        title: 'Male salaried workers (% of male labour force)' } },
    { uid: 'raAOA9AFRPzq5ilAm5Qa65Q',
      indicator:
      { name: 'Male_self_employed_percent_of_male_labour_force',
        title: 'Male self-employed (% of male labour force)' } },
    { uid: 'rfHz_nx27dDQo4dUoIeVT3A',
      indicator:
      { name: 'Aged_15_24_employment_rate_percent',
        title: 'Aged 15-24 employment rate (%)' } },
    { uid: 'rV0ksExNqh6V_h40f0_nFjg',
      indicator:
      { name: 'Aged_15plus_employment_rate_percent',
        title: 'Aged 15+ employment rate (%)' } },
    { uid: 'rRS0FbArN8jYsY25X-ZiU9A',
      indicator:
      { name: 'Females_aged_15_24_employment_rate_percent',
        title: 'Females aged 15-24 employment rate (%)' } },
    { uid: 'rOXvRa2ZC2oXqBn7gz62IMg',
      indicator:
      { name: 'Females_aged_15plus_employment_rate_percent',
        title: 'Females aged 15+ employment rate (%)' } },
    { uid: 'rCyfwvThkbHVlNVw48vHybg',
      indicator:
      { name: 'Males_aged_15_24_employment_rate_percent',
        title: 'Males aged 15-24 employment rate (%)' } },
    { uid: 'rTRt7Z5m9i9D9-vvipvdx2w',
      indicator:
      { name: 'Males_aged_15plus_employment_rate_percent',
        title: 'Males aged 15+ employment rate (%)' } },
    { uid: 'rx1TECfEnGlnomonxCCO-Aw',
      indicator:
      { name: 'Aged_15_64_labour_force_participation_rate_percent',
        title: 'Aged 15-64 labour force participation rate (%)' } },
    { uid: 'rTrB-PY0sfM_gdAQ20XovfA',
      indicator:
      { name: 'Aged_25_54_labour_force_participation_rate_percent',
        title: 'Aged 25-54 labour force participation rate (%)' } },
    { uid: 'ryyQX_1TXlohXWOSUswhIKg',
      indicator:
      { name: 'Aged_15plus_labour_force_participation_rate_percent',
        title: 'Aged 15+ labour force participation rate (%)' } },
    { uid: 'r1hlZB_n1rpXTij11Kw7lTQ',
      indicator:
      { name: 'Aged_65plus_labour_force_participation_rate_percent',
        title: 'Aged 65+ labour force participation rate (%)' } },
    { uid: 'rLRScmH2JZmjxsCGW2LB1cA',
      indicator:
      { name: 'Females_aged_15_64_labour_force_participation_rate_percent',
        title: 'Females aged 15-64 labour force participation rate (%)' } },
    { uid: 'rgdYcit5cC0wxcLAQf9kJ_Q',
      indicator:
      { name: 'Females_aged_25_54_labour_force_participation_rate_percent',
        title: 'Females aged 25-54 labour force participation rate (%)' } },
    { uid: 'rZyHDNFsPBn7cqZCIzDQtIg',
      indicator:
      { name: 'Females_aged_15plus_labour_force_participation_rate_percent',
        title: 'Females aged 15+ labour force participation rate (%)' } },
    { uid: 'rEZ0xOSmU7UuX7iOyL0Xp3g',
      indicator:
      { name: 'Females_aged_65plus_labour_force_participation_rate_percent',
        title: 'Females aged 65+ labour force participation rate (%)' } },
    { uid: 'rB4P-M5oVWuv9CyQ5s1mvOA',
      indicator:
      { name: 'Males_aged_15_64_labour_force_participation_rate_percent',
        title: 'Males aged 15-64 labour force participation rate (%)' } },
    { uid: 'rj102tw9R1O_d56Uw_eqBzg',
      indicator:
      { name: 'Males_aged_25_54_labour_force_participation_rate_percent',
        title: 'Males aged 25-54 labour force participation rate (%)' } },
    { uid: 'rImcpLhokI0fXWNA-2nSWFw',
      indicator:
      { name: 'Males_aged_15plus_labour_force_participation_rate_percent',
        title: 'Males aged 15+ labour force participation rate (%)' } },
    { uid: 'r_hbrX2qsjHphzAAlwsxhRA',
      indicator:
      { name: 'Males_aged_65plus_labour_force_participation_rate_percent',
        title: 'Males aged 65+ labour force participation rate (%)' } },
    { uid: 'rb0oP4d1BREXa8xMIUf4NZg',
      indicator:
      { name: 'Aged_15_24_unemployment_rate_percent',
        title: 'Aged 15-24 unemployment rate (%)' } },
    { uid: 'rEMA-cbNPaOtpDyxTcwugnw',
      indicator:
      { name: 'Aged_25_54_unemployment_rate_percent',
        title: 'Aged 25-54 unemployment rate (%)' } },
    { uid: 'rlD36wGmkwFt3ED558waCTQ',
      indicator:
      { name: 'Aged_15plus_unemployment_rate_percent',
        title: 'Aged 15+ unemployment rate (%)' } },
    { uid: 'rNn0y3e0bCpaqTM_8BVZBdg',
      indicator:
      { name: 'Aged_55plus_unemployment_rate_percent',
        title: 'Aged 55+ unemployment rate (%)' } },
    { uid: 'rCRqVXC95LeKm_EvLrFNXKw',
      indicator:
      { name: 'Long_term_unemployment_rate_percent',
        title: 'Long term unemployment rate (%)' } },
    { uid: 'rMf--YMvuEKf2LVppT63Xvw',
      indicator:
      { name: 'Females_aged_15_24_unemployment_rate_percent',
        title: 'Females aged 15-24, unemployment rate (%)' } },
    { uid: 'r9StWVETzyX9Lv-r4-2sh6w',
      indicator:
      { name: 'Females_aged_25_54_unemployment_rate_percent',
        title: 'Females aged 25-54, unemployment rate (%)' } },
    { uid: 'rcHjAQAzF2e1yR1R-hywCEw',
      indicator:
      { name: 'Females_aged_15plus_unemployment_rate_percent',
        title: 'Females aged 15+, unemployment rate (%)' } },
    { uid: 'rz8kJ7CIyckuQAWgHUHe4sA',
      indicator:
      { name: 'Females_aged_55plus_unemployment_rate_percent',
        title: 'Females aged 55+, unemployment rate (%)' } },
    { uid: 'rT5EpK40a19zVodp1HV1xGw',
      indicator:
      { name: 'Female_long_term_unemployment_rate_percent',
        title: 'Female long term unemployment rate (%)' } },
    { uid: 'rGS7_GpdXrYyjhKkAFcLHGA',
      indicator:
      { name: 'Males_aged_15_24_unemployment_rate_percent',
        title: 'Males aged 15-24, unemployment rate (%)' } },
    { uid: 'rjkDFSPV2pw9Pbnz2kpiqPQ',
      indicator:
      { name: 'Males_aged_25_54_unemployment_rate_percent',
        title: 'Males aged 25-54, unemployment rate (%)' } },
    { uid: 'r5_68IYi0bC1bRjGMFYFk8g',
      indicator:
      { name: 'Males_aged_15plus_unemployment_rate_percent',
        title: 'Males aged 15+, unemployment rate (%)' } },
    { uid: 'rSMPg9BmVRsqE8_k1ARUudA',
      indicator:
      { name: 'Males_aged_55plus_unemployment_rate_percent',
        title: 'Males aged 55+, unemployment rate (%)' } },
    { uid: 'rezDaYxOOBEFgR4TiPN9qtw',
      indicator:
      { name: 'Male_long_term_unemployment_rate_percent',
        title: 'Male long term unemployment rate (%)' } },
    { uid: 'p8SIY47PNEw6pJRPAS1tXPQ',
      indicator:
      { name: 'Under_five_mortality_from_CME_per_1000_born',
        title: 'Under-five mortality from CME (per 1,000 born)' } },
    { uid: 'p8SIY47PNEw4TgTkrmIVIXA',
      indicator:
      { name: 'Under_five_mortality_from_IHME_per_1000_born',
        title: 'Under-five mortality from IHME (per 1,000 born)' } },
    { uid: 'phAwcNAVuyj0npaJxInyYDg',
      indicator:
      { name: 'Old_version_of_Income_per_person_version_3',
        title: 'Old version of Income per person (version 3)' } },
    { uid: '0ArfEDsV3bBwCdE5xWmcyYVZJQzJvOFpZUklqX3lkSkE',
      indicator:
      { name: 'Old_version_of_Income_per_person_version_8',
        title: 'Old version of Income per person (version 8)' } },
    { uid: 'tSUr_yZVbM6a3AGJEq_Z2Pw',
      indicator:
      { name: 'Alternative_GDPpercapita_PPP_inflation_adjusted_from_PWT',
        title: 'Alternative GDP/capita (PPP$, inflation-adjusted) from PWT' } },
    { uid: '0ArfEDsV3bBwCdGlGLVd4OGVfcVdScVBSS0JLVHpiMlE',
      indicator:
      { name: 'Subsistence_incomes_per_person',
        title: 'Subsistence incomes per person' } },
    { uid: 'pyj6tScZqmEd1R9UmohEIaA',
      indicator:
      { name: 'Alternative_poverty_percent_below_nationally_defined_poverty',
        title: 'Alternative poverty (% below nationally defined poverty line)' } },
    { uid: 'phAwcNAVuyj0atjJIuxy-KQ',
      indicator:
      { name: 'Data_quality___Income_per_person',
        title: 'Data quality - Income per person' } },
    { uid: 'p8SIY47PNEw6vGCNzlYJ5eA',
      indicator:
      { name: 'Data_quality___Life_expectancy',
        title: 'Data quality - Life expectancy' } },
    { uid: 'phAwcNAVuyj1ONZlWMf9KQA',
      indicator:
      { name: 'Data_quality___Population',
        title: 'Data quality - Population' } },
    { uid: 'p8SIY47PNEw4vx1GOsJM7bA',
      indicator:
      { name: 'Estimate_or_projection_of_under_five_mortality_rate_from_IHME',
        title: 'Estimate or projection of under-five mortality rate, from IHME' } },
    { uid: 'thlR4hyNMEnaVyV_uxRzjfQ',
      indicator:
      { name: 'Data_quality___Children_per_woman',
        title: 'Data quality - Children per woman' } },
    { uid: 'thDxsgSWvLGW4M1qUBby7OQ',
      indicator:
      { name: 'Data_method___Maternal_mortality',
        title: 'Data method - Maternal mortality' } },
    { uid: 'tkdAnkbHJxPAlRX6P1mAh8w',
      indicator:
      { name: 'Economic_growth_over_the_past_10_years',
        title: 'Economic growth over the past 10 years' } },
    { uid: 'rAIffGKCmiCdzTl1C0AR2nw',
      indicator: { name: 'How_far_to_the_north', title: 'How far to the north' } },
    { uid: 'rX3Jfop_ebuY-chuMpCgmRg',
      indicator:
      { name: 'Income_per_person_with_projections',
        title: 'Income per person, with projections' } },
    { uid: 'tiAiXcrneZrUnnJ9dBU-PAw',
      indicator:
      { name: 'Life_expectancy_at_birth_with_projections',
        title: 'Life expectancy at birth, with projections' } },
    { uid: 'tGdhNYGTGtunwzkKJ9aRhsA',
      indicator:
      { name: 'Children_per_woman_total_fertility_with_projections',
        title: 'Children per woman (total fertility), with projections' } },
    { uid: 'tL0jLxFBF9TbXIN_39b1qcQ',
      indicator:
      { name: 'Total_population_with_projections',
        title: 'Total population, with projections' } },
    { uid: 't6nZVbvqsF-BbyheqUxerZQ',
      indicator:
      { name: 'Female_population_with_projections',
        title: 'Female population, with projections' } },
    { uid: 'tZMsbTkrY0k4OkkkXEfp6pA',
      indicator:
      { name: 'Male_population_with_projections',
        title: 'Male population, with projections' } },
    { uid: 'rZrHzR__kZfmw6L_xUx7cwg',
      indicator:
      { name: 'Population_growth_annual_percent_with_projections',
        title: 'Population growth (annual %), with projections' } },
    { uid: 'phAwcNAVuyj2t4ep52YXjSg',
      indicator:
      { name: 'Year_categorization_1820_2010',
        title: 'Year categorization 1820-2010' } },
    { uid: 'phAwcNAVuyj02SA7cGjnRbA',
      indicator:
      { name: 'Year_categorization_1950_',
        title: 'Year categorization 1950-' } },
    { uid: 'tK87SOy-oZlfW99UDD7L3hw',
      indicator:
      { name: 'Traffic_deaths_per_100000_people',
        title: 'Traffic deaths (per 100,000 people)' } },
    { uid: '0AgogXXPMARyldGloTm9wekpDcUdMUjhlYWFKaHdnVWc',
      indicator:
      { name: 'Burns_deaths_per_100000_people',
        title: 'Burns deaths (per 100,000 people)' } },
    { uid: '0AgogXXPMARyldF9ZRnhuWWljUXJHRDRpb0cyaHNLSUE',
      indicator:
      { name: 'Drownings_per_100000_people',
        title: 'Drownings (per 100,000 people)' } },
    { uid: '0AgogXXPMARyldEJZajRXMWZPTE9nUXFBNUdPcG5yT2c',
      indicator:
      { name: 'Falls_deaths_per_100000_people',
        title: 'Falls, deaths (per 100,000 people)' } },
    { uid: '0AgogXXPMARyldGhVLXVsSTB0aDY2eXdLaEt1T0psdXc',
      indicator:
      { name: 'Poisonings_deaths_per_100000_people',
        title: 'Poisonings, deaths (per 100,000 people)' } },
    { uid: 'tu0H0unnUriNvMXwH_qOqzw',
      indicator:
      { name: 'Cars_trucks_and_buses_per_1000_persons',
        title: 'Cars, trucks & buses per 1,000 persons' } },
    { uid: 't4pYrpNzP-JeR7zSjOyDofQ',
      indicator:
      { name: 'Traffic_deaths_women_per_100000_people',
        title: 'Traffic deaths women (per 100,000 people)' } },
    { uid: 'tUaaG6Pu9zT_BVIsLvGLQdA',
      indicator:
      { name: 'Traffic_deaths_men_per_100000_people',
        title: 'Traffic deaths men (per 100,000 people)' } },
    { uid: 'tUD6kmYmB_Bp85SRdEn1Krg',
      indicator:
      { name: 'Suicide_women_per_100000_people',
        title: 'Suicide women (per 100,000 people)' } },
    { uid: 'tB8ge4cxd8TL7yIV4ALm5NA',
      indicator:
      { name: 'Suicide_men_per_100000_people',
        title: 'Suicide men (per 100,000 people)' } },
    { uid: 'tyeSLo9Zpmw_e05IR3EoReg',
      indicator:
      { name: 'Murdered_women_per_100000_people',
        title: 'Murdered women (per 100,000 people)' } },
    { uid: 'tHgVOu-6TYQ6Kig0Ur3Y-kw',
      indicator:
      { name: 'Murdered_men_per_100000_people',
        title: 'Murdered men (per 100,000 people)' } },
    { uid: 'tLf-4GD5z0QxqsDoUz4vOlg',
      indicator:
      { name: 'Car_deaths_per_100000_people',
        title: 'Car deaths (per 100,000 people)' } },
    { uid: 't7-m0musxnWbugcQ9ECH4KA',
      indicator:
      { name: 'Motorcycle_deaths_per_100000_people',
        title: 'Motorcycle deaths (per 100,000 people)' } },
    { uid: '0AgogXXPMARyldC1rcTI5OU50Mnc1djdkNXpnWUFrZmc',
      indicator:
      { name: 'Murdered_children_0_14_per_100000_people',
        title: 'Murdered children 0-14 (per 100,000 people)' } },
    { uid: '0AgogXXPMARyldDFGSGhtOWt0cS1JbEIzS29EZzlQRXc',
      indicator:
      { name: 'Murdered_15_29_per_100000_people',
        title: 'Murdered 15-29 (per 100,000 people)' } },
    { uid: '0AgogXXPMARyldG51d0o2T0JQWXFTMUlydWFsSTZMeFE',
      indicator:
      { name: 'Murdered_30_44_per_100000_people',
        title: 'Murdered 30-44, (per 100,000 people)' } },
    { uid: '0AgogXXPMARyldElCSWl6TkpaZ1JpcXVxa2tmUGhxbFE',
      indicator:
      { name: 'Murdered_45_59_per_100000_people',
        title: 'Murdered 45-59 (per 100,000 people)' } },
    { uid: '0AgogXXPMARyldGF1WHhpZFVQTWswclJHdjE3MkZ4c3c',
      indicator:
      { name: 'Murdered_60plus_per_100000_people',
        title: 'Murdered 60+ (per 100,000 people)' } },
    { uid: '0AgogXXPMARyldGhJdkhTSHNEYTFKQjRrMlBwZXk1TkE',
      indicator:
      { name: 'Suicide_age_0_14_per_100000_people',
        title: 'Suicide age 0-14 (per 100,000 people)' } },
    { uid: '0AgogXXPMARyldHNWNkNVR2Zwalc2U04zTjE5MDZlUkE',
      indicator:
      { name: 'Suicide_age_15_29_per_100000_people',
        title: 'Suicide age 15-29 (per 100,000 people)' } },
    { uid: '0AgogXXPMARyldG9MeHpzRkNHQmZ4MmtxSnd2Y0o2UFE',
      indicator:
      { name: 'Suicide_age_30_44_per_100000_people',
        title: 'Suicide age 30-44 (per 100,000 people)' } },
    { uid: '0AgogXXPMARyldGh2OWd2eVJiUnhScW9tOEtNTFkyQUE',
      indicator:
      { name: 'Suicide_age_45_59_per_100000_people',
        title: 'Suicide age 45-59 (per 100,000 people)' } },
    { uid: '0AgogXXPMARyldEVRNFBZS2wzRmtZOWZEZDVZVG05dHc',
      indicator:
      { name: 'Suicide_age_60plus_per_100000_people',
        title: 'Suicide age 60+ (per 100,000 people)' } },
    { uid: '0AgogXXPMARyldHB2MkhmVDcyMG1Oa3Y5eEhRQ0VlUWc',
      indicator:
      { name: 'Traffic_mortality_children_0_14_per_100000_people',
        title: 'Traffic mortality children 0-14 (per 100,000 people)' } },
    { uid: '0AgogXXPMARyldEVPSG5qYzBfS0llQ1RnTl9wWXZodkE',
      indicator:
      { name: 'Traffic_mortality_15_29_per_100000_people',
        title: 'Traffic mortality 15-29 (per 100,000 people)' } },
    { uid: '0AgogXXPMARyldGRqbENsQm5VMWFLdnRXV0w1S0tVSEE',
      indicator:
      { name: 'Traffic_mortality_30_44_per_100000_people',
        title: 'Traffic mortality 30-44 (per 100,000 people)' } },
    { uid: '0AgogXXPMARyldFJrcW9wdlJITlBDYU9IbnRKdVllVGc',
      indicator:
      { name: 'Traffic_mortality_45_59_per_100000_people',
        title: 'Traffic mortality 45-59 (per 100,000 people)' } },
    { uid: '0AgogXXPMARyldEw5RXhuckZuU1V2aVAzNDFZaDUxa2c',
      indicator:
      { name: 'Traffic_mortality_60plus_per_100000_people',
        title: 'Traffic mortality 60+ (per 100,000 people)' } },
    { uid: '0ArfEDsV3bBwCdHFkZlc5WkhVQmVmeU0tR0RsSUdTU0E',
      indicator:
      { name: 'IFPRI_Underweight_children',
        title: 'IFPRI Underweight children' } },
    { uid: '0ArfEDsV3bBwCdE5UaXVKa2hWbUFzcUJJbVdHOE1VcFE',
      indicator:
      { name: 'Maternal_mortality_ratio_WHO',
        title: 'Maternal mortality ratio WHO' } },
    { uid: '0AgogXXPMARyldElMWEl4RFVTemlMbzJqRU50ZDJ3SHc',
      indicator:
      { name: 'Battle_deaths_per_100_000',
        title: 'Battle deaths (per 100 000)' } },
    { uid: '0Asm_G8nr4TCSdG1nNjk5RzItcUp6N2dSdHUwOENXa0E',
      indicator:
      { name: 'Armed_forces_personnel_total',
        title: 'Armed forces personnel, total' } },
    { uid: '0Asm_G8nr4TCSdFFoVWRjcUdKZDFydGdGNXkzS2ZRbHc',
      indicator:
      { name: 'Armed_forces_personnel_percent_of_labor_force',
        title: 'Armed forces personnel (% of labor force)' } },
    { uid: 'tIgjxaAg3M6kuHRcQTjEgsQ',
      indicator: { name: 'Murder_total_deaths', title: 'Murder (total deaths)' } },
    { uid: 'tOS388dWYzO1_FANUaiwKuA',
      indicator:
      { name: 'Suicide_total_deaths',
        title: 'Suicide (total deaths)' } },
    { uid: 'tW9t1f9EQpvS4U04kWnk-og',
      indicator:
      { name: 'Traffic_total_deaths',
        title: 'Traffic (total deaths)' } },
    { uid: 'pyj6tScZqmEd-30XcArAJHA',
      indicator:
      { name: 'Debt_servicing_costs_percent_of_exports_and_net_income_from_',
        title: 'Debt servicing costs (% of exports and net income from abroad)' } },
    { uid: 'pyj6tScZqmEdQY2PxSsxxJQ',
      indicator:
      { name: 'External_debt_total_US_not_inflation_adjusted',
        title: 'External debt, total (US$, not inflation-adjusted)' } },
    { uid: 'pyj6tScZqmEeUceHo3wTOaQ',
      indicator:
      { name: 'Present_value_of_debt_percent_of_GNI',
        title: 'Present value of debt (% of GNI)' } },
    { uid: 'pyj6tScZqmEddLKU1fnfSSA',
      indicator:
      { name: 'Exports_unit_value_index_2000100',
        title: 'Exports unit value (index, 2000=100)' } },
    { uid: 'pyj6tScZqmEcL6zpB3Sj1Wg',
      indicator:
      { name: 'Imports_unit_value_index_2000100',
        title: 'Imports unit value (index, 2000=100)' } },
    { uid: 'pyj6tScZqmEe5SueBIj6eSw',
      indicator:
      { name: 'Net_barter_terms_of_trade_2000__100',
        title: 'Net barter terms of trade (2000 = 100)' } },
    { uid: '0ArtujvvFrPjVdDRQTUhzNmVySlp6djRtLWh4eS1sNHc',
      indicator: { name: 'Dead_kids_per_woman', title: 'Dead kids per woman' } },
    { uid: '0ArtujvvFrPjVdGdFWmhqOEVXcUZha1hJWXAtWHlDSFE',
      indicator:
      { name: 'Surviving_kids_per_woman',
        title: 'Surviving kids per woman' } },
    { uid: '0ArfEDsV3bBwCdDhjcXdjbURLMFFVcVFPYThhYmtvZXc',
      indicator:
      { name: '20120905_Extreme_poverty_percent_people_below_125_a_day',
        title: 'Extreme poverty (% people below $1.25 a day) version 20120905' } },
    { uid: '0ArtujvvFrPjVdERlTHZFQ2ZaUkpySHpQMF82UmdlcUE',
      indicator:
      { name: 'Alternative_GDP_per_capita_PPP__WB',
        title: 'Alternative GDP per capita PPP, WB' } },
    { uid: '0ArtujvvFrPjVdEhhbV90QlJ3RFM0TW83dHd6RXBiX3c',
      indicator:
      { name: 'Alternative_GDP_per_capita_PPP_PWT 7.1',
        title: 'Alternative GDP per capita PPP, PWT 7.1' } },
    { uid: '0ArfEDsV3bBwCdGhSY2trbEVpYnNsMENqendaVm5ucnc',
      indicator:
      { name: 'Number_of_child_deaths',
        title: 'Number of child deaths' } },
    { uid: '0ArfEDsV3bBwCdFFjMFlMeS02N1NGNjJabl8wamVtdHc',
      indicator:
      { name: 'Energy_supply_per_person_TOE',
        title: 'Energy supply per person TOE' } },
    { uid: '0ArfEDsV3bBwCdFdaNHA3R1BzcG9GSlkwMXdnMHpScVE',
      indicator:
      { name: 'Energy_from_solid_biofuels_%_',
        title: 'Energy from solid biofuels (%)' } },
    { uid: 'https://docs.google.com/spreadsheet/pub?key=0ArfEDsV3bBwCdEV1RkJqTEItQnJYVXJlZzVuc3Y3Mmc\n\n',
      indicator:
      { name: 'Residential_energy_use_%_',
        title: 'Residential energy use (%)' } },
    { uid: '0ArfEDsV3bBwCdG9jSHA0WklHU0dqUnBCVUpVOXFzQUE',
      indicator:
      { name: 'Life_expectancy_at_birth_data_from_IHME',
        title: 'Life expectancy at birth, data from IHME' } },
    { uid: '0ArfEDsV3bBwCdFJCTm43NGc0SzdYeHBpZWZGb1V0ckE',
      indicator:
      { name: 'Children_per_woman_temporary_update',
        title: 'Children per woman, temporary update' } },
    { uid: '0ArfEDsV3bBwCdGhmWXFMY0hNcDFiTEt3ZVE4b21wRlE',
      indicator:
      { name: 'Alternative_GDP_per_capita_PPP_PWT_8_0',
        title: 'Alternative GDP per capita PPP, PWT 8.0' } },
    { uid: '1iHsRp1TARpgh2CbuZGP5fj6jeY3Iz5cBLKTDlukVSHI',
      indicator: { name: 'Life_expectancy_male', title: 'Life expectancy, male' } },
    { uid: '12VhzicKNQCt8I4gmtBmulpfzDfnGjvFPr38g2wDcEGU',
      indicator:
      { name: 'Life_expectancy_female',
        title: 'Life expectancy, female' } },
    { uid: '1LklNUuBgFLNcGyG63kqjyze7N8_fDlNLAWZG4YKwJXc',
      indicator:
      { name: 'GDP_total_yearly_growth',
        title: 'GDP total, yearly growth' } },
    { uid: '1tAnT0EeP67_DoOJCXb3Wd0hqjVMe0KWHPwUH22-BNmQ',
      indicator:
      { name: 'GDP_per_capita_yearly_growth',
        title: 'GDP per capita, yearly growth' } },
    { uid: '16USvgw1H-rXCK0ZMmDkyMPd1FXQNpjCj6HCMIn-fmFQ',
      indicator:
      { name: 'Yearly_CO2_emissions_1000_tonnes_',
        title: 'Yearly CO2 emissions (1000 tonnes)' } },
    { uid: '1qOyLQJxO8zBHvldD1tS1s9dYIHuCe8u72JZQ_LjI9qI',
      indicator:
      { name: 'Child_mortality_0_5_year_olds_dying_per_1000_born',
        title: 'Child mortality (0-5 year-olds). More years. Version 7.' } },
    { uid: '1edXplIOkF3Y5OuEWp_aVapd92-OD5aVFAPECZLgP8cA',
      indicator:
      { name: 'Number_of_people_in_poverty',
        title: 'Number of people in poverty' } },
    { uid: '1SKMoV61HUNwWfYNCZs2M9zgMWqVrs9YrbJxs5HQbJSQ',
      indicator:
      { name: 'Income_per_person_long_series',
        title: 'Income per person, long series' } }
  ];
/*  optionsList = [{
    uid: "https://docs.google.com/spreadsheets/d/1IbDM8z5XicMIXgr93FPwjgwoTTKMuyLfzU6cQrGZzH8/pub",
    indicator: {
      name: "indicator gapminder population",
      title: "indicator_gapminder_population"
    }
  }];*/
  optionsList = [{ uid: '0ArfEDsV3bBwCdFVrVDZQUnRwZ2lqT2lPMXcySXZwRmc',
    indicator:
    { name: 'GNIpercapita_atlasmethod_current_US',
      title: 'GNI/capita (Atlas method, current US$)' } }];
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
    require('./ws.import/neo4j.import');
  });
});

/**
 * @callback ErrorOnlyCallback
 * @param {Error} [err] - error if any
 */


/** @private */
function generateList(serviceLocator) {

  /** @type GoogleSpreadSheetPlugin */
  var gs = serviceLocator.plugins.get('google-spread-sheets');

  var GoogleSpreadsheet = require('google-spreadsheet');
  var someSheet = new GoogleSpreadsheet('192pjt2vtwAQzi154LJ3Eb5RF8W9Fx3ZAiUZy-zXgyJo');
  someSheet.getRows('od5', {'start-index': 1}, function (err2, cells) {
    function parseName(name, title) {
      if (!name || !name.replace(/-/g, ' ').trim()) {
        return title.replace(/[^%\w]+/g, '_');
      }

      return name;
    }

    var rows = _.map(cells, function (row) {
      return {
        uid: gs.parser.parse(row.indicatorurl),
        indicator: {
          name: parseName(row.id, row.title),
          title: row.title
        }
      };
    });

    var exclude = [
      'https://docs.google.com/spreadsheets/d/1aYzLwblTgPVT6Zbexq-V8coTzKr54Fg9JB7rhkzfLbU/pub',
      'https://docs.google.com/spreadsheets/d/1ZMmT3Lj2BCu8AYODni-sbv0Ibeh6mkSsn3DRmJo4rNg/pub',
      'https://docs.google.com/spreadsheets/d/1wQj8YxaeP4MAoMeRh6xZ5AnJkABhufT1UAuE_M5LeB0/pub',
      'https://docs.google.com/spreadsheets/d/1clUeOPK_Rs-ASt2Wl0NWXo-KhOrszkJJ19he7ID4YWY/pub',
      'https://docs.google.com/spreadsheets/d/1tt2bb3fpvOdBaRp1fv39pQ8RjkOb_VbjTi0XdVQEVpI/pub',
      'https://docs.google.com/spreadsheets/d/1erdUA9SDUzZw5M8KfbRL7fgda2XqoAkuvZ1XgGnQ-sY/pub',
      'https://docs.google.com/spreadsheets/d/1bOnlJd00Ygl1nxKrfnmOvkrJ4ruJ_md7WWdrdWYixr0/pub',
      'https://docs.google.com/spreadsheets/d/1FIfJRjfPJSC0S3q5fNUiASC0Xo3j-FlN_kMTPL7FXI0/pub',
      'https://docs.google.com/spreadsheets/d/1MYOjKDFE2z5JBAu5-UhCEjpgxDQF8-0zdReX8BFaPGU/pub',
      'https://docs.google.com/spreadsheets/d/1tj6e75vcdYfDWjz7dNVN-6C8QBJT5OH_OKCTCu2VmjE/pub',
      'https://docs.google.com/spreadsheets/d/1WMpJl70z4epmKyEkqwKDnCJ-_8NcF1WAe18JINslWww/pub',
      'https://docs.google.com/spreadsheets/d/1kB4PFkvhQu2emRcFBMu368wCjVhZzEcbWsXFgFfikJU/pub',
      'https://docs.google.com/spreadsheets/d/1oDVONphUheFEDSlNgaBZsP36KblRXPAG0q1O3vdALsg/pub'
    ];

    var excludeList = _.map(exclude, function (e) {
      return gs.parser.parse(e);
    });

    var indicators = _.filter(rows, function(row) {
      return excludeList.indexOf(row.uid) === -1;
    });

    console.log(indicators);
  });
}
