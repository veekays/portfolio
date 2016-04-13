'use strict';


// defining 
window.app = window.app === undefined ? {} : window.app;

// setting up commonly used vars
app.vent = $({});
app.$document = $(document);
app.$window = $(window);
app.$body = $('body');
app.pagename = $('#panel').data('page-name');
//app.currentLocation = {full_address: '', country: '', lat: '', lng: ''};
//app.searchedLocation = {full_address: '', country: '', lat: '', lng: ''};


/*setting location 
*/
/*  var geocoder;
  
  var options = {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0
  };

  function success(pos) {
    var crd = pos.coords;
    var lat = crd.latitude;
    var lng = crd.longitude;
    codeLatLng(lat, lng);
    app.currentLocation.lat = lat;
    app.currentLocation.lng = lng;

  };

  function error(err) {
  };

  navigator.geolocation.getCurrentPosition(success, error, options);

  function initialize() {
     geocoder = new google.maps.Geocoder();
   }

  function codeLatLng(lat, lng) {

    var latlng = new google.maps.LatLng(lat, lng);
    geocoder.geocode({'latLng': latlng}, function(results, status) {
      if (status == google.maps.GeocoderStatus.OK) {
        if (results[1]) {
         //find country name
          for (var i=0; i<results[0].address_components.length; i++) {
            for (var b=0;b<results[0].address_components[i].types.length;b++) {

             //there are different types that might hold a city admin_area_lvl_1 usually does in come cases looking for sublocality type will be more appropriate
              if (results[0].address_components[i].types[b] == "political") {
                 //this is the object you are looking for
                city= results[0].address_components[i];
                break;
              }
            }
          }
         //city data
          app.currentLocation.country = city.long_name;
          app.currentLocation.full_address = results[1].formatted_address; 

        } else {
          console.log('no results for location');
        }
      } else {
        console.log("Geocoder failed due to: " + status);
      }
    });
  }

   initialize();

*/




// ovverriding navigator for cross browser stuff
navigator.getUserMedia = navigator.getUserMedia ||
                        navigator.webkitGetUserMedia ||
                        navigator.mozGetUserMedia ||
                        navigator.msGetUserMedia;

// defining BEHAVIORS - methods in browser/behaviors
app.behaviors = app.behaviors === undefined ? {} :  app.behaviors;

// defining COMPONENTS - methods in browser/components
app.components = app.components === undefined ? {} : app.components;

// defining UTILITIES - methods in browser/utils
app.utils = app.utils === undefined ? {} : app.utils;

// app in memory cache
app.cache = {};

app.requestArgs = {};
