// Declare app level module which depends on views, and components
var myApp = angular.module('myApp', [
  'ngRoute',
  'ui.bootstrap',
  'ngAnimate'
]);
// configure our routes
myApp.config( ['$routeProvider', '$locationProvider',  function($routeProvider, $locationProvider){
    $routeProvider

    // route for the home page
        .when('/', {
            templateUrl : 'views/page-home.html',
            controller  : 'mainController'
        })

        // route for the services page
        .when('/services', {
            templateUrl : 'views/page-services.html',
            controller  : 'servicesController'
        })

        // route for the products page
        .when('/products', {
            templateUrl : 'views/page-products.html',
            controller  : 'productsController'
        }).otherwise({redirectTo: '/'});

    //$locationProvider.html5Mode(true);


}]);

// create the controller and inject Angular's $scope
myApp.controller('mainController', function($scope) {
    'use strict';
    $scope.pageClass = 'page-home';
});

myApp.controller('servicesController', function($scope) {
    'use strict';
    $scope.pageClass = 'page-services';
});

myApp.controller('productsController', function($scope) {
    'use strict';
    $scope.pageClass = 'page-products';
});


