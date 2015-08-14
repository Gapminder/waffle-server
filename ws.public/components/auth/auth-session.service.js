angular.module('admin.auth').service('Session', function(USER_ROLES) {
  var user = null;
  var userRole = null;

  return {
    create: create,
    destroy: destroy
  };

  function create (user) {
    user = user;
    userRole = user.userRole
  }

  function destroy () {
    user = null;
    userRole = null;
  }
});
