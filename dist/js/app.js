/*!
 * angular-seed
 * 
 * 
 * @author 
 * @version 0.0.0
 * Copyright 2016. MIT licensed.
 */
// Declare app level module which depends on views, and components
angular.module('myApp', [
  'ngRoute',
  'ui.bootstrap'
])
// configure our routes
    .config( ['$locationProvider', '$routeProvider', function($locationProvider, $routeProvider){
        'use strict';
    $locationProvider.hashPrefix('!');
    $routeProvider

    // route for the home page
        .when('/', {
            templateUrl : 'views/home.html',
            controller  : 'mainController'
        })

        // route for the about page
        .when('/services', {
            templateUrl : 'views/services.html',
            controller  : 'servicesController'
        })

        // route for the contact page
        .when('/products', {
            templateUrl : 'views/products.html',
            controller  : 'productsController'
        });
}]);

// create the controller and inject Angular's $scope
myApp.controller('mainController', function($scope) {
    // create a message to display in our view
    $scope.message = 'Everyone come and see how good I look!';
});

myApp.controller('servicesController', function($scope) {
    $scope.message = 'Look! I am an about page.';
});

myApp.controller('productsController', function($scope) {
    $scope.message = 'Contact us! JK. This is just a demo.';
});


