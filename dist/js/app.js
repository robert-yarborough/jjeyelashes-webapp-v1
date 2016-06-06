/*!
 * angular-seed
 * 
 * 
 * @author 
 * @version 0.0.0
 * Copyright 2016. MIT licensed.
 */
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


}]);

// create the controller and inject Angular's $scope
myApp.controller('mainController', function($scope) {
    // create a message to display in our view
    $scope.message = 'Everyone come and see how good I look!';
    $scope.pageClass = 'page-home';
});

myApp.controller('servicesController', function($scope) {
    $scope.message = 'Look! I am an about page.';
    $scope.pageClass = 'page-services';
});

myApp.controller('productsController', function($scope) {
    $scope.message = 'Contact us! JK. This is just a demo.';
    $scope.pageClass = 'page-products';
});


