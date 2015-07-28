'use strict';
/**
 * INSPINIA - Responsive Admin Theme
 *
 * Main controller.js file
 * Define controllers with data used in Inspinia theme
 *
 *
 * Functions (controllers)
 *  - MainCtrl
 *  - dashboardFlotOne
 *  - ngGridCtrl
 *
 */

/**
 * MainCtrl - controller
 * Contains severals global data used in diferent view
 *
 */
function MainCtrl() {

  /**
   * daterange - Used as initial model for data range picker in Advanced form view
   */
  this.daterange = {startDate: null, endDate: null}

  /**
   * slideInterval - Interval for bootstrap Carousel, in milliseconds:
   */
  this.slideInterval = 5000;

  /**
   * states - Data used in Advanced Form view for Chosen plugin
   */
  this.states = ['Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'];

  /**
   * persons - Data used in Tables view for Data Tables plugin
   */
  this.persons = [{
    id: '1', firstName: 'Monica', lastName: 'Smith'
  }, {
    id: '2', firstName: 'Sandra', lastName: 'Jackson'
  }, {
    id: '3', firstName: 'John', lastName: 'Underwood'
  }, {
    id: '4', firstName: 'Chris', lastName: 'Johnatan'
  }, {
    id: '5', firstName: 'Kim', lastName: 'Rosowski'
  }];

  /**
   * check's - Few variables for checkbox input used in iCheck plugin. Only for demo purpose
   */
  this.checkOne = true;
  this.checkTwo = true;
  this.checkThree = true;
  this.checkFour = true;

  /**
   * knobs - Few variables for knob plugin used in Advanced Plugins view
   */
  this.knobOne = 75;
  this.knobTwo = 25;
  this.knobThree = 50;

  /**
   * Variables used for Ui Elements view
   */
  this.bigTotalItems = 175;
  this.bigCurrentPage = 1;
  this.maxSize = 5;
  this.singleModel = 1;
  this.radioModel = 'Middle';
  this.checkModel = {
    left: false, middle: true, right: false
  };

  /**
   * groups - used for Collapse panels in Tabs and Panels view
   */
  this.groups = [{
    title: 'Dynamic Group Header - 1', content: 'Dynamic Group Body - 1'
  }, {
    title: 'Dynamic Group Header - 2', content: 'Dynamic Group Body - 2'
  }];

  /**
   * alerts - used for dynamic alerts in Notifications and Tooltips view
   */
  this.alerts = [{type: 'danger', msg: 'Oh snap! Change a few things up and try submitting again.'}, {
    type: 'success',
    msg: 'Well done! You successfully read this important alert message.'
  }, {type: 'info', msg: 'OK, You are done a great job man.'}];

  /**
   * addAlert, closeAlert  - used to manage alerts in Notifications and Tooltips view
   */
  this.addAlert = function () {
    this.alerts.push({msg: 'Another alert!'});
  };

  this.closeAlert = function (index) {
    this.alerts.splice(index, 1);
  };

  /**
   * randomStacked - used for progress bar (stacked type) in Badges adn Labels view
   */
  this.randomStacked = function () {
    this.stacked = [];
    var types = ['success', 'info', 'warning', 'danger'];

    for (var i = 0, n = Math.floor((Math.random() * 4) + 1); i < n; i++) {
      var index = Math.floor((Math.random() * 4));
      this.stacked.push({
        value: Math.floor((Math.random() * 30) + 1), type: types[index]
      });
    }
  };
  /**
   * initial run for random stacked value
   */
  this.randomStacked();

  /**
   * summernoteText - used for Summernote plugin
   */
  this.summernoteText = ['<h3>Hello Jonathan! </h3>', '<p>dummy text of the printing and typesetting industry. <strong>Lorem Ipsum has been the dustrys</strong> standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more', 'recently with</p>'].join('');
};

/**
 * ngCollectionListCtrl - Controller for code ngGrid
 */
function ngCollectionListCtrl($scope) {
  $scope.ngData = [{
    Name: 'Moroni',
    Age: 50,
    Position: 'PR Menager',
    Status: 'active',
    Date: '12.12.2014'
  }, {Name: 'Teancum', Age: 43, Position: 'CEO/CFO', Status: 'deactive', Date: '10.10.2014'}, {
    Name: 'Jacob',
    Age: 27,
    Position: 'UI Designer',
    Status: 'active',
    Date: '09.11.2013'
  }, {Name: 'Nephi', Age: 29, Position: 'Java programmer', Status: 'deactive', Date: '22.10.2014'}, {
    Name: 'Joseph',
    Age: 22,
    Position: 'Marketing manager',
    Status: 'active',
    Date: '24.08.2013'
  }, {Name: 'Monica', Age: 43, Position: 'President', Status: 'active', Date: '11.12.2014'}, {
    Name: 'Arnold',
    Age: 12,
    Position: 'CEO',
    Status: 'active',
    Date: '07.10.2013'
  }, {Name: 'Mark', Age: 54, Position: 'Analyst', Status: 'deactive', Date: '03.03.2014'}, {
    Name: 'Amelia',
    Age: 33,
    Position: 'Sales manager',
    Status: 'deactive',
    Date: '26.09.2013'
  }, {Name: 'Jesica', Age: 41, Position: 'Ruby programmer', Status: 'active', Date: '22.12.2013'}, {
    Name: 'John',
    Age: 48,
    Position: 'Marketing manager',
    Status: 'deactive',
    Date: '09.10.2014'
  }, {Name: 'Berg', Age: 19, Position: 'UI/UX Designer', Status: 'active', Date: '12.11.2013'}];

  $scope.ngOptions = {data: 'ngData'};
  $scope.ngOptions2 = {
    data: 'ngData', showGroupPanel: true, jqueryUIDraggable: true
  };
}

/**
 *
 * Pass all functions into module
 */
angular.module('adminPanel').controller('MainCtrl', MainCtrl).controller('ngCollectionListCtrl', ngCollectionListCtrl)

