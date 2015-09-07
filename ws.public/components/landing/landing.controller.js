module.exports = function (app) {
  app.controller('LandingController', [
    function MainController() {
      this.tagline = 'Waffle Server';
    }
  ]);
};
