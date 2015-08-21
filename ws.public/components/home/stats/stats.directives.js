angular.module('admin.services')
  .directive('visabiChart', ['$compile', 'Chart',
    function ($compile, Chart) {
      var countryToRegion = {Afghanistan:'asi',Albania:'eur',Algeria:'afr',AndorrA:'eur',Angola:'afr',Anguilla:'ame','Antigua and Barbuda':'ame',Argentina:'ame',Armenia:'asi',Austria:'eur',Azerbaijan:'asi',Bahamas:'ame',Bahrain:'asi',Bangladesh:'asi',Barbados:'ame',Belarus:'eur',Belgium:'eur',Benin:'afr',Bermuda:'ame',Bhutan:'asi',Bolivia:'ame','Bosnia and Herzegovina':'eur',Botswana:'afr','Bouvet Island':'asi',Brazil:'ame','Brunei Darussalam':'asi',Bulgaria:'eur','Burkina Faso':'afr',Burundi:'afr',Cambodia:'asi',Cameroon:'afr',Canada:'ame','Cape Verde':'afr','Cayman Islands':'ame','Central African Republic':'afr',Chad:'afr',Chile:'ame',China:'asi',Colombia:'ame',Comoros:'afr',Congo:'afr','Congo, The Democratic Republic of the':'afr','Costa Rica':'ame','Cote D\'Ivoire':'afr',Croatia:'eur',Cuba:'ame',Cyprus:'asi','Czech Republic':'eur',Denmark:'eur',Djibouti:'afr',Dominica:'ame','Dominican Republic':'ame',Ecuador:'ame',Egypt:'afr','El Salvador':'ame','Equatorial Guinea':'afr',Eritrea:'afr',Estonia:'eur',Ethiopia:'afr','Falkland Islands (Malvinas)':'ame','Faroe Islands':'eur',Fiji:'asi',Finland:'eur',France:'eur','French Guiana':'ame',Gabon:'afr',Gambia:'afr',Georgia:'asi',Germany:'eur',Ghana:'afr',Gibraltar:'eur',Greece:'eur',Grenada:'ame',Guatemala:'ame',Guernsey:'eur',Guinea:'afr','Guinea-Bissau':'afr',Guyana:'ame',Haiti:'ame','Holy See (Vatican City State)':'eur',Honduras:'ame',Hungary:'eur',Iceland:'eur',India:'asi',Indonesia:'asi','Iran, Islamic Republic Of':'asi',Iraq:'asi',Ireland:'eur','Isle of Man':'eur',Israel:'asi',Italy:'eur',Jamaica:'ame',Japan:'asi',Jersey:'eur',Jordan:'asi',Kazakhstan:'asi',Kenya:'afr',Kiribati:'asi',"Korea, Democratic People'S Republic of":'asi',"Korea, 'Republic of":'asi',Kuwait:'asi',Kyrgyzstan:'asi',"Lao People'S Democratic Republic":'asi',Latvia:'eur',Lebanon:'asi',Lesotho:'afr',Liberia:'afr','Libyan Arab Jamahiriya':'afr',Liechtenstein:'eur',Lithuania:'eur',Luxembourg:'eur','Macedonia, The Former Yugoslav Republic of':'eur',Madagascar:'afr',Malawi:'afr',Malaysia:'asi',Mali:'afr',Malta:'eur','Marshall Islands':'asi',Mauritania:'afr',Mauritius:'afr',Mayotte:'afr',Mexico:'ame','Micronesia, Federated States of':'asi','Moldova, Republic of':'eur',Monaco:'eur',Mongolia:'asi',Montserrat:'ame',Morocco:'afr',Mozambique:'afr',Myanmar:'asi',Namibia:'afr',Nepal:'asi',Netherlands:'eur',Nicaragua:'ame',Niger:'afr',Nigeria:'afr',Norway:'eur',Oman:'asi',Pakistan:'asi',Palau:'asi','Palestinian Territory, Occupied':'asi',Panama:'ame',Paraguay:'ame',Peru:'ame',Philippines:'asi',Poland:'eur',Portugal:'eur','Puerto Rico':'ame',Qatar:'asi',Reunion:'afr',Romania:'eur','Russian Federation':'asi',Rwanda:'afr','Saint Helena':'afr','Saint Kitts and Nevis':'ame','Saint Lucia':'ame','Saint Vincent and the Grenadines':'ame',Samoa:'asi','San Marino':'eur','Sao Tome and Principe':'afr','Saudi Arabia':'asi',Senegal:'afr',Seychelles:'afr','Sierra Leone':'afr',Singapore:'asi',Slovakia:'eur',Slovenia:'eur','Solomon Islands':'asi',Somalia:'afr','South Africa':'afr','South Georgia and the South Sandwich Islands':'ame',Spain:'eur','Sri Lanka':'asi',Sudan:'afr',Suriname:'ame','Svalbard and Jan Mayen':'eur',Swaziland:'afr',Sweden:'eur',Switzerland:'eur','Syrian Arab Republic':'asi','Taiwan, Province of China':'asi',Tajikistan:'asi','Tanzania, United Republic of':'afr',Thailand:'asi','Timor-Leste':'asi',Togo:'afr',Tonga:'asi','Trinidad and Tobago':'ame',Tunisia:'afr',Turkey:'asi',Turkmenistan:'asi','Turks and Caicos Islands':'ame',Tuvalu:'asi',Uganda:'afr',Ukraine:'eur','United Arab Emirates':'asi','United Kingdom':'eur','United States':'ame',Uruguay:'ame',Uzbekistan:'asi',Vanuatu:'asi',Venezuela:'ame','Viet Nam':'asi','Virgin Islands, British':'ame','Western Sahara':'afr',Yemen:'asi',Zambia:'afr',Zimbabwe:'afr'};
      return {
        restrict: 'AE',
        scope: true,
        link: function (scope, element, attr) {
          var elementId = 'placeholder-' + attr.type + '-' + attr.indicator;
          element.append($compile('<div class="placeholder" id="' + elementId + '"></div>')(scope));

          var options = {
            bar: function bar() {
              Chart.get({
                versionId: attr.version,
                indicatorId: attr.indicator
              }, function (resp) {
                Vizabi('BarChart', document.getElementById(elementId), {
                  data: {
                    reader: 'inline',
                    data: resp.data
                  },
                  state: {
                    entities: {
                      show: {
                        dim: 'geo',
                        filter: {'geo': ['*']}
                      }
                    },
                    marker: {
                      label: {
                        use: 'property',
                        which: 'geo'
                      },
                      color: {
                        use: 'property',
                        which: 'geo'
                      },
                      axis_y: {
                        use: 'indicator',
                        which: 'score'
                      },
                      axis_x: {
                        use: 'property',
                        which: 'geo'
                      }
                    }
                  }
                });
              });
            },
            line: function line() {
              Chart.get({
                versionId: attr.version,
                indicatorId: attr.indicator
              }, function (resp) {
                // todo: remove this fix, it has a place while Vizabi has hardcoded geo.cat
                var data = _.map(resp.data, function (data) {
                  data['geo.cat'] = 'country';
                  data['geo.region'] = countryToRegion[data.geo];
                  data['geo.name'] = data.geo;
                  data['gdp_per_cap'] = data.score;
                  return data;
                });
                Vizabi('LineChart', document.getElementById(elementId), {
                  data: {reader: 'inline', data: data},
                  state: {
                    entities: {
                      show: {
                        geo: ['*'],
                        "geo.cat": "country"
                      }
                    }
                  }
                });
              });
            },
            bubble: function bubble() {
              Chart.get({
                versionId: attr.version,
                indicatorId: attr.indicator
              }, function (resp) {
                // todo: remove this fix, it has a place while Vizabi has hardcoded geo.cat
                var data = _.map(resp.data, function (data) {
                  data['geo.cat'] = 'country';
                  data['geo.region'] = countryToRegion[data.geo];
                  data['geo.name'] = data.geo;

                  // just a hack to hardcoded vizabi
                  data['gdp_per_cap'] = data.score;
                  data['lex'] = parseInt(data.score) * Math.random();
                  data['pop'] = parseInt(data.score) * Math.random();
                  return data;
                });
                Vizabi('BubbleChart', document.getElementById(elementId), {
                  data: {reader: 'inline', data: data},
                  state: {
                    entities: {
                      show: {
                        geo: ['*'],
                        "geo.cat": "country"
                      }
                    }
                  }
                });
              });
              //Vizabi('BubbleChart', document.getElementById(elementId), {
              //  data: {
              //    reader: 'csv-file',
              //    path: '/api/admin/chart-csv/' + attr.version + '/' + attr.indicator
              //  }
              //});
            }
          };

          options[attr.type]();
        }
      };
    }]);
