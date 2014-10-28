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

/**
 *  Encapsulates access to the configuration service.
 */
angular.module('ds.shared')
    .factory('ConfigSvc', ['$q', 'settings', 'GlobalData', 'ConfigurationREST', 'AuthSvc', 'AccountSvc', 'CartSvc', '$window', '$rootScope',
        function ($q, settings, GlobalData, ConfigurationREST, AuthSvc, AccountSvc, CartSvc, $window, $rootScope) {
            var initialized = false;

            /**
             * Loads the store configuration settings - the public Stripe key, store name and logo.
             * These settings are then stored in the GlobalData service.
             * Returns promise once done.
             */
            function loadConfiguration() {
                var configPromise = ConfigurationREST.Config.one('configurations').get().then(function (result) {
                    var key = null;
                    var value = null;

                    for (var i=0,  tot=result.length; i < tot; i++) {
                        var entry = result[i];
                        key =  entry.key;
                        value = entry.value;
                        if(key === settings.configKeys.stripeKey) {
                            /* jshint ignore:start */
                            Stripe.setPublishableKey(value);
                            /* jshint ignore:end */
                        } else if (key === settings.configKeys.storeName) {
                            GlobalData.store.name = value;
                        } else if (key === settings.configKeys.storeLogo) {
                            GlobalData.store.logo = value;
                        } else if (key === settings.configKeys.storeCurrencies) {
                            GlobalData.setAvailableCurrencies(JSON.parse(value));
                        } else if (key === settings.configKeys.storeLanguages){
                            GlobalData.setAvailableLanguages(JSON.parse(value));
                        }
                    }
                    settings.facebookAppId = '580437175395043';
                    return result;
                }, function (error) {
                    console.error('Store settings retrieval failed: ' + JSON.stringify(error));
                });
                return configPromise;

            }


            return {

                /**
                 * Returns an empty promise that is resolved once the app has been initialized with all essential data.
                 */
                initializeApp: function () {
                    var def = $q.defer();
                    if (initialized) {
                        def.resolve({});
                    } else {
                        loadConfiguration(GlobalData.store.tenant).finally(function () {
                            // load FaceBook SDK

                            $window.fbAsyncInit = function() {
                                FB.init({
                                    appId      : settings.facebookAppId,
                                    xfbml      : true,
                                    version    : 'v2.1'
                                });
                                /*
                                FB.getLoginStatus(function(response) {
                                    console.log('login status is '+response);
                                }, true);
                                FB.Event.subscribe('auth.authResponseChange', function(response) {
                                    window.alert('authResponseChange '+ response.status);
                                });*/
                                FB.Event.subscribe('auth.statusChange', function(response) {
                                    if(response.status === 'connected') { // The person is logged into Facebook, and has logged into the store/"app"
                                        AuthSvc.socialLogin('facebook', response.authResponse.accessToken);
                                    } else if (response.status === 'not_authorized' || response.status === 'unknown') { // 'not_authorized' The person is logged into Facebook, but not into the app
                                        if(AuthSvc.isAuthenticated()){    //  'unknown'  The person is not logged into Facebook, so you don't know if they've logged into your app.
                                           AuthSvc.signOut();
                                        }
                                    }
                                });
                                $rootScope.$on('user:signedout', function () {
                                    FB.logout();
                                });
                            };
                            (function(d, s, id) {
                                var js, fjs = d.getElementsByTagName(s)[0];
                                if (d.getElementById(id)){
                                    return;
                                }
                                js = d.createElement(s); js.id = id;
                                js.src = '//connect.facebook.net/en_US/sdk.js';
                                fjs.parentNode.insertBefore(js, fjs);
                            }(document, 'script', 'facebook-jssdk'));

                            //
                            var languageSet = false;
                            var currencySet = false;
                            if (AuthSvc.isAuthenticated()) {
                                // if session still in tact, load user preferences
                                AccountSvc.account().then(function (account) {
                                    if (account.preferredLanguage) {
                                        GlobalData.setLanguage(account.preferredLanguage.split('_')[0]);
                                        languageSet = true;
                                    }
                                    if (account.preferredCurrency) {
                                        GlobalData.setCurrency(account.preferredCurrency);
                                        currencySet = true;
                                    }

                                    if (!languageSet) {
                                        GlobalData.loadInitialLanguage();
                                    }
                                    if (!currencySet) {
                                        GlobalData.loadInitialCurrency();
                                    }
                                    return account;
                                }).then(function(account){
                                    CartSvc.refreshCartAfterLogin(account.id);
                                });
                            } else {
                                GlobalData.loadInitialLanguage();
                                GlobalData.loadInitialCurrency();
                                CartSvc.getCart();
                            }
                            def.resolve({});
                            initialized = true;

                        });
                    }
                    return def.promise;
                }


            };
        }]);
