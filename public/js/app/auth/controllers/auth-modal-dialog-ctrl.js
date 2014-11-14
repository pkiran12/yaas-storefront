/**
 * [y] hybris Platform
 *
 * Copyright (c) 2000-2014 hybris AG
 * All rights reserved.
 *
 * This software is the confidential and proprietary information of hybris
 * ("Confidential Information"). You shall not disclose such Confidential
 * Information and shall use it only in accordance with the terms of the
 * license agreement you entered into with hybris.
 */
'use strict';

angular.module('ds.auth')
/**
 * Controller for handling authentication related modal dialogs (signUp/signIn).
 */
    .controller('AuthModalDialogCtrl', ['$rootScope', '$scope', '$controller', '$q', 'AuthSvc', 'SessionSvc',
       'settings', 'AuthDialogManager', 'GlobalData', 'loginOpts', '$window',
        function ($rootScope, $scope, $controller, $q, AuthSvc, SessionSvc,
                  settings, AuthDialogManager, GlobalData, loginOpts, $window) {

            $scope.user = {
                signup: {},
                signin: {
                    email: '',
                    password: ''
                }
            };

            $scope.errors = {
                signup: [],
                signin: []
            };

            $scope.clearErrors = function(){
                $scope.errors.signin = [];
                $scope.errors.signup = [];
            };
            
            function onFbLogin(fbToken){
                AuthSvc.socialLogin('facebook', fbToken).then(function () {
                    /* jshint ignore:start */
                    FB.api('/me', function(response) {
                       SessionSvc.afterSocialLogin({email: response.email, firstName: response.first_name, lastName: response.last_name });
                    });
                    /* jshint ignore:end */
                }, function () {
                    $scope.errors.signin.push('LOGIN_FAILED');
                });
            }

            try {
                if(settings.facebookAppId){
                    // load Facebook SDK
                    $window.fbAsyncInit = function () {
                        FB.init({
                            appId: settings.facebookAppId,
                            xfbml: false,
                            version: 'v2.2'
                        });

                        // Catch "login" events as the user logs in through the FB login dialog which is shown by the FB SDK
                        FB.Event.subscribe('auth.statusChange', function (response) {
                            if (response.status === 'connected') {
                                onFbLogin(response.authResponse.accessToken);
                            }
                        });
                        FB.XFBML.parse();
                    };
                    (function (d, s, id) {
                        var js, fjs = d.getElementsByTagName(s)[0];
                        var fbElement = d.getElementById(id);
                        if (fbElement) {

                            return;
                        }
                        js = d.createElement(s);
                        js.id = id;
                        js.src = '//connect.facebook.net/en_US/sdk.js';
                        fjs.parentNode.insertBefore(js, fjs);

                    }(document, 'script', 'facebook-jssdk'));
                }
            } catch (e){
                console.error('Unable to initialize Facebook API');
                console.error(e);
            }


            var extractServerSideErrors = function (response) {
                var errors = [];
                if (response.status === 400 && response.data.details && response.data.details[0].field && response.data.details[0].field === 'password') {
                    errors.push({message: 'PASSWORD_INVALID'});
                } else if (response.status === 401 || response.status === 404) {
                    errors.push({ message: 'INVALID_CREDENTIALS' });
                } else if (response.status === 409) {
                    errors.push({ message: 'ACCOUNT_ALREADY_EXISTS' });
                } else if (response.status === 403) {
                    errors.push({ message: 'ACCOUNT_LOCKED' });
                } else if (response.data && response.data.details && response.data.details.message) {
                    errors.push(response.data.details.message);
                } else if (response.data && response.data.message) {
                    errors.push({ message: response.data.message });
                } else {
                    errors.push({message: response.status});
                }

                return errors;
            };

            /** Shows dialog that allows the user to create a new account.*/
            $scope.signup = function (authModel, signUpForm) {
                var deferred = $q.defer();

                if (signUpForm.$valid) {
                    AuthSvc.signup(authModel, loginOpts).then(
                        function (response) {
                            $scope.errors.signup = [];
                            settings.hybrisUser = $scope.user.signup.email;
                            deferred.resolve(response);
                        }, function (response) {
                            $scope.errors.signup = extractServerSideErrors(response);
                            deferred.reject({ message: 'Signup form is invalid!', errors: $scope.errors.signup });
                        }
                    );
                } else {
                    deferred.reject({ message: 'Signup form is invalid!'});
                }
                return deferred.promise;
            };

            /** Shows dialog that allows the user to sign in so account specific information can be accessed. */
            $scope.signin = function (authModel, signinForm) {
                var deferred = $q.defer();
                if (signinForm.$valid) {
                    AuthSvc.signin(authModel).then(function () {
                        $scope.errors.signin = [];
                        settings.hybrisUser = $scope.user.signin.email;
                        deferred.resolve({});
                    }, function (response) {
                        $scope.errors.signin = extractServerSideErrors(response);
                        deferred.reject(response);
                    });
                } else {
                    deferred.reject({ message: 'Signin form is invalid!'});
                }
                return deferred.promise;
            };

            /** Closes the dialog. */
            $scope.continueAsGuest = function () {

            };

            /** Closes the dialog.*/
            $scope.closeDialog = function(){

            };

            /** Shows the "request password reset" dialog.*/
            $scope.showResetPassword = function () {
                AuthDialogManager.showResetPassword();
            };



            /** Prompts the Facebook SKD to re-parse the <fb:login-button> tag in the
             * sign-up HTML and display the button.  Otherwise, the button is only shown at FB SDK load time
             * and not for subsequent displays.
             */
            $scope.fbParse = function(){
                if(typeof FB !== 'undefined'){
                    FB.getLoginStatus(function(response) {
                        if (response.status === 'connected') {
                            $scope.fbLoggedIn = true;
                        } else {
                            $scope.fbLoggedIn = false;
                        }
                    });
                    FB.XFBML.parse();

                }
            };

            /** Calls the Facebook API to validate that the user is logged into FB - if yes,
             * the existing FB token will be used to log the user into the store.  Note that this
             * function should only be called if the user is already logged into Facebook - if we
             * invoke the FB.login API through code rather than the integrated FB button,
             * the login dialog will be a pop-up rather than an iframe.
             */
            $scope.fbLogin = function(){

                FB.getLoginStatus(function(response) {
                    if (response.status === 'connected') {
                        $scope.fbLoggedIn = true;
                        onFbLogin(response.authResponse.accessToken);
                    } else {
                        // fallback logic only
                        $scope.fbLoggedIn = false;
                        FB.login();
                    }
                });

            };

        }]);